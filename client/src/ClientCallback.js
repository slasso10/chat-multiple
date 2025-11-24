const { compunet } = require("./generated/chat.js");
const chatState = require("./ChatStateManager");

class ClientCallbackI extends compunet.ClientCallback {
    
    async onNewMessage(msg, current) {
        console.log("✨ Mensaje recibido en tiempo real:", {
            de: msg.senderName,
            contenido: msg.content,
            esGrupo: msg.isGroupMessage,
            esAudio: msg.isAudio
        });

        const activeChat = chatState.getActiveChat();
        const currentUserId = chatState.getCurrentUserId();
        
        // Determinar si este mensaje pertenece al chat activo
        const isRelatedToActiveChat = activeChat && (
            (msg.isGroupMessage && msg.chatId === activeChat.id) ||
            (!msg.isGroupMessage && (
                (msg.senderId === currentUserId && msg.chatId === activeChat.id) ||
                (msg.senderId === activeChat.id && msg.chatId === currentUserId) ||
                (msg.senderId === activeChat.id)
            ))
        );
        
        if (isRelatedToActiveChat) {
            // Agregar el mensaje al estado
            chatState.addMessage(msg);
            
            // Mostrar el mensaje inmediatamente en la UI
            const uiController = require("./ChatUIController");
            uiController.displayNewMessage(msg);
            
            console.log("✅ Mensaje agregado al chat activo");
        } else {
            console.log("📬 Mensaje recibido para otro chat");
        }

        // SIEMPRE actualizar la lista de chats (sin bloquear)
        setTimeout(async () => {
            try {
                const messageReceiver = require("./MessageReceiver");
                await messageReceiver.refreshChats();
                
                const uiController = require("./ChatUIController");
                uiController.renderChatList();
                
                console.log("✅ Lista de chats actualizada");
            } catch (error) {
                console.error('Error al actualizar lista de chats:', error);
            }
        }, 50);
    }

    async onNewGroup(chat, current) {
        console.log("✨ Nuevo grupo recibido:", chat.chatName);

        // Agregar al estado
        chatState.addChat(chat);

        // Actualizar la UI
        const uiController = require("./ChatUIController");
        uiController.renderChatList();
        
        console.log(`📢 Has sido agregado al grupo: ${chat.chatName}`);
    }
}

module.exports = ClientCallbackI;