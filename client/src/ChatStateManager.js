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

    // === Gestión de chats ===

    setChats(chats) {
        // Combinar chats directos y de grupo, ordenados por timestamp
        this.chats = chats.sort((a, b) => 
            b.lastMessageTimestamp - a.lastMessageTimestamp
        );
    }

    getChats() {
        return this.chats;
    }

    addChat(chatSummary) {
        // Verificar si el chat ya existe
        const existingIndex = this.chats.findIndex(c => c.chatId === chatSummary.chatId);
        
        if (existingIndex >= 0) {
            // Actualizar el chat existente
            this.chats[existingIndex] = chatSummary;
        } else {
            // Agregar nuevo chat
            this.chats.push(chatSummary);
        }
        
        // Reordenar por timestamp
        this.chats.sort((a, b) => 
            b.lastMessageTimestamp - a.lastMessageTimestamp
        );
    }

    // === Gestión de chat activo ===

    setActiveChat(chatId, chatName, isGroup) {
        this.activeChat = {
            id: chatId,
            name: chatName,
            isGroup: isGroup
        };
        this.activeMessages = []; // Limpiar mensajes al cambiar de chat
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
        
        // Actualizar el resumen del chat en la lista
        if (this.activeChat) {
            const chatIndex = this.chats.findIndex(c => c.chatId === this.activeChat.id);
            if (chatIndex >= 0) {
                this.chats[chatIndex].lastMessageContent = message.content;
                this.chats[chatIndex].lastMessageTimestamp = message.timestamp;
                
                // Reordenar
                this.chats.sort((a, b) => 
                    b.lastMessageTimestamp - a.lastMessageTimestamp
                );
            }
        }
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

    // === Utilidades ===

    isChatActive(chatId) {
        return this.activeChat && this.activeChat.id === chatId;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        // Si es hoy, mostrar solo hora
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        // Si es de esta semana, mostrar día de la semana
        const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            return date.toLocaleDateString('es-ES', { weekday: 'short' });
        }
        
        // De lo contrario, mostrar fecha completa
        return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit' 
        });
    }
}

// Exportar instancia singleton
const chatState = new ChatStateManager();
module.exports = chatState;