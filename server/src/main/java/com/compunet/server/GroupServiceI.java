package com.compunet.server;

import compunet.*;
import com.zeroc.Ice.Current;
import java.util.List;

public class GroupServiceI implements GroupService {
    private final ChatCore chatCore;

    public GroupServiceI(ChatCore chatCore) {
        this.chatCore = chatCore;
    }

    @Override
    public String createGroup(String ownerId, String groupName, String[] memberIds, Current current) {
        try {
            return chatCore.createGroup(ownerId, groupName, memberIds);
        } catch (Exception e) {
            System.err.println("Error al crear grupo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public void addMembersToGroup(String groupId, String[] memberIds, Current current) {
        try {
            chatCore.addMembersToGroup(groupId, memberIds);
        } catch (Exception e) {
            System.err.println("Error al agregar miembros al grupo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public String[] getGroupMembers(String groupId, Current current) {
        try {
            return chatCore.getGroupMembers(groupId);
        } catch (Exception e) {
            System.err.println("Error al obtener miembros del grupo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public void sendGroupMessage(String fromUserId, String groupId, String content, Current current) {
        try {
            chatCore.sendGroupMessage(fromUserId, groupId, content);
        } catch (Exception e) {
            System.err.println("Error al enviar mensaje al grupo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public void sendGroupAudio(String fromUserId, String groupId, String audioData, int duration, Current current) {
        try {
            chatCore.sendGroupAudio(fromUserId, groupId, audioData, duration);
        } catch (Exception e) {
            System.err.println("Error al enviar audio de grupo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public Message[] getGroupChatMessages(String groupId, Current current) {
        try {
            List<Message> messages = chatCore.getGroupChatMessages(groupId);
            return messages.toArray(new Message[0]);
        } catch (Exception e) {
            System.err.println("Error al obtener mensajes del grupo: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public ChatSummary[] getUserGroupChats(String userId, Current current) {
        try {
            List<ChatSummary> chats = chatCore.getUserGroupChats(userId);
            return chats.toArray(new ChatSummary[0]);
        } catch (Exception e) {
            System.err.println("Error al obtener grupos del usuario: " + e.getMessage());
            throw e;
        }
    }
}