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

    formatTimestamp(rawTimestamp) {
        try {
            // Manejar null/undefined rápidamente
            if (rawTimestamp === null || rawTimestamp === undefined) return '';

            // Si ya es un Date, usarlo directamente
            if (rawTimestamp instanceof Date) {
                const dateObj = rawTimestamp;
                return this._formatByRules(dateObj);
            }

            // Convertir objetos tipo Ice Long (tienen toNumber) o BigInt o strings
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
                // No reconocible: intentar convertir de forma segura
                tsNumber = Number(rawTimestamp);
                if (Number.isNaN(tsNumber)) return '';
            }

            // Corregir si vienen en segundos (p. ej. 1_700_000_000) -> convertir a ms
            // Si el número es menor que año 2001 en ms (1e12) lo tratamos como segundos
            if (tsNumber < 1e12) {
                tsNumber = tsNumber * 1000;
            }

            // Evitar fechas inválidas por overflow
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

        // Si es hoy, mostrar solo hora
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }

        // Si es de esta semana, mostrar día de la semana
        const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            return date.toLocaleDateString('es-ES', { weekday: 'short' });
        }

        // De lo contrario, mostrar fecha completa (día/mes)
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
}

// Exportar instancia singleton
const chatState = new ChatStateManager();
module.exports = chatState;