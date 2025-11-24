const chatState = require('./ChatStateManager');
const uiController = require('./ChatUIController');


class MessageReceiver {

    constructor(iceManagerInstance) {
        this.iceManager = null;
    }

    setIceManager(iceManagerInstance) {
        this.iceManager = iceManagerInstance;
    }

    async loadChatMessages(chatId, isGroup) {
        let messages;

        if (isGroup) {
            messages = await this.iceManager.getGroupChatMessages(chatId);
        } else {
            const otherUserId = chatId; 
            const myId = chatState.getCurrentUserId();
            messages = await this.iceManager.getDirectChatMessages(myId, otherUserId);
        }

        // Ordenar por timestamp ascendente
        messages.sort((a, b) => {
            const tA = (typeof a.timestamp === 'object' ? a.timestamp.toNumber() : a.timestamp);
            const tB = (typeof b.timestamp === 'object' ? b.timestamp.toNumber() : b.timestamp);
            return tA - tB;
        });

        chatState.setActiveMessages(messages);
    }

    


    async refreshChats() {
        if (!this.iceManager) throw new Error('IceManager no asignado');
        const userId = chatState.getCurrentUserId();
        const [directChats, groupChats] = await Promise.all([
            this.iceManager.getUserDirectChats(userId),
            this.iceManager.getUserGroupChats(userId)
        ]);

        const allChats = [...directChats, ...groupChats];
        chatState.setChats(allChats);

        console.log(`[MessageReceiver] Chats actualizados: ${allChats.length} total`);
        return allChats;
    }



    async loadAllUsers() {
        // Si la función está definida en IceConnectionManager, esto debe funcionar.
        try {
            const usersArray = await this.iceManager.getAllUsers(); // <--- Aquí ya no hay verificación
            const users = usersArray.map(u => ({ id: u.id, name: u.name }));
            chatState.setAllUsers(users);
            console.log(`[MessageReceiver] Usuarios cargados: ${users.length}`);
            return users;
        } catch (error) {
            // ...
        }
    }

    async refreshActiveChat() {
        const activeChat = chatState.getActiveChat();
        
        if (!activeChat) {
            console.log('No hay chat activo para actualizar');
            return null;
        }

        try {
            await this.loadChatMessages(activeChat.id, activeChat.isGroup);
            return chatState.getActiveMessages();
        } catch (error) {
            console.error('Error al actualizar el chat activo:', error);
            throw error;
        }
    }

    handleIncomingMessage(message) {
        chatState.addMessage(message);
        uiController.renderMessages();
        uiController.renderChatList();
    }

}

// Exportar instancia singleton

module.exports = new MessageReceiver();