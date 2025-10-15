package com.chat.server;

import com.google.gson.Gson;
import com.chat.common.Message;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Server {
    private static final int PORT = 12345;
    // Mapa para guardar los manejadores de clientes conectados (thread-safe)
    private static final ConcurrentHashMap<String, ClientHandler> clients = new ConcurrentHashMap<>();
    // Mapa para gestionar los grupos de chat (thread-safe)
    private static final ConcurrentHashMap<String, Set<String>> groups = new ConcurrentHashMap<>();
    private static final ExecutorService pool = Executors.newCachedThreadPool();
    private static final Gson gson = new Gson();

    public static void main(String[] args) {
        System.out.println("Servidor de chat iniciado en el puerto " + PORT);

        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            while (true) {
                // Acepta una nueva conexión de cliente
                Socket clientSocket = serverSocket.accept();
                System.out.println("Nuevo cliente conectado: " + clientSocket.getInetAddress());

                // Crea y ejecuta un nuevo manejador para este cliente en un hilo separado
                ClientHandler clientHandler = new ClientHandler(clientSocket);
                pool.execute(clientHandler);
            }
        } catch (IOException e) {
            System.err.println("Error en el servidor: " + e.getMessage());
        }
    }

    // Métodos para ser usados por los ClientHandlers

    public static void addClient(String username, ClientHandler handler) {
        clients.put(username, handler);
        System.out.println("Usuario '" + username + "' se ha unido.");
    }

    public static void removeClient(String username) {
        clients.remove(username);
        // También removerlo de todos los grupos
        groups.values().forEach(members -> members.remove(username));
        System.out.println("Usuario '" + username + "' se ha desconectado.");
    }

    public static void createGroup(String groupName, String creator) {
        groups.computeIfAbsent(groupName, k -> ConcurrentHashMap.newKeySet()).add(creator);
        System.out.println("Grupo '" + groupName + "' creado por '" + creator + "'.");
    }

    public static void joinGroup(String groupName, String username) {
        Set<String> members = groups.get(groupName);
        if (members != null) {
            members.add(username);
            System.out.println("Usuario '" + username + "' se unió al grupo '" + groupName + "'.");
        }
    }

    public static boolean isGroup(String groupName) {
        return groups.containsKey(groupName);
    }

    public static void broadcastMessage(Message message) {
        String jsonMessage = gson.toJson(message);

        switch (message.getType()) {
            case TEXT_DIRECT:
            case VOICE_NOTE:
                ClientHandler recipientHandler = clients.get(message.getRecipient());
                if (recipientHandler != null) {
                    recipientHandler.sendMessage(jsonMessage);
                } else {
                    System.out.println("Destinatario '" + message.getRecipient() + "' no encontrado.");
                }
                break;
            case TEXT_GROUP:
                Set<String> members = groups.get(message.getRecipient());
                if (members != null) {
                    for (String member : members) {
                        // Evitar enviar el mensaje al propio remitente
                        if (!member.equals(message.getSender())) {
                            ClientHandler memberHandler = clients.get(member);
                            if (memberHandler != null) {
                                memberHandler.sendMessage(jsonMessage);
                            }
                        }
                    }
                }
                break;
            // La lógica para llamadas (CALL_REQUEST) sería más compleja, involucrando UDP.
            // Por simplicidad, este ejemplo se enfoca en TCP.
        }
    }
}