const { compunet } = require("./generated/chat.js");
const chatState = require("./ChatStateManager");
const ui = require("./ChatUIController");

class ClientCallbackI extends compunet.ClientCallback {
    
    async onNewMessage(msg, current) {
        console.log("Mensaje recibido en tiempo real:", msg);

        // Agregar al estado
        chatState.addMessage(msg);

        // Si el usuario está viendo el chat, actualizar la UI
        ui.renderMessages();
        ui.renderChatList();
    }

    async onNewGroup(chat, current) {
        console.log("Nuevo grupo recibido:", chat);

        chatState.addChat(chat);
        ui.renderChatList();
    }
}

module.exports = ClientCallbackI;
