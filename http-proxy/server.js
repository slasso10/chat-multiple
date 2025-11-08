import express from 'express';
import net from 'net';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../web-client')));


const userSockets = new Map();
const messageHistory = {}; 

function addMessage(chatId, sender, text) {
  if (!messageHistory[chatId]) messageHistory[chatId] = [];
  messageHistory[chatId].push({ sender, text, time: new Date().toISOString() });
}

function sendToBackend(username, messageObj, res) {
  const socket = userSockets.get(username);
  if (!socket) {
    res.status(400).json({ success: false, error: 'Usuario no conectado al backend' });
    return;
  }

  socket.write(JSON.stringify(messageObj) + '\n');
  res.json({ success: true });
}

app.post('/api/connect', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: 'Falta username' });

  if (userSockets.has(username)) {
    return res.json({ success: true, message: 'Ya conectado' });
  }

  const socket = new net.Socket();

  socket.connect(12345, '127.0.0.1', () => {
    console.log(` [${username}] Conectado al backend Java`);

    const connectMsg = {
      type: 'CONNECT',
      sender: username,
      recipient: 'server',
      content: Buffer.from('connect').toString('base64'),
    };
    socket.write(JSON.stringify(connectMsg) + '\n');

    userSockets.set(username, socket);
    res.json({ success: true, message: 'Usuario conectado correctamente' });
  });

  socket.on('data', (data) => {
    console.log(` [${username}] Respuesta del backend: ${data.toString().trim()}`);
  });

  socket.on('close', () => {
    console.log(` [${username}] Desconectado del backend`);
    userSockets.delete(username);
  });

  socket.on('error', (err) => {
    console.error(` [${username}] Error TCP:`, err.message);
  });
});

app.post('/api/groups', (req, res) => {
  const { username, groupName } = req.body;
  if (!username || !groupName)
    return res.status(400).json({ success: false, error: 'Faltan parámetros' });

  const msg = {
    type: 'CREATE_GROUP',
    sender: username,
    recipient: groupName,
    content: '',
  };
  sendToBackend(username, msg, res);
});


app.post('/api/groups/join', (req, res) => {
  const { username, groupName } = req.body;
  if (!username || !groupName)
    return res.status(400).json({ success: false, error: 'Faltan parámetros' });

  const msg = {
    type: 'JOIN_GROUP',
    sender: username,
    recipient: groupName,
    content: '',
  };
  sendToBackend(username, msg, res);
});


app.get('/api/groups', (req, res) => {
  const username = req.query.username || Array.from(userSockets.keys())[0];
  if (!username) return res.status(400).json({ success: false, error: 'No hay usuarios conectados' });

  const socket = userSockets.get(username);
  if (!socket) return res.status(400).json({ success: false, error: 'Usuario no conectado' });

  const msg = { type: 'LIST_GROUPS', sender: username, recipient: 'server', content: '' };
  console.log(` [${username}] Solicitando lista de grupos...`);

  let buffer = '';
  const listener = (data) => {
    buffer += data.toString();
    if (buffer.includes('\n')) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.type === 'GROUP_LIST') {
          console.log(` [${username}] Grupos recibidos:`, parsed.groups);
          res.json({ groups: parsed.groups.map((g) => g.name) });
        } else res.json({ groups: [] });
      } catch {
        res.json({ groups: [] });
      }
      socket.removeListener('data', listener);
    }
  };

  socket.on('data', listener);
  socket.write(JSON.stringify(msg) + '\n');
});


app.post('/api/messages/direct', (req, res) => {
  const { from, to, message } = req.body;
  const msg = {
    type: 'TEXT_DIRECT',
    sender: from,
    recipient: to,
    content: Buffer.from(message).toString('base64'),
  };
  addMessage(`${from}-${to}`, from, message);
  sendToBackend(from, msg, res);
});


app.post('/api/messages/group', (req, res) => {
  const { from, group, message } = req.body;
  const msg = {
    type: 'TEXT_GROUP',
    sender: from,
    recipient: group,
    content: Buffer.from(message).toString('base64'),
  };
  addMessage(group, from, message);
  sendToBackend(from, msg, res);
});


app.get('/api/history', (req, res) => {
  const { type, name, user1, user2 } = req.query;

  let filePath;
  if (type === 'group') {
    filePath = path.join(__dirname, '../backend-java/chat_history', `group_${name}.log`);
  } else if (type === 'direct' && user1 && user2) {
    const [a, b] = [user1, user2].sort();
    filePath = path.join(__dirname, '../backend-java/chat_history', `direct_${a}_${b}.log`);
  } else {
    return res.status(400).json({ success: false, error: 'Parámetros inválidos' });
  }

  if (!fs.existsSync(filePath)) {
    return res.json({ success: true, messages: [] });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content
    .trim()
    .split('\n')
    .filter(l => l)
    .map(line => {
      
      const match = line.match(/\[(.*?)\]\s(.*?):\s(.*)/);
      return match ? { time: match[1], sender: match[2], text: match[3] } : { text: line };
    });

  res.json({ success: true, messages: lines });
});


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', usersConnected: Array.from(userSockets.keys()) });
});

app.listen(3000, () => {
  console.log('Proxy HTTP corriendo en http://localhost:3000');
});
