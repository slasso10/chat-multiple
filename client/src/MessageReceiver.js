const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');

class MessageReceiver {
    async loadChatMessages(chatId, isGroup) {
        const userId = chatState.getCurrentUserId();

        try {
            let messages;

            if (isGroup) {
                // Obtener mensajes del grupo
                messages = await iceManager.getGroupChatMessages(chatId);
            } else {
                // Obtener mensajes del chat directo
                messages = await iceManager.getDirectChatMessages(userId, chatId);
            }

            chatState.setActiveMessages(messages);
            console.log(`Mensajes cargados: ${messages.length}`);
            
            return messages;
        } catch (error) {
            console.error('Error al cargar mensajes:', error);
            throw error;
        }
    }

    async refreshChats() {
        const userId = chatState.getCurrentUserId();

        try {
            // Obtener chats directos y de grupo en paralelo
            const [directChats, groupChats] = await Promise.all([
                iceManager.getUserDirectChats(userId),
                iceManager.getUserGroupChats(userId)
            ]);

            // Combinar ambos tipos de chats
            const allChats = [...directChats, ...groupChats];
            
            chatState.setChats(allChats);
            console.log(`Chats actualizados: ${allChats.length} total`);
            
            return allChats;
        } catch (error) {
            console.error('Error al actualizar chats:', error);
            throw error;
        }
    }

    async loadAllUsers() {
        try {
            const users = await iceManager.getAllUsers();
            chatState.setAllUsers(users);
            console.log(`Usuarios cargados: ${users.length}`);
            return users;
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            throw error;
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
}

// Exportar instancia singleton
const messageReceiver = new MessageReceiver();
module.exports = messageReceiver;