const chatState = require('./ChatStateManager');
const audioManager = require('./AudioManager');

class MessageSender {

    constructor() {
        this.iceManager = null;
    }

    setIceManager(iceManagerInstance) {
        this.iceManager = iceManagerInstance;
    }

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
                await this.iceManager.sendGroupMessage(userId, activeChat.id, content.trim());
            } else {
                // Enviar mensaje directo
                await this.iceManager.sendDirectMessage(userId, activeChat.id, content.trim());
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
            await this.iceManager.sendDirectMessage(fromUserId, toUserId, content.trim());
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
            await this.iceManager.sendGroupMessage(fromUserId, groupId, content.trim());
            console.log(`Mensaje enviado al grupo ${groupId}`);
            return true;
        } catch (error) {
            console.error('Error al enviar mensaje al grupo:', error);
            throw error;
        }
    }
    
    async sendAudio(audioBlob) {
        const activeChat = chatState.getActiveChat();
        
        if (!activeChat) {
            throw new Error('No hay un chat activo');
        }

        const userId = chatState.getCurrentUserId();

        try {
            // Convertir blob a base64
            const base64Audio = await audioManager.blobToBase64(audioBlob);
            
            // Obtener duración
            const duration = await audioManager.getAudioDuration(audioBlob);

            if (activeChat.isGroup) {
                await this.iceManager.sendGroupAudio(userId, activeChat.id, base64Audio, duration);
            } else {
                await this.iceManager.sendDirectAudio(userId, activeChat.id, base64Audio, duration);
            }

            console.log(`Nota de voz enviada exitosamente (${duration}s)`);
            return true;
        } catch (error) {
            console.error('Error al enviar nota de voz:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
const messageSender = new MessageSender();
module.exports = messageSender;