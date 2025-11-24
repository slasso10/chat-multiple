package com.compunet.server;

import compunet.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

public class ChatCore {
    // Almacenamiento en memoria
    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Group> groups = new ConcurrentHashMap<>();
    private final Map<String, List<Message>> directMessages = new ConcurrentHashMap<>();
    private final Map<String, List<Message>> groupMessages = new ConcurrentHashMap<>();

    private final Map<String, ClientCallbackPrx> activeClients = new ConcurrentHashMap<>();

    private final AtomicLong messageIdCounter = new AtomicLong(0);
    private final AtomicLong groupIdCounter = new AtomicLong(0);

    // Clase interna para representar un grupo
    private static class Group {
        String id;
        String name;
        String ownerId;
        Set<String> memberIds;

        Group(String id, String name, String ownerId, Set<String> memberIds) {
            this.id = id;
            this.name = name;
            this.ownerId = ownerId;
            this.memberIds = memberIds;
        }
    }

    public void registerClientCallback(String userId, ClientCallbackPrx clientPrx) {
        activeClients.put(userId, clientPrx);
        System.out.println(" Cliente registrado para callbacks: " + userId);
    }

    public void unregisterClientCallback(String userId) {
        activeClients.remove(userId);
        System.out.println(" Cliente desregistrado para callbacks: " + userId);
    }

    private void notifyClient(String userId, Message message) {
        ClientCallbackPrx clientPrx = activeClients.get(userId);
        if (clientPrx != null) {
            try {
                // Llama al método del callback definido en Slice
                clientPrx.onNewMessage(message);
                System.out.println("Notificación enviada a " + userId + " sobre mensaje " + message.id);
            } catch (com.zeroc.Ice.CommunicatorDestroyedException e) {
                // Comunicación perdida (posiblemente el cliente cerró o falló)
                System.err.println("Error de comunicación con el cliente " + userId + ". Desregistrando.");
                activeClients.remove(userId);
            } catch (Exception e) {
                System.err.println("Error al notificar al cliente " + userId + ": " + e.getMessage());
            }
        }
    }

    // === Gestión de usuarios ===

    public void registerUser(String userId, String userName) {
        User user = new User(userId, userName);
        users.put(userId, user); // Si el ID existe, se sobreescribe con el nuevo nombre.
        System.out.println("Usuario registrado/actualizado: " + userId + " (" + userName + ")");
    }

    public User getUser(String userId) {
        return users.get(userId);
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    // === Mensajes directos ===

    public void sendDirectMessage(String fromUserId, String toUserId, String content) {
        User sender = users.get(fromUserId);
        if (sender == null) {
            throw new RuntimeException("Usuario emisor no encontrado: " + fromUserId);
        }

        User receiver = users.get(toUserId);
        if (receiver == null) {
            throw new RuntimeException("Usuario receptor no encontrado: " + toUserId);
        }

        String chatKey = getChatKey(fromUserId, toUserId);
        Message message = new Message(
                String.valueOf(messageIdCounter.incrementAndGet()),
                fromUserId,
                sender.name,
                content,
                System.currentTimeMillis(),
                toUserId,
                false,
                false,
                "",
                0);

        directMessages.computeIfAbsent(chatKey, k -> new ArrayList<>()).add(message);
        System.out.println("Mensaje directo enviado de " + fromUserId + " a " + toUserId);
        notifyClient(toUserId, message);
    }

    public void sendDirectAudio(String fromUserId, String toUserId, String audioData, int duration) {
        User sender = users.get(fromUserId);
        if (sender == null) {
            throw new RuntimeException("Usuario emisor no encontrado: " + fromUserId);
        }

        String chatKey = getChatKey(fromUserId, toUserId);
        Message message = new Message(
                String.valueOf(messageIdCounter.incrementAndGet()),
                fromUserId,
                sender.name,
                "Nota de voz", // Contenido de texto resumido
                System.currentTimeMillis(),
                toUserId,
                false,
                true, // ¡Es audio!
                audioData,
                duration);

        directMessages.computeIfAbsent(chatKey, k -> new ArrayList<>()).add(message);
        System.out
                .println("Audio directo enviado de " + fromUserId + " a " + toUserId + ". Duración: " + duration + "s");

        // 💡 Notificar al receptor (igual que el texto)
        notifyClient(toUserId, message);
    }

    public List<Message> getDirectChatMessages(String userId, String otherUserId) {
        String chatKey = getChatKey(userId, otherUserId);
        return directMessages.getOrDefault(chatKey, new ArrayList<>());
    }

    public List<ChatSummary> getUserDirectChats(String userId) {
        List<ChatSummary> summaries = new ArrayList<>();

        for (Map.Entry<String, List<Message>> entry : directMessages.entrySet()) {
            String chatKey = entry.getKey();
            if (chatKey.contains(userId)) {
                List<Message> messages = entry.getValue();
                if (!messages.isEmpty()) {
                    Message lastMessage = messages.get(messages.size() - 1);
                    String otherUserId = getOtherUserId(chatKey, userId);
                    User otherUser = users.get(otherUserId);

                    if (otherUser != null) {
                        ChatSummary summary = new ChatSummary(
                                otherUserId,
                                otherUser.name,
                                lastMessage.content,
                                lastMessage.timestamp,
                                false);
                        summaries.add(summary);
                    }
                }
            }
        }

        summaries.sort((a, b) -> Long.compare(b.lastMessageTimestamp, a.lastMessageTimestamp));
        return summaries;
    }

    private String getChatKey(String userId1, String userId2) {
        // Clave consistente independiente del orden
        return userId1.compareTo(userId2) < 0
                ? userId1 + ":" + userId2
                : userId2 + ":" + userId1;
    }

    private String getOtherUserId(String chatKey, String userId) {
        String[] parts = chatKey.split(":");
        return parts[0].equals(userId) ? parts[1] : parts[0];
    }

    // === Gestión de grupos ===

    public String createGroup(String ownerId, String groupName, String[] memberIds) {
        User owner = users.get(ownerId);
        if (owner == null) {
            throw new RuntimeException("Usuario propietario no encontrado: " + ownerId);
        }

        Set<String> members = new HashSet<>(Arrays.asList(memberIds));
        members.add(ownerId); // El propietario siempre es miembro

        String groupId = "group_" + groupIdCounter.incrementAndGet();
        Group group = new Group(groupId, groupName, ownerId, members);
        groups.put(groupId, group);

        System.out.println("Grupo creado: " + groupId + " (" + groupName + ") con " + members.size() + " miembros");
        return groupId;
    }

    public void addMembersToGroup(String groupId, String[] memberIds) {
        Group group = groups.get(groupId);
        if (group == null) {
            throw new RuntimeException("Grupo no encontrado: " + groupId);
        }

        group.memberIds.addAll(Arrays.asList(memberIds));
        System.out.println("Miembros agregados al grupo " + groupId);
    }

    public String[] getGroupMembers(String groupId) {
        Group group = groups.get(groupId);
        if (group == null) {
            throw new RuntimeException("Grupo no encontrado: " + groupId);
        }

        return group.memberIds.toArray(new String[0]);
    }

    // === Mensajes de grupo ===

    public void sendGroupMessage(String fromUserId, String groupId, String content) {
        User sender = users.get(fromUserId);
        if (sender == null) {
            throw new RuntimeException("Usuario emisor no encontrado: " + fromUserId);
        }

        Group group = groups.get(groupId);
        if (group == null) {
            throw new RuntimeException("Grupo no encontrado: " + groupId);
        }

        if (!group.memberIds.contains(fromUserId)) {
            throw new RuntimeException("Usuario no es miembro del grupo: " + fromUserId);
        }

        Message message = new Message(
                String.valueOf(messageIdCounter.incrementAndGet()),
                fromUserId,
                sender.name,
                content,
                System.currentTimeMillis(),
                groupId,
                true,
                false,
                "",
                0);

        groupMessages.computeIfAbsent(groupId, k -> new ArrayList<>()).add(message);
        System.out.println("Mensaje enviado al grupo " + groupId + " por " + fromUserId);
        for (String memberId : group.memberIds) {
            if (!memberId.equals(fromUserId)) { // No te envíes la notificación a ti mismo
                notifyClient(memberId, message);
            }
        }
    }

    public void sendGroupAudio(String fromUserId, String groupId, String audioData, int duration) {
        User sender = users.get(fromUserId);
        if (sender == null) {
            throw new RuntimeException("Usuario emisor no encontrado: " + fromUserId);
        }

        Group group = groups.get(groupId);
        if (group == null) {
            throw new RuntimeException("Grupo no encontrado: " + groupId);
        }

        if (!group.memberIds.contains(fromUserId)) {
            throw new RuntimeException("Usuario no es miembro del grupo: " + fromUserId);
        }

        Message message = new Message(
                String.valueOf(messageIdCounter.incrementAndGet()),
                fromUserId,
                sender.name,
                "Nota de voz de grupo", // Contenido de texto resumido
                System.currentTimeMillis(),
                groupId,
                true,
                true, // ¡Es audio!
                audioData,
                duration);

        groupMessages.computeIfAbsent(groupId, k -> new ArrayList<>()).add(message);
        System.out
                .println("Audio enviado al grupo " + groupId + " por " + fromUserId + ". Duración: " + duration + "s");

        // 💡 Notificar a todos los miembros del grupo
        for (String memberId : group.memberIds) {
            if (!memberId.equals(fromUserId)) {
                notifyClient(memberId, message);
            }
        }
    }

    public List<Message> getGroupChatMessages(String groupId) {
        return groupMessages.getOrDefault(groupId, new ArrayList<>());
    }

    public List<ChatSummary> getUserGroupChats(String userId) {
        List<ChatSummary> summaries = new ArrayList<>();

        for (Group group : groups.values()) {
            if (group.memberIds.contains(userId)) {
                List<Message> messages = groupMessages.getOrDefault(group.id, new ArrayList<>());

                String lastMessageContent = messages.isEmpty()
                        ? "Grupo creado"
                        : messages.get(messages.size() - 1).content;
                long lastMessageTimestamp = messages.isEmpty()
                        ? System.currentTimeMillis()
                        : messages.get(messages.size() - 1).timestamp;

                ChatSummary summary = new ChatSummary(
                        group.id,
                        group.name,
                        lastMessageContent,
                        lastMessageTimestamp,
                        true);
                summaries.add(summary);
            }
        }

        summaries.sort((a, b) -> Long.compare(b.lastMessageTimestamp, a.lastMessageTimestamp));
        return summaries;
    }
}