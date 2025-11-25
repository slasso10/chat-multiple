class ChatStateManager {
    constructor() {
        this.currentUserId = 'user1'; 
        this.currentUserName = 'Alice';
        this.chats = []; 
        this.activeChat = null; 
        this.activeMessages = []; 
        this.allUsers = []; 
    }

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

    setChats(chats) {
        this.chats = chats.sort((a, b) => 
            b.lastMessageTimestamp - a.lastMessageTimestamp
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
            b.lastMessageTimestamp - a.lastMessageTimestamp
        );
    }

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
                
                this.chats.sort((a, b) => 
                    b.lastMessageTimestamp - a.lastMessageTimestamp
                );
            }
        }
    }

    setAllUsers(users) {
        this.allUsers = users;
    }

    getAllUsers() {
        return this.allUsers;
    }

    getUsersExceptCurrent() {
        return this.allUsers.filter(u => u.id !== this.currentUserId);
    }

    isChatActive(chatId) {
        return this.activeChat && this.activeChat.id === chatId;
    }

    formatTimestamp(rawTimestamp) {
        try {
            if (rawTimestamp === null || rawTimestamp === undefined) return '';

            if (rawTimestamp instanceof Date) {
                const dateObj = rawTimestamp;
                return this._formatByRules(dateObj);
            }

            let tsNumber;
            if (typeof rawTimestamp === 'object' && typeof rawTimestamp.toNumber === 'function') {
                tsNumber = rawTimestamp.toNumber();
            } else if (typeof rawTimestamp === 'bigint') {
                tsNumber = Number(rawTimestamp);
            } else if (typeof rawTimestamp === 'string' && /^\d+$/.test(rawTimestamp)) {
                tsNumber = parseInt(rawTimestamp, 10);
            } else if (typeof rawTimestamp === 'number') {
                tsNumber = rawTimestamp;
            } else {
                tsNumber = Number(rawTimestamp);
                if (Number.isNaN(tsNumber)) return '';
            }

            if (tsNumber < 1e12) {
                tsNumber = tsNumber * 1000;
            }

            if (!Number.isFinite(tsNumber) || tsNumber <= 0) return '';

            const date = new Date(tsNumber);
            if (isNaN(date.getTime())) return '';

            return this._formatByRules(date);

        } catch (err) {
            console.error('formatTimestamp error:', err);
            return '';
        }
    }

    _formatByRules(date) {
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }

        const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            return date.toLocaleDateString('es-ES', { weekday: 'short' });
        }

        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
}

const chatState = new ChatStateManager();
module.exports = chatState;