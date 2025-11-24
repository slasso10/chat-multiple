const chatState = require('./ChatStateManager');
const messageSender = require('./MessageSender');
const messageReceiver = require('./MessageReceiver');
const audioManager = require('./AudioManager')

class ChatUIController {
    constructor() {
        this.elements = {};
        this.isRecording = false;
        this.iceManager = null;
    }

    setIceManager(iceManagerInstance) {
        this.iceManager = iceManagerInstance;
    }

    initialize() {
        // Obtener referencias a elementos del DOM
        this.elements = {
            chatList: document.getElementById('chat-list'),
            messagesContainer: document.getElementById('messages-container'),
            messageInput: document.getElementById('message-input'),
            btnSendMessage: document.getElementById('btn-send-message'),
            chatName: document.getElementById('chat-name'),
            chatType: document.getElementById('chat-type'),
            currentUserName: document.getElementById('current-user-name'),
            btnNewGroup: document.getElementById('btn-new-group'),
            btnNewDirectChat: document.getElementById('btn-new-direct-chat'),
            btnRefreshChats: document.getElementById('btn-refresh-chats'),
            modalNewGroup: document.getElementById('modal-new-group'),
            modalNewDirectChat: document.getElementById('modal-new-direct-chat'),
            modalClose: document.getElementById('modal-close'),
            modalCloseDirectChat: document.getElementById('modal-close-direct-chat'),
            btnCancelGroup: document.getElementById('btn-cancel-group'),
            btnCancelDirectChat: document.getElementById('btn-cancel-direct-chat'),
            btnCreateGroup: document.getElementById('btn-create-group'),
            btnStartDirectChat: document.getElementById('btn-start-direct-chat'),
            groupNameInput: document.getElementById('group-name'),
            usersList: document.getElementById('users-list'),
            usersListDirectChat: document.getElementById('users-list-direct-chat'),
            loading: document.getElementById('loading'),
            modalLogin: document.getElementById('modal-login'),
            loginNameInput: document.getElementById('login-name'),
            btnLogin: document.getElementById('btn-login'),
            btnRecordAudio: document.getElementById('btn-record-audio')
        };

        this.updateUserInfo();
    }

    attachEventListeners() {
        // Enviar mensaje
        if (this.elements.btnSendMessage) {
            this.elements.btnSendMessage.addEventListener('click', () => this.handleSendMessage());
        }
        
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            });
        }

        // Actualizar chats
        if (this.elements.btnRefreshChats) {
            this.elements.btnRefreshChats.addEventListener('click', () => this.handleRefreshChats());
        }

        // Modal de nuevo grupo
        if (this.elements.btnNewGroup) {
            this.elements.btnNewGroup.addEventListener('click', () => this.showNewGroupModal());
        }
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => this.hideNewGroupModal());
        }
        if (this.elements.btnCancelGroup) {
            this.elements.btnCancelGroup.addEventListener('click', () => this.hideNewGroupModal());
        }
        if (this.elements.btnCreateGroup) {
            this.elements.btnCreateGroup.addEventListener('click', () => this.handleCreateGroup());
        }

        // Modal de nuevo chat directo
        if (this.elements.btnNewDirectChat) {
            this.elements.btnNewDirectChat.addEventListener('click', () => this.showNewDirectChatModal());
        }
        if (this.elements.modalCloseDirectChat) {
            this.elements.modalCloseDirectChat.addEventListener('click', () => this.hideNewDirectChatModal());
        }
        if (this.elements.btnCancelDirectChat) {
            this.elements.btnCancelDirectChat.addEventListener('click', () => this.hideNewDirectChatModal());
        }
        if (this.elements.btnStartDirectChat) {
            this.elements.btnStartDirectChat.addEventListener('click', () => this.handleStartDirectChat());
        }

        // Cerrar modales al hacer click fuera
        if (this.elements.modalNewGroup) {
            this.elements.modalNewGroup.addEventListener('click', (e) => {
                if (e.target === this.elements.modalNewGroup) {
                    this.hideNewGroupModal();
                }
            });
        }

        if (this.elements.modalNewDirectChat) {
            this.elements.modalNewDirectChat.addEventListener('click', (e) => {
                if (e.target === this.elements.modalNewDirectChat) {
                    this.hideNewDirectChatModal();
                }
            });
        }

        // Botón de grabación de audio
        if (this.elements.btnRecordAudio) {
            this.elements.btnRecordAudio.addEventListener('click', () => this.handleRecordAudio());
        }
    }

    updateUserInfo() {
        this.elements.currentUserName.textContent = chatState.getCurrentUserName();
    }

    showLoginModal() {
        this.elements.modalLogin.style.display = 'flex';
        this.elements.loginNameInput.focus();
    }

    hideLoginModal() {
        this.elements.modalLogin.style.display = 'none';
    }

    // === Renderizado de chats ===

    renderChatList() {
        const chats = chatState.getChats();
        
        if (chats.length === 0) {
            this.elements.chatList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #667781;">
                    No tienes chats aún.<br>
                    Inicia un chat directo o crea un grupo.
                </div>
            `;
            return;
        }

        this.elements.chatList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = this.createChatItemElement(chat);
            this.elements.chatList.appendChild(chatItem);
        });
    }

    createChatItemElement(chat) {
        const div = document.createElement('div');
        div.className = 'chat-item';
        
        if (chatState.isChatActive(chat.chatId)) {
            div.classList.add('active');
        }

        const time = chatState.formatTimestamp(chat.lastMessageTimestamp);
        const badge = chat.isGroup ? '<span class="chat-item-badge">Grupo</span>' : '';

        div.innerHTML = `
            <div class="chat-item-header">
                <span class="chat-item-name">${this.escapeHtml(chat.chatName)}${badge}</span>
                <span class="chat-item-time">${time}</span>
            </div>
            <div class="chat-item-preview">${this.escapeHtml(chat.lastMessageContent)}</div>
        `;

        div.addEventListener('click', () => this.handleChatClick(chat));

        return div;
    }

    async handleChatClick(chat) {
        try {
            this.showLoading('Cargando mensajes...');
            
            // Establecer chat activo
            chatState.setActiveChat(chat.chatId, chat.chatName, chat.isGroup);
            
            // Cargar mensajes
            await messageReceiver.loadChatMessages(chat.chatId, chat.isGroup);
            
            // Actualizar UI
            this.updateChatHeader();
            this.renderMessages();
            this.enableMessageInput();
            this.renderChatList(); // Re-renderizar para actualizar selección
            
            this.hideLoading();
        } catch (error) {
            console.error('Error al seleccionar chat:', error);
            this.hideLoading();
            alert('Error al cargar el chat');
        }
    }

    // === Renderizado de mensajes ===

    renderMessages() {
        const messages = chatState.getActiveMessages();
        const activeChat = chatState.getActiveChat();
        
        if (!activeChat) {
            this.showEmptyState();
            return;
        }

        if (messages.length === 0) {
            this.elements.messagesContainer.innerHTML = `
                <div class="empty-state">
                    <p>No hay mensajes en este chat</p>
                </div>
            `;
            return;
        }

        this.elements.messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.elements.messagesContainer.appendChild(messageElement);
        });

        // Scroll hacia abajo
        this.scrollToBottom();
    }

    displayNewMessage(message) {
        const activeChat = chatState.getActiveChat();
        
        if (!activeChat) return;

        // Verificar si el mensaje pertenece al chat activo
        const isRelated = (message.isGroupMessage && message.chatId === activeChat.id) ||
                          (!message.isGroupMessage && (message.senderId === activeChat.id || message.chatId === activeChat.id));

        if (!isRelated) return;
        
        // Crear y añadir el elemento DOM del mensaje
        const messageElement = this.createMessageElement(message);
        this.elements.messagesContainer.appendChild(messageElement);
        
        // Desplazar al final
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isSent = message.senderId === chatState.getCurrentUserId();
        div.className = `message ${isSent ? 'sent' : 'received'}`;

        const time = chatState.formatTimestamp(message.timestamp);
        const showSender = !isSent && chatState.getActiveChat()?.isGroup;

        let contentHTML;
        
        if (message.isAudio) {
            // Es una nota de voz
            contentHTML = `
                <div class="audio-message">
                    <button class="audio-play-btn" data-audio="${message.audioData}">▶️</button>
                    <span class="audio-duration">${message.audioDuration}s</span>
                </div>
            `;
        } else {
            // Es texto normal
            contentHTML = `<div class="message-content">${this.escapeHtml(message.content)}</div>`;
        }

        div.innerHTML = `
            <div class="message-bubble">
                ${showSender ? `<div class="message-sender">${this.escapeHtml(message.senderName)}</div>` : ''}
                ${contentHTML}
                <div class="message-time">${time}</div>
            </div>
        `;

        // Si es audio, agregar evento para reproducir
        if (message.isAudio) {
            const playBtn = div.querySelector('.audio-play-btn');
            playBtn.addEventListener('click', async () => {
                try {
                    playBtn.textContent = '⏸️';
                    await audioManager.playAudio(message.audioData);
                    playBtn.textContent = '▶️';
                } catch (error) {
                    console.error('Error al reproducir audio:', error);
                    playBtn.textContent = '▶️';
                }
            });
        }

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    showEmptyState() {
        this.elements.messagesContainer.innerHTML = `
            <div class="empty-state">
                <p>Selecciona un chat para ver los mensajes</p>
            </div>
        `;
    }

    // === Envío de mensajes ===

    async handleSendMessage() {
        const content = this.elements.messageInput.value.trim();
        
        if (!content) return;

        try {
            // Enviar mensaje
            await messageSender.sendMessage(content);
            
            // Limpiar input
            this.elements.messageInput.value = '';
            
            console.log('✅ Mensaje enviado, esperando callback del servidor...');
            
            // NO refrescamos manualmente, el callback lo hará automáticamente
            
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            alert('Error al enviar el mensaje');
        }
    }

    // === Actualización de chats ===

    async handleRefreshChats() {
        try {
            await messageReceiver.refreshChats();
            this.renderChatList();
        } catch (error) {
            console.error('Error al actualizar chats:', error);
        }
    }

    // === Modal de nuevo grupo ===

    async showNewGroupModal() {
        try {
            console.log('Botón Nuevo Grupo presionado. Intentando cargar usuarios...');
            // Cargar usuarios disponibles
            await messageReceiver.loadAllUsers();
            const users = chatState.getUsersExceptCurrent();
            
            // Renderizar lista de usuarios
            this.elements.usersList.innerHTML = '';
            users.forEach(user => {
                const label = document.createElement('label');
                label.className = 'user-checkbox';
                label.innerHTML = `
                    <input type="checkbox" value="${user.id}">
                    <span>${this.escapeHtml(user.name)} (${this.escapeHtml(user.id)})</span>
                `;
                this.elements.usersList.appendChild(label);
            });
            
            // Limpiar campo de nombre
            this.elements.groupNameInput.value = '';
            
            // Mostrar modal
            this.elements.modalNewGroup.classList.add('show');
        } catch (error) {
            console.error('Error al abrir modal de grupo:', error);
            alert('Error al cargar usuarios');
        }
    }

    hideNewGroupModal() {
        this.elements.modalNewGroup.classList.remove('show');
    }

    async handleCreateGroup() {
        const groupName = this.elements.groupNameInput.value.trim();
        
        if (!groupName) {
            alert('Debes ingresar un nombre para el grupo');
            return;
        }

        // Obtener miembros seleccionados
        const checkboxes = this.elements.usersList.querySelectorAll('input[type="checkbox"]:checked');
        const memberIds = Array.from(checkboxes).map(cb => cb.value);

        if (memberIds.length === 0) {
            alert('Debes seleccionar al menos un miembro');
            return;
        }

        try {
            this.showLoading('Creando grupo...');
            
            const ownerId = chatState.getCurrentUserId();
            await this.iceManager.createGroup(ownerId, groupName, memberIds);
            
            this.hideNewGroupModal();
            
            // Actualizar lista de chats
            await this.handleRefreshChats();
            
            this.hideLoading();
            
            console.log('✅ Grupo creado exitosamente');
        } catch (error) {
            console.error('Error al crear grupo:', error);
            this.hideLoading();
            alert('Error al crear el grupo');
        }
    }

    // === Modal de nuevo chat directo ===

    async showNewDirectChatModal() {
        if (!this.elements.usersListDirectChat || !this.elements.modalNewDirectChat) {
            console.error('Elementos del modal de chat directo no encontrados');
            alert('Error: Modal de chat directo no disponible. Verifica que el HTML tenga todos los elementos.');
            return;
        }

        try {
            console.log('Botón Nuevo Chat Directo presionado...');
            // Cargar usuarios disponibles
            await messageReceiver.loadAllUsers();
            const users = chatState.getUsersExceptCurrent();
            
            // Renderizar lista de usuarios (radio buttons para seleccionar solo uno)
            this.elements.usersListDirectChat.innerHTML = '';
            users.forEach(user => {
                const label = document.createElement('label');
                label.className = 'user-radio';
                label.innerHTML = `
                    <input type="radio" name="direct-chat-user" value="${user.id}">
                    <span>${this.escapeHtml(user.name)}</span>
                `;
                this.elements.usersListDirectChat.appendChild(label);
            });
            
            // Mostrar modal
            this.elements.modalNewDirectChat.classList.add('show');
        } catch (error) {
            console.error('Error al abrir modal de chat directo:', error);
            alert('Error al cargar usuarios');
        }
    }

    hideNewDirectChatModal() {
        if (this.elements.modalNewDirectChat) {
            this.elements.modalNewDirectChat.classList.remove('show');
        }
    }

    async handleStartDirectChat() {
        if (!this.elements.usersListDirectChat) {
            alert('Error: Lista de usuarios no disponible');
            return;
        }

        // Obtener usuario seleccionado
        const selectedRadio = this.elements.usersListDirectChat.querySelector('input[type="radio"]:checked');
        
        if (!selectedRadio) {
            alert('Debes seleccionar un usuario');
            return;
        }

        const otherUserId = selectedRadio.value;
        const otherUser = chatState.getAllUsers().find(u => u.id === otherUserId);
        
        if (!otherUser) {
            alert('Usuario no encontrado');
            return;
        }

        try {
            this.hideNewDirectChatModal();
            
            // Establecer el chat directo como activo
            chatState.setActiveChat(otherUserId, otherUser.name, false);
            
            // Cargar mensajes existentes (si los hay)
            await messageReceiver.loadChatMessages(otherUserId, false);
            
            // Actualizar UI
            this.updateChatHeader();
            this.renderMessages();
            this.enableMessageInput();
            
            // Actualizar lista de chats
            await this.handleRefreshChats();
            
            console.log(`✅ Chat directo iniciado con ${otherUser.name}`);
        } catch (error) {
            console.error('Error al iniciar chat directo:', error);
            alert('Error al iniciar el chat directo');
        }
    }

    // === UI Helpers ===

    updateChatHeader() {
        const activeChat = chatState.getActiveChat();
        
        if (!activeChat) {
            this.elements.chatName.textContent = 'Selecciona un chat';
            this.elements.chatType.textContent = '';
            return;
        }

        this.elements.chatName.textContent = activeChat.name;
        this.elements.chatType.textContent = activeChat.isGroup ? 'Grupo' : 'Directo';
    }

    enableMessageInput() {
        this.elements.messageInput.disabled = false;
        this.elements.btnSendMessage.disabled = false;
        this.elements.btnRecordAudio.disabled = false;
        this.elements.messageInput.focus();
    }

    disableMessageInput() {
        this.elements.messageInput.disabled = true;
        this.elements.btnSendMessage.disabled = true;
        this.elements.btnRecordAudio.disabled = true;
    }

    showLoading(message = 'Cargando...') {
        this.elements.loading.querySelector('p').textContent = message;
        this.elements.loading.classList.add('show');
    }

    hideLoading() {
        this.elements.loading.classList.remove('show');
    }

    async handleRecordAudio() {
        if (!this.isRecording) {
            // Iniciar grabación
            try {
                await audioManager.initialize();
                await audioManager.startRecording();
                
                this.isRecording = true;
                this.elements.btnRecordAudio.textContent = '⏹️';
                this.elements.btnRecordAudio.classList.add('recording');
                this.elements.messageInput.disabled = true;
                this.elements.btnSendMessage.disabled = true;
                
                console.log('🎙️ Grabando...');
            } catch (error) {
                console.error('Error al iniciar grabación:', error);
                alert('No se pudo acceder al micrófono. Verifica los permisos.');
            }
        } else {
            // Detener y enviar
            try {
                const audioBlob = await audioManager.stopRecording();
                
                this.isRecording = false;
                this.elements.btnRecordAudio.textContent = '🎤';
                this.elements.btnRecordAudio.classList.remove('recording');
                this.elements.messageInput.disabled = false;
                this.elements.btnSendMessage.disabled = false;
                
                // Mostrar confirmación
                if (confirm('¿Enviar nota de voz?')) {
                    this.showLoading('Enviando audio...');
                    
                    await messageSender.sendAudio(audioBlob);
                    
                    console.log('✅ Audio enviado, esperando callback...');
                    
                    this.hideLoading();
                }
                
            } catch (error) {
                console.error('Error al enviar audio:', error);
                alert('Error al enviar la nota de voz');
                this.hideLoading();
            }
        }
    }
}

// Exportar instancia singleton
const uiController = new ChatUIController();
module.exports = uiController;