const { compunet } = require("./generated/chat.js");
const chatState = require("./ChatStateManager");

class ClientCallbackI extends compunet.ClientCallback {
    
    async onNewMessage(msg, current) {
        console.log("✨ Mensaje recibido en tiempo real:", {
            de: msg.senderName,
            contenido: msg.content,
            esGrupo: msg.isGroupMessage
        });

        // Agregar mensaje al estado si el chat está activo
        const activeChat = chatState.getActiveChat();
        
        if (activeChat) {
            // Si estamos viendo este chat, agregar el mensaje
            if ((activeChat.isGroup && msg.chatId === activeChat.id) ||
                (!activeChat.isGroup && (msg.senderId === activeChat.id || msg.chatId === activeChat.id))) {
                
                chatState.addMessage(msg);
                
                // Actualizar la UI
                const uiController = require("./ChatUIController");
                uiController.renderMessages();
            }
        }

        // Siempre actualizar la lista de chats para mostrar el último mensaje
        const messageReceiver = require("./MessageReceiver");
        const uiController = require("./ChatUIController");
        
        await messageReceiver.refreshChats();
        uiController.renderChatList();
    }

    async onNewGroup(chat, current) {
        console.log("✨ Nuevo grupo recibido:", chat.chatName);

        // Agregar al estado
        chatState.addChat(chat);

        // Actualizar la UI
        const uiController = require("./ChatUIController");
        uiController.renderChatList();
        
        // Mostrar notificación
        console.log(`📢 Has sido agregado al grupo: ${chat.chatName}`);
    }
}

module.exports = ClientCallbackI;