package com.chat.server;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
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
import java.util.*;

public class ClientHandler implements Runnable {

    private final Socket clientSocket;
    private PrintWriter out;
    private BufferedReader in;
    private String username;
    private final Gson gson = new Gson();
    private boolean userRegistered = false;

    public ClientHandler(Socket socket) {
        this.clientSocket = socket;
    }

    @Override
    public void run() {
        try {
            out = new PrintWriter(clientSocket.getOutputStream(), true);
            in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));

            System.out.println(" Cliente conectado: " + clientSocket.getInetAddress());

            String inputLine;
            while ((inputLine = in.readLine()) != null && !clientSocket.isClosed()) {
                if (inputLine.trim().isEmpty())
                    continue;

                try {
                    System.out.println(" Mensaje recibido: " + inputLine);
                    Message message;

                    try {

                        message = gson.fromJson(inputLine, Message.class);
                    } catch (JsonSyntaxException e) {

                        JsonObject obj = gson.fromJson(inputLine, JsonObject.class);

                        String typeStr = obj.has("type") ? obj.get("type").getAsString() : "SERVER_INFO";
                        Message.MessageType type = Message.MessageType.valueOf(typeStr);

                        String sender = obj.has("sender") ? obj.get("sender").getAsString() : "unknown";
                        String recipient = obj.has("recipient") ? obj.get("recipient").getAsString() : "server";

                        byte[] contentBytes = null;
                        if (obj.has("content") && !obj.get("content").isJsonNull()) {
                            String cont = obj.get("content").getAsString();
                            try {

                                contentBytes = java.util.Base64.getDecoder().decode(cont);
                            } catch (IllegalArgumentException ex) {

                                contentBytes = cont.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                            }
                        }

                        message = new Message(type, sender, recipient,
                                contentBytes == null ? "" : new String(contentBytes));
                    }

                    if (!userRegistered) {
                        if (message.getType() == Message.MessageType.CONNECT) {
                            registerUser(message);
                        } else {
                            System.err.println(" Primer mensaje no es CONNECT: " + message.getType());
                            sendError("Debe enviar CONNECT primero");
                            break;
                        }
                    } else {
                        processMessage(message);
                    }

                } catch (Exception e) {
                    System.err.println(" Error al procesar mensaje: " + e.getMessage());
                    sendError("Mensaje JSON inválido");
                }

            }

        } catch (IOException e) {
            System.out.println("🔌 Cliente desconectado: " + (username != null ? username : ""));
        } finally {
            try {
                if (username != null) {
                    Server.removeClient(username);
                }
                if (!clientSocket.isClosed()) {
                    clientSocket.close();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private void registerUser(Message message) {
        this.username = message.getSender();
        this.userRegistered = true;
        Server.addClient(this.username, this);

        Message response = new Message(Message.MessageType.SERVER_INFO, "Server",
                this.username, "Conectado exitosamente como: " + this.username);
        sendMessage(gson.toJson(response));

        System.out.println("✅ Usuario '" + username + "' registrado correctamente");
    }

    private void processMessage(Message message) {

        saveToHistory(message);

        switch (message.getType()) {
            case CREATE_GROUP:
                Server.createGroup(message.getRecipient(), message.getSender());
                sendMessage(gson.toJson(new Message(Message.MessageType.SERVER_INFO, "Server",
                        username, "Grupo '" + message.getRecipient() + "' creado.")));
                break;

            case JOIN_GROUP:
                Server.joinGroup(message.getRecipient(), message.getSender());
                sendMessage(gson.toJson(new Message(Message.MessageType.SERVER_INFO, "Server",
                        username, "Te uniste al grupo '" + message.getRecipient() + "'.")));
                break;

            case TEXT_DIRECT:
            case TEXT_GROUP:
                Server.broadcastMessage(message);
                sendMessage(gson.toJson(new Message(Message.MessageType.SERVER_INFO, "Server",
                        username, "Mensaje enviado a " + message.getRecipient())));
                break;

            case LIST_GROUPS:
                handleListGroups();
                break;

            default:
                sendError("Tipo de mensaje no soportado: " + message.getType());
        }
    }

    private void handleListGroups() {
        try {

            Set<String> groupNames = Server.getAllGroups();

            List<Map<String, Object>> groupsList = new ArrayList<>();
            for (String groupName : groupNames) {
                Map<String, Object> groupInfo = new HashMap<>();
                groupInfo.put("name", groupName);
                groupInfo.put("members", Server.getGroupMemberCount(groupName));
                groupsList.add(groupInfo);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("type", "GROUP_LIST");
            response.put("success", true);
            response.put("groups", groupsList);

            System.out.println(" Enviando lista de grupos: " + groupsList);
            sendMessage(gson.toJson(response));

        } catch (Exception e) {
            System.err.println(" Error obteniendo grupos: " + e.getMessage());
            sendError("Error obteniendo grupos");
        }
    }

    private void saveToHistory(Message message) {
        if (message.getType() == Message.MessageType.CONNECT ||
                message.getType() == Message.MessageType.SERVER_INFO ||
                message.getType() == Message.MessageType.LIST_GROUPS) {
            return;
        }

        String logEntry;
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        if (message.getType() == Message.MessageType.VOICE_NOTE) {
            String fileName = System.currentTimeMillis() + "_" + message.getOriginalFileName();
            Path path = Paths.get("chat_history/audio/" + fileName);
            try {
                Files.createDirectories(path.getParent());
                Files.write(path, message.getContent());
                logEntry = String.format("[%s] %s envió una nota de voz: %s\n",
                        now.format(formatter), message.getSender(), fileName);
            } catch (IOException e) {
                System.err.println("Error al guardar audio: " + e.getMessage());
                return;
            }
        } else {
            logEntry = String.format("[%s] %s -> %s: %s\n",
                    now.format(formatter), message.getSender(),
                    message.getRecipient(), message.getTextContent());
        }

        String logFileName;
        if (message.getType() == Message.MessageType.TEXT_GROUP) {
            logFileName = "chat_history/group_" + message.getRecipient() + ".log";
        } else {
            String user1 = message.getSender();
            String user2 = message.getRecipient();
            logFileName = user1.compareTo(user2) < 0 ? "chat_history/direct_" + user1 + "_" + user2 + ".log"
                    : "chat_history/direct_" + user2 + "_" + user1 + ".log";
        }

        try {
            Path path = Paths.get(logFileName);
            Files.createDirectories(path.getParent());
            Files.write(path, logEntry.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException e) {
            System.err.println("No se pudo escribir en el historial: " + e.getMessage());
        }
    }

    private void sendError(String error) {
        Message errorMsg = new Message(Message.MessageType.SERVER_INFO, "Server",
                username != null ? username : "unknown", "Error: " + error);
        sendMessage(gson.toJson(errorMsg));
    }

    public void sendMessage(String message) {
        out.println(message);
        out.flush();
    }
}