const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');

class MessageSender {
    async sendMessage(content) {
        const activeChat = chatState.getActiveChat();
        
        if (!activeChat) {
            throw new Error('No hay un chat activo');
        }

        if (!content || content.trim() === '') {
            throw new Error('El mensaje no puede estar vacío');
        }

        const userId = chatState.getCurrentUserId();

        try {
            if (activeChat.isGroup) {
                // Enviar mensaje a grupo
                await iceManager.sendGroupMessage(userId, activeChat.id, content.trim());
            } else {
                // Enviar mensaje directo
                await iceManager.sendDirectMessage(userId, activeChat.id, content.trim());
            }

            console.log(`Mensaje enviado exitosamente a ${activeChat.name}`);
            return true;
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            throw error;
        }
    }

    async sendDirectMessage(toUserId, content) {
        if (!content || content.trim() === '') {
            throw new Error('El mensaje no puede estar vacío');
        }

        const fromUserId = chatState.getCurrentUserId();

        try {
            await iceManager.sendDirectMessage(fromUserId, toUserId, content.trim());
            console.log(`Mensaje directo enviado a ${toUserId}`);
            return true;
        } catch (error) {
            console.error('Error al enviar mensaje directo:', error);
            throw error;
        }
    }

    async sendGroupMessage(groupId, content) {
        if (!content || content.trim() === '') {
            throw new Error('El mensaje no puede estar vacío');
        }

        const fromUserId = chatState.getCurrentUserId();

        try {
            await iceManager.sendGroupMessage(fromUserId, groupId, content.trim());
            console.log(`Mensaje enviado al grupo ${groupId}`);
            return true;
        } catch (error) {
            console.error('Error al enviar mensaje al grupo:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
const messageSender = new MessageSender();
module.exports = messageSender;