// Importar estilos
import './styles.css';

// Importar módulos
const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');
const messageReceiver = require('./MessageReceiver');
const uiController = require('./ChatUIController');
const messageSender = require('./MessageSender');
const wsClient = require('./WebSocketClient');
const callManager = require('./CallManager');

// Configurar dependencias
messageReceiver.setIceManager(iceManager);
uiController.setIceManager(iceManager);
messageSender.setIceManager(iceManager);

function waitForLogin() {
    return new Promise(resolve => {
        uiController.elements.btnLogin.addEventListener('click', function handler() {
            const userId = uiController.elements.loginNameInput.value.trim();
            if (userId) {
                uiController.elements.btnLogin.removeEventListener('click', handler); 
                resolve(userId);
            } else {
                alert('Por favor, ingresa tu nombre.');
                uiController.elements.loginNameInput.focus();
            }
        }); 
        
        // Permitir Enter en el campo
        uiController.elements.loginNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                uiController.elements.btnLogin.click();
            }
        });
    });
}

// Función principal de inicialización
async function initializeApp() {
    try {
        // 1. Inicializar UI y obtener elementos del DOM
        uiController.initialize();
        uiController.showLoading('Conectando al servidor...');

        // 2. Inicializar Ice (solo para RPC, no para callbacks)
        await iceManager.initialize();
        messageReceiver.setIceManager(iceManager);
        messageSender.setIceManager(iceManager);

        uiController.hideLoading(); 

        // 3. Mostrar Modal y esperar el Login
        uiController.showLoginModal();
        const userId = await waitForLogin();
        uiController.hideLoginModal();

        const userName = userId;

        // 4. Registrar usuario en el servidor Ice
        uiController.showLoading(`Registrando usuario: ${userName}...`);
        chatState.setCurrentUser(userId, userName);
        await iceManager.registerUser(userId, userName);

        // 5. 🌐 Conectar WebSocket para notificaciones en tiempo real
        uiController.showLoading('Conectando sistema de notificaciones...');
        await wsClient.connect(userId);
        
        // 6. Configurar handlers de WebSocket
        setupWebSocketHandlers();
        
        // 7. Inicializar gestor de llamadas
        callManager.initialize();
        callManager.setStateChangeCallback((state, call) => {
            uiController.updateCallState(state, call);
        });

        // 8. Habilitar la aplicación
        uiController.updateUserInfo(); 
        uiController.attachEventListeners(); 
        await loadInitialData();
        uiController.hideLoading();
        
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        uiController.hideLoading();
        
        alert('No se pudo conectar al servidor. Por favor, asegúrate de que el servidor está ejecutándose.');
    }
}

/**
 * Configura los handlers para mensajes WebSocket
 */
function setupWebSocketHandlers() {
    // Handler para nuevos mensajes
    wsClient.on('new-message', (data) => {
        console.log('📨 Nuevo mensaje recibido vía WebSocket');
        const message = data.message;
        
        const activeChat = chatState.getActiveChat();
        
        // Determinar si el mensaje es relevante para el chat activo
        let shouldDisplay = false;
        
        if (activeChat) {
            if (message.isGroupMessage) {
                // Mensaje de grupo: verificar si es del grupo activo
                shouldDisplay = (message.chatId === activeChat.id);
            } else {
                // Mensaje directo: verificar si es del chat directo activo
                shouldDisplay = (message.senderId === activeChat.id);
            }
        }
        
        if (shouldDisplay) {
            // Agregar y mostrar el mensaje
            chatState.addMessage(message);
            uiController.displayNewMessage(message);
        }
        
        // Siempre actualizar la lista de chats
        messageReceiver.refreshChats().then(() => {
            uiController.renderChatList();
        });
    });
    
    // Handler para nuevos grupos
    wsClient.on('new-group', (data) => {
        console.log('👥 Nuevo grupo recibido vía WebSocket');
        const group = data.group;
        
        chatState.addChat(group);
        uiController.renderChatList();
        
        // Notificar al usuario
        alert(`Has sido agregado al grupo: ${group.chatName}`);
    });
    
    // Handler para confirmación de registro
    wsClient.on('registered', (data) => {
        console.log('✅ Registrado en WebSocket:', data.userId);
    });
}

async function loadInitialData() {
    try {
        console.log('Cargando datos iniciales...');
        
        // Cargar chats del usuario
        await messageReceiver.refreshChats();
        
        // Renderizar lista de chats
        uiController.renderChatList();
        
        console.log('Datos iniciales cargados');
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        throw error;
    }
}

// Manejar cierre de ventana
window.addEventListener('beforeunload', async () => {
    try {
        // Finalizar llamada si hay una activa
        if (callManager.isInCall()) {
            callManager.endCall();
        }
        
        // Desconectar WebSocket
        wsClient.disconnect();
        
        // Cerrar Ice
        await iceManager.shutdown();
    } catch (error) {
        console.error('Error al cerrar conexión:', error);
    }
});

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Exportar para depuración en consola
window.chatDebug = {
    iceManager,
    chatState,
    messageReceiver,
    uiController,
    wsClient,
    callManager
};