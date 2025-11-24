// Importar estilos
import './styles.css';

// Importar módulos
const iceManager = require('./IceConnectionManager');
const chatState = require('./ChatStateManager');
const messageReceiver = require('./MessageReceiver');
const uiController = require('./ChatUIController');

// ===============================
//  Inicialización principal
// ===============================
async function initializeApp() {
    try {
        uiController.initialize();
        uiController.showLoading('Conectando al servidor...');

        // 1. Conectar a ICE primero (no requiere usuario)
        await iceManager.initialize();

        uiController.hideLoading();

        // 2. Mostrar modal login
        setupLoginModal();

    } catch (err) {
        console.error("Error al inicializar:", err);
        uiController.hideLoading();
        alert("No se pudo conectar al servidor ICE.");
    }
}

// ===============================
//  Login
// ===============================
function setupLoginModal() {
    const loginModal = document.getElementById("modal-login");
    const loginInput = document.getElementById("login-name");
    const loginButton = document.getElementById("btn-login");

    loginModal.style.display = "flex";

    loginButton.onclick = async () => {
        const name = loginInput.value.trim();
        if (name === "") {
            alert("Escribe un nombre");
            return;
        }

        // ID único real
        const userId = crypto.randomUUID();

        // Guardar en estado
        chatState.setCurrentUser(userId, name);

        try {
            // Registrar en Ice
            await iceManager.registerUser(userId, name);

            // Registrar callback RPC
            await iceManager.registerCallback(userId);

            // Mostrar nombre en UI
            document.getElementById("current-user-name").innerText = name;

            loginModal.style.display = "none";

            // Cargar datos iniciales
            await loadInitialData();

        } catch (error) {
            console.error("Error en login:", error);
            alert("Error al registrar usuario en el servidor.");
        }
    };
}

// ===============================
//  Cargar chats y mensajes
// ===============================
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

// ===============================
//  Cerrar conexión al salir
// ===============================
window.addEventListener('beforeunload', async () => {
    try {
        await iceManager.shutdown();
    } catch (error) {
        console.error('Error al cerrar conexión:', error);
    }
});

// ===============================
//  Arranque DOM
// ===============================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ===============================
//  Debug
// ===============================
window.chatDebug = {
    iceManager,
    chatState,
    messageReceiver,
    uiController
};
