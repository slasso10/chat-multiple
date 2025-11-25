const { compunet } = require("./generated/chat.js");
const chatState = require("./ChatStateManager");

const uiController = require("./ChatUIController"); 
const messageReceiver = require("./MessageReceiver");

class ClientCallbackI extends compunet.ClientCallback {
    
    updateChatSummary() {
        setTimeout(async () => {
            try {
                await messageReceiver.refreshChats();
                uiController.renderChatList();
                console.log("✅ Lista de chats actualizada después de callback");
            } catch (error) {
                console.error('Error al actualizar lista de chats:', error);
            }
        }, 50); 
    }

    async onNewMessage(msg, current) {
        const currentUserId = chatState.getCurrentUserId();

        if (msg.senderId === currentUserId) {
            console.log("🚫 Mensaje ignorado (es mi propio eco del servidor). Actualizando lista.");
            this.updateChatSummary(); 
            return;
        }

        console.log("✨ Mensaje recibido en tiempo real de:", msg.senderName);
        
        const activeChat = chatState.getActiveChat();
        let shouldDisplayMessage = false;

        if (activeChat) {
            if (msg.isGroupMessage) {
                
                shouldDisplayMessage = (msg.chatId === activeChat.id);
            } else {
               
                shouldDisplayMessage = (msg.senderId === activeChat.id && msg.chatId === currentUserId);
            }
        }
        
        if (shouldDisplayMessage) {
            chatState.addMessage(msg);
            uiController.displayNewMessage(msg);
            
            console.log(" Mensaje agregado y mostrado en el chat activo");
        } else {
            console.log(" Mensaje recibido para un chat que no está activo. Solo actualizar lista.");
        }

        this.updateChatSummary(); 
    }

    async onNewGroup(chat, current) {
        console.log(" Nuevo grupo recibido:", chat.chatName);
        chatState.addChat(chat);
        uiController.renderChatList();
        console.log(` Has sido agregado al grupo: ${chat.chatName}`);
    }
}

module.exports = ClientCallbackI;