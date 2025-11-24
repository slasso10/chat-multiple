const { compunet } = require("./generated/chat.js");
const chatState = require("./ChatStateManager");
const uiController = require("./ChatUIController")
const messageReceiver = require("./MessageReceiver.js")

class ClientCallbackI extends compunet.ClientCallback {
    
    async onNewMessage(msg, current) {
        console.log(" Mensaje recibido en tiempo real:", {
            de: msg.senderName,
            contenido: msg.content,
            esGrupo: msg.isGroupMessage
        });

        chatState.addMessage(msg);

        const activeChat = chatState.getActiveChat();
        
        if (activeChat) {
            
            const isRelated = (msg.isGroupMessage && msg.chatId === activeChat.id) ||
                              (!msg.isGroupMessage && (msg.senderId === activeChat.id || msg.chatId === activeChat.id));
                              
            if (isRelated) {
                 uiController.displayNewMessage(msg); 
            }
        }

        
        uiController.renderChatList();
    }

    async onNewGroup(chat, current) {
        console.log(" Nuevo grupo recibido:", chat.chatName);

        // Agregar al estado
        chatState.addChat(chat);

        // Actualizar la UI
        const uiController = require("./ChatUIController");
        uiController.renderChatList();
        
        // Mostrar notificación
        console.log(` Has sido agregado al grupo: ${chat.chatName}`);
    }
}

module.exports = ClientCallbackI;