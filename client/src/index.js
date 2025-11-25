import './styles.css';

const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');
const messageReceiver = require('./MessageReceiver');
const uiController = require('./ChatUIController');
const messageSender = require('./MessageSender');
const wsClient = require('./WebSocketClient');
const callManager = require('./CallManager');

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
        
        uiController.elements.loginNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                uiController.elements.btnLogin.click();
            }
        });
    });
}

async function initializeApp() {
    try {
        uiController.initialize();
        uiController.showLoading('Conectando al servidor...');

        await iceManager.initialize();
        messageReceiver.setIceManager(iceManager);
        messageSender.setIceManager(iceManager);

        uiController.hideLoading(); 

        uiController.showLoginModal();
        const userId = await waitForLogin();
        uiController.hideLoginModal();

        const userName = userId;

        uiController.showLoading(`Registrando usuario: ${userName}...`);
        chatState.setCurrentUser(userId, userName);
        await iceManager.registerUser(userId, userName);

        uiController.showLoading('Conectando sistema de notificaciones...');
        await wsClient.connect(userId);
        
        setupWebSocketHandlers();
        
        callManager.initialize();
        callManager.setStateChangeCallback((state, call) => {
            uiController.updateCallState(state, call);
        });

        uiController.updateUserInfo(); 
        uiController.attachEventListeners(); 
        await loadInitialData();
        uiController.hideLoading();
        
        console.log(' Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        uiController.hideLoading();
        
        alert('No se pudo conectar al servidor. Por favor, asegúrate de que el servidor está ejecutándose.');
    }
}

function setupWebSocketHandlers() {
    wsClient.on('new-message', (data) => {
        console.log(' Nuevo mensaje recibido vía WebSocket');
        const message = data.message;
        
        const activeChat = chatState.getActiveChat();
        
        let shouldDisplay = false;
        
        if (activeChat) {
            if (message.isGroupMessage) {
                shouldDisplay = (message.chatId === activeChat.id);
            } else {
                shouldDisplay = (message.senderId === activeChat.id);
            }
        }
        
        if (shouldDisplay) {
            chatState.addMessage(message);
            uiController.displayNewMessage(message);
        }
        
        messageReceiver.refreshChats().then(() => {
            uiController.renderChatList();
        });
    });
    
    wsClient.on('new-group', (data) => {
        console.log(' Nuevo grupo recibido vía WebSocket');
        const group = data.group;
        
        chatState.addChat(group);
        uiController.renderChatList();
        
        alert(`Has sido agregado al grupo: ${group.chatName}`);
    });
    
    wsClient.on('registered', (data) => {
        console.log(' Registrado en WebSocket:', data.userId);
    });
}

async function loadInitialData() {
    try {
        console.log('Cargando datos iniciales...');
        
        await messageReceiver.refreshChats();
        
        uiController.renderChatList();
        
        console.log('Datos iniciales cargados');
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        throw error;
    }
}

window.addEventListener('beforeunload', async () => {
    try {
        if (callManager.isInCall()) {
            callManager.endCall();
        }
        
        wsClient.disconnect();
        
        await iceManager.shutdown();
    } catch (error) {
        console.error('Error al cerrar conexión:', error);
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

window.chatDebug = {
    iceManager,
    chatState,
    messageReceiver,
    uiController,
    wsClient,
    callManager
};