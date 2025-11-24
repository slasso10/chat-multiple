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
            String groupId = chatCore.createGroup(ownerId, groupName, memberIds);

            // Notificar a miembros del grupo (si están registrados en callbacks)
            for (String member : chatCore.getGroups().get(groupId).memberIds) {
                compunet.ClientCallbackPrx cb = ChatServiceI.callbacks.get(member);
                if (cb != null) {
                    try {
                        ChatSummary summary = new ChatSummary(
                                groupId,
                                chatCore.getGroups().get(groupId).name,
                                "Grupo creado",
                                System.currentTimeMillis(),
                                true);
                        cb.onNewGroup(summary);
                    } catch (Exception e) {
                        System.err.println("Error notificando nuevo grupo a " + member + ": " + e.getMessage());
                    }
                }
            }

            return groupId;
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
            // ChatCore ahora retorna el Message
            Message msg = chatCore.sendGroupMessage(fromUserId, groupId, content);

            // Notificar a cada miembro del grupo (si están registrados)
            for (String member : chatCore.getGroups().get(groupId).memberIds) {
                compunet.ClientCallbackPrx cb = ChatServiceI.callbacks.get(member);
                if (cb != null) {
                    try {
                        cb.onNewMessage(msg);
                    } catch (Exception e) {
                        System.err.println("Error notificando a miembro " + member + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error al enviar mensaje al grupo: " + e.getMessage());
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