package com.compunet.server;

import compunet.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class ChatCore {
    // Almacenamiento en memoria
    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Group> groups = new ConcurrentHashMap<>();
    private final Map<String, List<Message>> directMessages = new ConcurrentHashMap<>();
    private final Map<String, List<Message>> groupMessages = new ConcurrentHashMap<>();

    private final AtomicLong messageIdCounter = new AtomicLong(0);
    private final AtomicLong groupIdCounter = new AtomicLong(0);

    // Clase interna para representar un grupo
    public static class Group {
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

    // === Gestión de usuarios ===

    public void registerUser(String userId, String userName) {
        if (!users.containsKey(userId)) {
            User user = new User(userId, userName);
            users.put(userId, user);
            System.out.println("Usuario registrado: " + userId + " (" + userName + ")");
        }
    }

    public User getUser(String userId) {
        return users.get(userId);
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    // === Mensajes directos ===

    // Ahora devuelve el Message creado para que el servicio pueda notificar
    // callbacks
    public Message sendDirectMessage(String fromUserId, String toUserId, String content) {
        User sender = users.get(fromUserId);
        if (sender == null) {
            throw new RuntimeException("Usuario emisor no encontrado: " + fromUserId);
        }

        User receiver = users.get(toUserId);
        if (receiver == null) {
            throw new RuntimeException("Usuario receptor no encontrado: " + toUserId);
        }

        String chatKey = getChatKey(fromUserId, toUserId);
        long ts = System.currentTimeMillis();

        Message message = new Message(
                String.valueOf(messageIdCounter.incrementAndGet()),
                fromUserId,
                sender.name,
                content,
                ts,
                toUserId,
                false);

        directMessages.computeIfAbsent(chatKey, k -> new ArrayList<>()).add(message);
        System.out.println("Mensaje directo creado de " + fromUserId + " a " + toUserId + " (id=" + message.id + ")");
        return message;
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

    // Se mantiene createGroup (retorna groupId)
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

    // Ahora devuelve el Message creado
    public Message sendGroupMessage(String fromUserId, String groupId, String content) {
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

        long ts = System.currentTimeMillis();

        Message message = new Message(
                String.valueOf(messageIdCounter.incrementAndGet()),
                fromUserId,
                sender.name,
                content,
                ts,
                groupId,
                true);

        groupMessages.computeIfAbsent(groupId, k -> new ArrayList<>()).add(message);
        System.out.println("Mensaje creado en el grupo " + groupId + " por " + fromUserId + " (id=" + message.id + ")");
        return message;
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

    // Exponer groups si algún servicio necesita revisar miembros
    public Map<String, Group> getGroups() {
        return Collections.unmodifiableMap(groups);
    }
}
