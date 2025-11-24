// Importar estilos
import './styles.css';

// Importar módulos
const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');
const messageReceiver = require('./MessageReceiver');
const uiController = require('./ChatUIController');

// Función principal de inicialización
async function initializeApp() {
    try {
        
        // Inicializar UI primero
        uiController.initialize();

        // Ahora sí puedes mostrar loading
        uiController.showLoading('Conectando al servidor...');
        
        // Conectar al servidor Ice
        await iceManager.initialize();
        
        console.log('Aplicación inicializada correctamente');
        
        // Cargar datos iniciales
        await loadInitialData();
        
        // Ocultar loading
        uiController.hideLoading();
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        uiController.hideLoading();
        
        // Mostrar error al usuario
        alert('No se pudo conectar al servidor. Por favor, asegúrate de que el servidor está ejecutándose en localhost:10000');
    }
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
    uiController
};