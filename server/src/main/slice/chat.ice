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
        bool isAudio; // Indica si es una nota de voz
        string audioData; // Datos de audio en base64 (si isAudio=true)
        int audioDuration; // Duración en segundos (si isAudio=true)
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
        
        // Mensajes directos (texto)
        void sendDirectMessage(string fromUserId, string toUserId, string content);
        
        // Mensajes directos (audio)
        void sendDirectAudio(string fromUserId, string toUserId, string audioData, int duration);
        
        MessageSeq getDirectChatMessages(string userId, string otherUserId);
        ChatSummarySeq getUserDirectChats(string userId);
        
    };

    // Interfaz para gestión de grupos
    interface GroupService {
        // Gestión de grupos
        string createGroup(string ownerId, string groupName, StringSeq memberIds);
        void addMembersToGroup(string groupId, StringSeq memberIds);
        StringSeq getGroupMembers(string groupId);
        
        // Mensajes de grupo (texto)
        void sendGroupMessage(string fromUserId, string groupId, string content);
        
        // Mensajes de grupo (audio)
        void sendGroupAudio(string fromUserId, string groupId, string audioData, int duration);
        
        MessageSeq getGroupChatMessages(string groupId);
        ChatSummarySeq getUserGroupChats(string userId);
    };
};