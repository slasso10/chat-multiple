module compunet {
    // Estructuras de datos básicas
    struct User {
        string id;
        string name;
    };

    struct Message {
        string id;
        string senderId;
        string senderName;
        string content;
        long timestamp;
        string chatId; // ID del chat (userId para directos, groupId para grupos)
        bool isGroupMessage;
    };

    struct ChatSummary {
        string chatId;
        string chatName;
        string lastMessageContent;
        long lastMessageTimestamp;
        bool isGroup;
    };

    // Secuencias
    sequence<string> StringSeq;
    sequence<Message> MessageSeq;
    sequence<ChatSummary> ChatSummarySeq;
    sequence<User> UserSeq;

    // Interfaz para gestión de mensajes directos
    interface ChatService {
        // Registro básico de usuarios
        void registerUser(string userId, string userName);
        User getUser(string userId);
        UserSeq getAllUsers();
        
        // Mensajes directos
        void sendDirectMessage(string fromUserId, string toUserId, string content);
        MessageSeq getDirectChatMessages(string userId, string otherUserId);
        ChatSummarySeq getUserDirectChats(string userId);
    };

    // Interfaz para gestión de grupos
    interface GroupService {
        // Gestión de grupos
        string createGroup(string ownerId, string groupName, StringSeq memberIds);
        void addMembersToGroup(string groupId, StringSeq memberIds);
        StringSeq getGroupMembers(string groupId);
        
        // Mensajes de grupo
        void sendGroupMessage(string fromUserId, string groupId, string content);
        MessageSeq getGroupChatMessages(string groupId);
        ChatSummarySeq getUserGroupChats(string userId);
    };
};