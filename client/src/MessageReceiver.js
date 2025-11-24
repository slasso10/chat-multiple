const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');

class MessageReceiver {
    async loadChatMessages(chatId, isGroup) {
        let messages;

        if (isGroup) {
            messages = await iceManager.getGroupChatMessages(chatId);
        } else {
            const otherUserId = chatId; 
            const myId = chatState.getCurrentUserId();
            messages = await iceManager.getDirectChatMessages(myId, otherUserId);
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
        const userId = chatState.getCurrentUserId();

        

        try {
            const [directChats, groupChats] = await Promise.all([
                iceManager.getUserDirectChats(userId),
                iceManager.getUserGroupChats(userId)
            ]);

            const allChats = [...directChats, ...groupChats];
            chatState.setChats(allChats);

            console.log(`[MessageReceiver] Chats actualizados: ${allChats.length} total`);
            return allChats;
        } catch (error) {
            console.error('Error al actualizar chats:', error);
            return [];
        }
    }



    async loadAllUsers() {
        // Si la función está definida en IceConnectionManager, esto debe funcionar.
        try {
            const usersArray = await iceManager.getAllUsers(); // <--- Aquí ya no hay verificación
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
const messageReceiver = new MessageReceiver();
module.exports = messageReceiver;