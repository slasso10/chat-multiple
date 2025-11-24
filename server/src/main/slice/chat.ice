module compunet {

    // ============================
    //   Estructuras de datos
    // ============================
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
        string chatId;
        bool isGroupMessage;
    };

    struct ChatSummary {
        string chatId;
        string chatName;
        string lastMessageContent;
        long lastMessageTimestamp;
        bool isGroup;
    };

    // ============================
    //   Secuencias
    // ============================
    sequence<string> StringSeq;
    sequence<Message> MessageSeq;
    sequence<ChatSummary> ChatSummarySeq;
    sequence<User> UserSeq;

    // ============================
    //   CALLBACK del cliente
    // ============================
    interface ClientCallback {
        void onNewMessage(Message msg);
        void onNewGroup(ChatSummary chat);
    };

    // ============================
    //   Chat directo
    // ============================
    interface ChatService {
        void registerUser(string userId, string userName);
        User getUser(string userId);
        UserSeq getAllUsers();

        // Mensajes directos
        void sendDirectMessage(string fromUserId, string toUserId, string content);
        MessageSeq getDirectChatMessages(string userId, string otherUserId);
        ChatSummarySeq getUserDirectChats(string userId);

        // Registro de callbacks
        void registerCallback(ClientCallback* proxy, string userId);
        void unregisterCallback(string userId);
    };

    // ============================
    //   Grupos
    // ============================
    interface GroupService {
        string createGroup(string ownerId, string groupName, StringSeq memberIds);
        void addMembersToGroup(string groupId, StringSeq memberIds);
        StringSeq getGroupMembers(string groupId);

        void sendGroupMessage(string fromUserId, string groupId, string content);
        MessageSeq getGroupChatMessages(string groupId);
        ChatSummarySeq getUserGroupChats(string userId);
    };
};
