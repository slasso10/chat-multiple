// Importar estilos
import './styles.css';

// Importar módulos
const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');
const messageReceiver = require('./MessageReceiver');
const uiController = require('./ChatUIController');


function waitForLogin() {
    return new Promise(resolve => {
        // Usa el elemento que ya referenciamos en el UI Controller
        uiController.elements.btnLogin.addEventListener('click', function handler() {
            const userId = uiController.elements.loginNameInput.value.trim();
            if (userId) {
                // Quitar el listener después de usarlo
                uiController.elements.btnLogin.removeEventListener('click', handler); 
                resolve(userId);
            } else {
                alert('Por favor, ingresa tu nombre.');
                uiController.elements.loginNameInput.focus();
            }
        }); 
        
        // Opcional: Permitir Enter en el campo
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

        await iceManager.initialize();
        uiController.hideLoading(); 

        // 3. Mostrar Modal y esperar el Login
        uiController.showLoginModal();
        const userId = await waitForLogin(); // Espera hasta que el usuario haga clic

        // 🚨 CAMBIO CLAVE AQUÍ 🚨
        // OCULTAR EL MODAL SÓLO DESPUÉS DE OBTENER UN ID VÁLIDO
        uiController.hideLoginModal(); // <-- ¡Añadir o mover esta línea aquí! 

        // Continuar con el login real
        
        const userName = userId;

        uiController.showLoading(`Registrando usuario: ${userName}...`);
        chatState.setCurrentUser(userId, userName);
        await iceManager.loginAndSetup(userId, userName);

        // 4. Habilitar la aplicación
        uiController.updateUserInfo(); 
        uiController.attachEventListeners(); 
        await loadInitialData();
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