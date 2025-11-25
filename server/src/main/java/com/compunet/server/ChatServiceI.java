package com.compunet.server;

import compunet.*;
import com.zeroc.Ice.Current;
import java.util.List;

public class ChatServiceI implements ChatService {
    private final ChatCore chatCore;

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
            chatCore.sendDirectMessage(fromUserId, toUserId, content);
        } catch (Exception e) {
            System.err.println("Error al enviar mensaje directo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public void sendDirectAudio(String fromUserId, String toUserId, String audioData, int duration, Current current) {
        try {
            chatCore.sendDirectAudio(fromUserId, toUserId, audioData, duration);
        } catch (Exception e) {
            System.err.println("Error al enviar audio directo: " + e.getMessage());
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

}