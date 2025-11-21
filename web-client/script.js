const API_BASE = 'http://localhost:3000/api';

let currentUser = null;
let currentChat = null;
let isGroupChat = false;
let showingHistory = false;


const el = {
  username: document.getElementById('username'),
  userStatus: document.getElementById('userStatus'),
  currentUserDisplay: document.getElementById('currentUserDisplay'),
  activeChatDisplay: document.getElementById('activeChatDisplay'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton'),
  messagesContainer: document.getElementById('messagesContainer'),
  groupsList: document.getElementById('groupsList'),
  usersList: document.getElementById('usersList'),
  chatInfo: document.getElementById('chatInfo') || null
};

function showNotification(msg) {
  const d = document.createElement('div');
  d.className = 'notif';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2000);
}

function updateUI() {
  if (currentUser) {
    el.userStatus.textContent = 'Conectado';
    el.userStatus.className = 'status-connected';
    el.currentUserDisplay.textContent = currentUser;
    el.messageInput.disabled = false;
    el.sendButton.disabled = false;
  } else {
    el.userStatus.textContent = 'Desconectado';
    el.userStatus.className = 'status-disconnected';
    el.currentUserDisplay.textContent = 'No conectado';
    el.messageInput.disabled = true;
    el.sendButton.disabled = true;
  }
}

async function connectUser() {
  const username = el.username.value.trim();
  if (!username) return alert('Ingresa un nombre de usuario');

  const res = await fetch(`${API_BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();

  if (data.success) {
    currentUser = username;
    updateUI();
    showNotification(` ${data.message}`);
    await loadGroups();
    await loadUsers();
  } else showNotification('Error al conectar');
}

async function createGroup() {
  const name = document.getElementById('groupName').value.trim();
  if (!name) return alert('Ingresa un nombre de grupo');
  await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, groupName: name })
  });
  showNotification(`Grupo "${name}" creado`);
  await loadGroups();
}

async function joinGroup() {
  const name = document.getElementById('joinGroupName').value.trim();
  if (!name) return alert('Ingresa un nombre de grupo');
  await fetch(`${API_BASE}/groups/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, groupName: name })
  });
  showNotification(`Te uniste a ${name}`);
  await loadGroups();
}

async function loadGroups() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE}/groups?username=${encodeURIComponent(currentUser)}`);
    const data = await res.json();
    el.groupsList.innerHTML = '';
    if (!data.groups || data.groups.length === 0) {
      el.groupsList.innerHTML = '<p class="empty">No hay grupos</p>';
      return;
    }
    data.groups.forEach(g => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.textContent = g;
      div.onclick = (evt) => selectChat(g, true, evt);
      el.groupsList.appendChild(div);
    });
  } catch (err) {
    console.error('loadGroups error', err);
  }
}

async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    const users = data.usersConnected || [];
    el.usersList.innerHTML = '';
    if (!users || users.length <= 1) {
      el.usersList.innerHTML = '<p class="empty">No hay otros usuarios</p>';
      return;
    }
    users.forEach(u => {
      if (u !== currentUser) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.textContent = u;
        div.onclick = (evt) => selectChat(u, false, evt);
        el.usersList.appendChild(div);
      }
    });
  } catch (err) {
    console.error('loadUsers error', err);
  }
}


function selectChat(target, isGroup, evt) {
  currentChat = target;
  isGroupChat = isGroup;
  showingHistory = false;

  document.querySelectorAll('.list-item').forEach(e => e.classList.remove('active'));
  evt?.currentTarget?.classList.add('active');
  el.activeChatDisplay.textContent = target;


  el.messagesContainer.innerHTML = `
    <p class="system-msg">💬 Chat con <b>${target}</b></p>
    <div id="liveMsgs" class="messages-subcontainer"></div>
    <div id="historyMsgs" class="messages-subcontainer" style="display:none"></div>
  `;

  // Add controls at the end
  const controls = document.createElement('div');
  controls.className = 'chat-controls';
  controls.innerHTML = `<button id="viewHistoryBtn" class="history-btn">🕓 Ver historial</button>`;
  el.messagesContainer.appendChild(controls);

  document.getElementById('viewHistoryBtn').onclick = toggleHistoryView;

  // Start with empty live messages - no loading of old messages
  // loadLiveMessages(target); // Remove this to keep chat empty
}


async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text || !currentChat) return;

  const list = document.getElementById('liveMsgs');
  if (list) {
    const div = document.createElement('div');
    div.className = 'msg msg-out';
    div.innerHTML = `<b>${currentUser}:</b> ${text}`;
    list.appendChild(div);
    
    el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
  }

  const endpoint = isGroupChat ? '/messages/group' : '/messages/direct';
  const payload = isGroupChat
    ? { from: currentUser, group: currentChat, message: text }
    : { from: currentUser, to: currentChat, message: text };

  try {
    await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('sendMessage error', err);
    showNotification('Error al enviar mensaje');
  } finally {
    el.messageInput.value = '';
  }
}



async function loadLiveMessages(chatId) {
  // For live chat, start empty - don't load old messages
  // Only show messages sent during this session
  if (!chatId || showingHistory) return;

  const cont = document.getElementById('liveMsgs');
  if (!cont) return;
  // Keep existing messages, don't clear and reload
  // cont.innerHTML = ''; // Remove this to keep live messages
}


async function toggleHistoryView() {
  showingHistory = !showingHistory;
  const btn = document.getElementById('viewHistoryBtn');
  const live = document.getElementById('liveMsgs');
  const old = document.getElementById('historyMsgs');

  if (showingHistory) {
    btn.textContent = '💬 Volver al chat';
    await loadOldHistory();
    if (live) live.style.display = 'none';
    if (old) {
      old.style.display = 'flex';
      // Scroll to bottom after loading history
      setTimeout(() => {
        old.scrollTop = old.scrollHeight;
      }, 100);
    }
  } else {
    btn.textContent = '🕓 Ver historial';
    if (old) old.style.display = 'none';
    if (live) live.style.display = 'flex';
    // Scroll to bottom of live messages
    setTimeout(() => {
      live.scrollTop = live.scrollHeight;
    }, 100);
  }
}


async function loadOldHistory(container = null) {
  if (!currentChat) return;

  const params = isGroupChat
    ? `type=group&name=${encodeURIComponent(currentChat)}`
    : `type=direct&user1=${encodeURIComponent(currentUser)}&user2=${encodeURIComponent(currentChat)}`;

  try {
    const res = await fetch(`${API_BASE}/history?${params}`);
    const data = await res.json();
    const cont = container || document.getElementById('historyMsgs');
    if (!cont) return;
    cont.innerHTML = '';

    if (data.success && data.messages && data.messages.length > 0) {
      data.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'msg history-msg';
        if (msg.recipient && !isGroupChat) {
          div.innerHTML = `[${msg.time || ''}] <b>${msg.sender || ''} -> ${msg.recipient || ''}:</b> ${msg.text || ''}`;
        } else {
          div.innerHTML = `[${msg.time || ''}] <b>${msg.sender || ''}:</b> ${msg.text || ''}`;
        }
        cont.appendChild(div);
      });
      showNotification('📜 Mostrando historial completo');
    } else {
      cont.innerHTML = '<p class="system-msg">Sin mensajes antiguos</p>';
      showNotification('Sin mensajes antiguos');
    }
  } catch (err) {
    console.error('loadOldHistory error', err);
  }
}


setInterval(() => {
  if (currentUser && currentChat && !showingHistory) loadLiveMessages(currentChat);
  if (currentUser) {
    loadUsers();
    loadGroups();
  }
}, 4000);


el.username.addEventListener('keypress', e => e.key === 'Enter' && connectUser());
el.messageInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());


async function testConnection() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    showNotification(`Estado: ${data.status}, Usuarios: ${data.usersConnected.length}`);
  } catch (err) {
    showNotification('Error al probar conexión');
  }
}

function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  modal.style.display = 'none';
}

window.connectUser = connectUser;
window.createGroup = createGroup;
window.joinGroup = joinGroup;
window.sendMessage = sendMessage;
window.testConnection = testConnection;
window.closeHistoryModal = closeHistoryModal;
