const { compunet } = require("./generated/chat.js");
const chatState = require("./ChatStateManager");

// 🚨 CORRECCIÓN 1: Mover REQUIRES al inicio para evitar problemas de webpack/sincronización
const uiController = require("./ChatUIController"); 
const messageReceiver = require("./MessageReceiver");

class ClientCallbackI extends compunet.ClientCallback {
    
    // Función auxiliar para actualizar la lista de chats (SIEMPRE debe ejecutarse)
    updateChatSummary() {
        // Ejecutar la actualización de manera asíncrona para no bloquear el callback
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

        // 🚨 CORRECCIÓN 2: IGNORAR EL ECO DEL EMISOR (Si Luis envió, Ana DEBE recibir. Si Luis recibe su propio mensaje, debe ignorarlo)
        if (msg.senderId === currentUserId) {
            console.log("🚫 Mensaje ignorado (es mi propio eco del servidor). Actualizando lista.");
            this.updateChatSummary(); 
            return;
        }

        // --- LÓGICA PARA EL RECEPTOR (Ana) ---
        console.log("✨ Mensaje recibido en tiempo real de:", msg.senderName);
        
        const activeChat = chatState.getActiveChat();
        let shouldDisplayMessage = false;

        if (activeChat) {
            if (msg.isGroupMessage) {
                // Mensaje de grupo: el ID del mensaje debe ser el ID del chat activo
                shouldDisplayMessage = (msg.chatId === activeChat.id);
            } else {
                // 🚨 CORRECCIÓN 3: Lógica simple para chat directo (RECEIVING).
                // El emisor debe ser el compañero del chat activo (activeChat.id).
                // El receptor (msg.chatId) debe ser yo (currentUserId).
                shouldDisplayMessage = (msg.senderId === activeChat.id && msg.chatId === currentUserId);
            }
        }
        
        if (shouldDisplayMessage) {
            // AGREGAR Y MOSTRAR: Si el mensaje es para el chat abierto
            chatState.addMessage(msg);
            uiController.displayNewMessage(msg);
            
            console.log("✅ Mensaje agregado y mostrado en el chat activo");
        } else {
            console.log("📬 Mensaje recibido para un chat que no está activo. Solo actualizar lista.");
        }

        // ACTUALIZAR LISTA: Siempre se debe actualizar para mover el chat a la cima.
        this.updateChatSummary(); 
    }

    async onNewGroup(chat, current) {
        console.log("✨ Nuevo grupo recibido:", chat.chatName);
        chatState.addChat(chat);
        uiController.renderChatList();
        console.log(`📢 Has sido agregado al grupo: ${chat.chatName}`);
    }
}

module.exports = ClientCallbackI;