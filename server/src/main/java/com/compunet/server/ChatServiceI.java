package com.compunet.server;

import compunet.*;
import com.zeroc.Ice.Current;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class ChatServiceI implements ChatService {
    private final ChatCore chatCore;

    // Hago público y estático el mapa para que otros servicios (GroupServiceI)
    // puedan usarlo fácilmente.
    public static final Map<String, compunet.ClientCallbackPrx> callbacks = new ConcurrentHashMap<>();

    public ChatServiceI(ChatCore chatCore) {
        this.chatCore = chatCore;
    }

    @Override
    public void registerUser(String userId, String userName, Current current) {
        try {
            chatCore.registerUser(userId, userName);
        } catch (Exception e) {
            System.err.println("Error al registrar usuario: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public User getUser(String userId, Current current) {
        try {
            return chatCore.getUser(userId);
        } catch (Exception e) {
            System.err.println("Error al obtener usuario: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public User[] getAllUsers(Current current) {
        try {
            List<User> users = chatCore.getAllUsers();
            return users.toArray(new User[0]);
        } catch (Exception e) {
            System.err.println("Error al obtener usuarios: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public void sendDirectMessage(String fromUserId, String toUserId, String content, Current current) {
        try {
            // Obtener el Message creado por el core (ahora retorna Message)
            Message msg = chatCore.sendDirectMessage(fromUserId, toUserId, content);

            // Notificar al receptor (si está registrado)
            compunet.ClientCallbackPrx cbTo = callbacks.get(toUserId);
            if (cbTo != null) {
                try {
                    cbTo.onNewMessage(msg);
                } catch (Exception e) {
                    System.err.println("Error notificando a receptor: " + e.getMessage());
                }
            }

            // Notificar al remitente (opcional — útil para que su UI se actualice)
            compunet.ClientCallbackPrx cbFrom = callbacks.get(fromUserId);
            if (cbFrom != null) {
                try {
                    cbFrom.onNewMessage(msg);
                } catch (Exception e) {
                    System.err.println("Error notificando a remitente: " + e.getMessage());
                }
            }

        } catch (Exception e) {
            System.err.println("Error al enviar mensaje directo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public Message[] getDirectChatMessages(String userId, String otherUserId, Current current) {
        try {
            List<Message> messages = chatCore.getDirectChatMessages(userId, otherUserId);
            return messages.toArray(new Message[0]);
        } catch (Exception e) {
            System.err.println("Error al obtener mensajes directos: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public ChatSummary[] getUserDirectChats(String userId, Current current) {
        try {
            List<ChatSummary> chats = chatCore.getUserDirectChats(userId);
            return chats.toArray(new ChatSummary[0]);
        } catch (Exception e) {
            System.err.println("Error al obtener chats directos: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public void registerCallback(ClientCallbackPrx proxy, String userId, Current current) {
        callbacks.put(userId, proxy);
        System.out.println("Callback registrado para " + userId);
    }

    @Override
    public void unregisterCallback(String userId, Current current) {
        callbacks.remove(userId);
        System.out.println("Callback eliminado " + userId);
    }
}
