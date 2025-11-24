class ChatStateManager {
    constructor() {
        this.currentUserId = 'user1'; // Usuario fijo para esta iteración
        this.currentUserName = 'Alice';
        this.chats = []; // Array de ChatSummary (directos + grupos)
        this.activeChat = null; // {id, name, isGroup}
        this.activeMessages = []; // Array de Messages del chat activo
        this.allUsers = []; // Todos los usuarios disponibles
    }

    // === Gestión de usuario actual ===

    setCurrentUser(userId, userName) {
        this.currentUserId = userId;
        this.currentUserName = userName;
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getCurrentUserName() {
        return this.currentUserName;
    }

    // === Utilidad para timestamps Ice.Long ===

    convertTimestamp(ts) {
        if (typeof ts === 'object' && ts !== null && ts.toString) {
            return Number(ts.toString());
        }
        return Number(ts);
    }

    // === Gestión de chats ===

    setChats(chats) {
        this.chats = chats.sort((a, b) =>
            this.convertTimestamp(b.lastMessageTimestamp) -
            this.convertTimestamp(a.lastMessageTimestamp)
        );
    }

    getChats() {
        return this.chats;
    }

    addChat(chatSummary) {
        const existingIndex = this.chats.findIndex(c => c.chatId === chatSummary.chatId);

        if (existingIndex >= 0) {
            this.chats[existingIndex] = chatSummary;
        } else {
            this.chats.push(chatSummary);
        }

        this.chats.sort((a, b) =>
            this.convertTimestamp(b.lastMessageTimestamp) -
            this.convertTimestamp(a.lastMessageTimestamp)
        );
    }

    // === Gestión del chat activo ===

    setActiveChat(chatId, chatName, isGroup) {
        this.activeChat = {
            id: chatId,
            name: chatName,
            isGroup: isGroup
        };
        this.activeMessages = [];
    }

    getActiveChat() {
        return this.activeChat;
    }

    clearActiveChat() {
        this.activeChat = null;
        this.activeMessages = [];
    }

    // === Gestión de mensajes ===

    setActiveMessages(messages) {
        this.activeMessages = messages;
    }

    getActiveMessages() {
        return this.activeMessages;
    }

    addMessage(message) {
        this.activeMessages.push(message);

        if (this.activeChat) {
            const chatIndex = this.chats.findIndex(c => c.chatId === this.activeChat.id);

            if (chatIndex >= 0) {
                this.chats[chatIndex].lastMessageContent = message.content;
                this.chats[chatIndex].lastMessageTimestamp = message.timestamp;
            }
        }

        this.chats.sort((a, b) =>
            this.convertTimestamp(b.lastMessageTimestamp) -
            this.convertTimestamp(a.lastMessageTimestamp)
        );
    }

    // === Gestión de usuarios ===

    setAllUsers(users) {
        this.allUsers = users;
    }

    getAllUsers() {
        return this.allUsers;
    }

    getUsersExceptCurrent() {
        return this.allUsers.filter(u => u.id !== this.currentUserId);
    }

    // === Verificar si un chat está activo ===

    isChatActive(chatId) {
        return this.activeChat && this.activeChat.id === chatId;
    }

    // === Formateo de timestamps ===

    formatTimestamp(timestamp) {
        

        const ts = this.convertTimestamp(timestamp);
        const date = new Date(ts);
        const now = new Date();

        if (isNaN(date.getTime())) {
            return "–";
        }

        // Hoy → solo hora
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Esta semana → día abreviado
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString('es-ES', { weekday: 'short' });
        }

        // Más antiguo → dd/mm
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit'
        });
    }
}

const chatState = new ChatStateManager();
module.exports = chatState;
