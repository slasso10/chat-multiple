package com.chat.server;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.chat.common.Message;

import java.io.*;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ClientHandler implements Runnable {

    private final Socket clientSocket;
    private PrintWriter out;
    private BufferedReader in;
    private String username;
    private final Gson gson = new Gson();

    public ClientHandler(Socket socket) {
        this.clientSocket = socket;
    }

    @Override
    public void run() {
        try {
            out = new PrintWriter(clientSocket.getOutputStream(), true);
            in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));

            // El primer mensaje debe ser de tipo CONNECT para registrar al usuario
            String connectionRequest = in.readLine();
            handleConnection(connectionRequest);

            String inputLine;
            while ((inputLine = in.readLine()) != null) {
                try {
                    Message message = gson.fromJson(inputLine, Message.class);
                    processMessage(message);
                } catch (JsonSyntaxException e) {
                    System.err.println("Error de formato JSON recibido: " + inputLine);
                }
            }

        } catch (IOException e) {
            System.out.println("Cliente " + (username != null ? username : "") + " desconectado.");
        } finally {
            try {
                if (username != null) {
                    Server.removeClient(username);
                }
                clientSocket.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private void handleConnection(String jsonMessage) {
        Message message = gson.fromJson(jsonMessage, Message.class);
        if (message != null && message.getType() == Message.MessageType.CONNECT) {
            this.username = message.getSender();
            Server.addClient(this.username, this);
            sendMessage(gson.toJson(new Message(Message.MessageType.SERVER_INFO, "Server", this.username, "Conectado exitosamente.")));
        } else {
            System.err.println("La primera conexión no fue de tipo CONNECT. Desconectando.");
            try {
                clientSocket.close();
            } catch (IOException e) { e.printStackTrace(); }
        }
    }

    private void processMessage(Message message) {
        // Guardar en el historial y luego retransmitir
        saveToHistory(message);

        switch (message.getType()) {
            case CREATE_GROUP:
                Server.createGroup(message.getRecipient(), message.getSender());
                sendMessage(gson.toJson(new Message(Message.MessageType.SERVER_INFO, "Server", username, "Grupo '" + message.getRecipient() + "' creado.")));
                break;
            case JOIN_GROUP:
                Server.joinGroup(message.getRecipient(), message.getSender());
                sendMessage(gson.toJson(new Message(Message.MessageType.SERVER_INFO, "Server", username, "Te uniste al grupo '" + message.getRecipient() + "'.")));
                break;
            case TEXT_DIRECT:
            case TEXT_GROUP:
            case VOICE_NOTE:
                Server.broadcastMessage(message);
                break;
            default:
                System.out.println("Tipo de mensaje desconocido: " + message.getType());
        }
    }

    private void saveToHistory(Message message) {
        // No guardamos mensajes de conexión o comandos
        if (message.getType() == Message.MessageType.CONNECT || message.getType() == Message.MessageType.SERVER_INFO) {
            return;
        }

        String logEntry;
        String logFileName;

        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        if (message.getType() == Message.MessageType.VOICE_NOTE) {
            // Guardar el archivo de audio
            String fileName = System.currentTimeMillis() + "_" + message.getOriginalFileName();
            Path path = Paths.get("chat_history/audio/" + fileName);
            try {
                Files.createDirectories(path.getParent());
                Files.write(path, message.getContent());
                logEntry = String.format("[%s] %s envió una nota de voz: %s\n", now.format(formatter), message.getSender(), fileName);
            } catch (IOException e) {
                System.err.println("Error al guardar archivo de audio: " + e.getMessage());
                return;
            }
        } else {
            logEntry = String.format("[%s] %s: %s\n", now.format(formatter), message.getSender(), message.getTextContent());
        }

        // Determinar el archivo de log
        if (message.getType() == Message.MessageType.TEXT_GROUP || (message.getType() == Message.MessageType.VOICE_NOTE && Server.isGroup(message.getRecipient()))) {
            logFileName = "chat_history/group_" + message.getRecipient() + ".log";
        } else {
            // Para chat directo, normalizamos el nombre para que sea consistente
            String user1 = message.getSender();
            String user2 = message.getRecipient();
            logFileName = user1.compareTo(user2) < 0 ?
                    "chat_history/direct_" + user1 + "_" + user2 + ".log" :
                    "chat_history/direct_" + user2 + "_" + user1 + ".log";
        }

        // Escribir en el archivo de log
        try {
            Path path = Paths.get(logFileName);
            Files.createDirectories(path.getParent());
            Files.write(path, logEntry.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException e) {
            System.err.println("No se pudo escribir en el historial: " + e.getMessage());
        }
    }

    public void sendMessage(String message) {
        out.println(message);
    }
}