const chatState = require('./ChatStateManager');

class MessageReceiver {

    constructor() {
        this.iceManager = null;
    }

    setIceManager(iceManagerInstance) {
        this.iceManager = iceManagerInstance;
        console.log(' IceManager asignado a MessageReceiver');
    }

    async loadChatMessages(chatId, isGroup) {
        if (!this.iceManager) {
            throw new Error('IceManager no está inicializado');
        }

        let messages;

        try {
            if (isGroup) {
                messages = await this.iceManager.getGroupChatMessages(chatId);
            } else {
                const otherUserId = chatId; 
                const myId = chatState.getCurrentUserId();
                messages = await this.iceManager.getDirectChatMessages(myId, otherUserId);
            }

            messages.sort((a, b) => {
                const tA = (typeof a.timestamp === 'object' && a.timestamp.toNumber) 
                    ? a.timestamp.toNumber() 
                    : a.timestamp;
                const tB = (typeof b.timestamp === 'object' && b.timestamp.toNumber) 
                    ? b.timestamp.toNumber() 
                    : b.timestamp;
                return tA - tB;
            });

            chatState.setActiveMessages(messages);
            console.log(` Mensajes cargados: ${messages.length}`);
            return messages;
        } catch (error) {
            console.error('Error al cargar mensajes:', error);
            throw error;
        }
    }

    async refreshChats() {
        if (!this.iceManager) {
            throw new Error('IceManager no está inicializado');
        }

        const userId = chatState.getCurrentUserId();

        try {
            const [directChats, groupChats] = await Promise.all([
                this.iceManager.getUserDirectChats(userId),
                this.iceManager.getUserGroupChats(userId)
            ]);

            const allChats = [...directChats, ...groupChats];
            
            chatState.setChats(allChats);
            console.log(`[MessageReceiver] Chats actualizados: ${allChats.length} total`);
            
            return allChats;
        } catch (error) {
            console.error('Error al actualizar chats:', error);
            throw error;
        }
    }

    async loadAllUsers() {
        if (!this.iceManager) {
            throw new Error('IceManager no está inicializado');
        }

        try {
            const usersArray = await this.iceManager.getAllUsers();
            
            const users = usersArray.map(u => {
                if (u.id && u.name) {
                    return { id: u.id, name: u.name };
                }
                return { 
                    id: u.id || u._id || '', 
                    name: u.name || u._name || 'Usuario' 
                };
            });
            
            chatState.setAllUsers(users);
            console.log(`[MessageReceiver] Usuarios cargados: ${users.length}`);
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

    handleIncomingMessage(message) {
        chatState.addMessage(message);
        
        try {
            const uiController = require('./ChatUIController');
            uiController.renderMessages();
            uiController.renderChatList();
        } catch (error) {
            console.error('Error al actualizar UI:', error);
        }
    }
}

const messageReceiver = new MessageReceiver();
module.exports = messageReceiver;