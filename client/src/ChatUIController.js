const chatState = require('./ChatStateManager');
const messageSender = require('./MessageSender');
const messageReceiver = require('./MessageReceiver');
const iceManager = require('./IceConnectionManager');

class ChatUIController {
    constructor() {
        this.elements = {};
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
            btnRefreshChats: document.getElementById('btn-refresh-chats'),
            modalNewGroup: document.getElementById('modal-new-group'),
            modalClose: document.getElementById('modal-close'),
            btnCancelGroup: document.getElementById('btn-cancel-group'),
            btnCreateGroup: document.getElementById('btn-create-group'),
            groupNameInput: document.getElementById('group-name'),
            usersList: document.getElementById('users-list'),
            loading: document.getElementById('loading')
        };

        this.attachEventListeners();
        this.updateUserInfo();
    }

    attachEventListeners() {
        // Enviar mensaje
        this.elements.btnSendMessage.addEventListener('click', () => this.handleSendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });

        // Actualizar chats
        this.elements.btnRefreshChats.addEventListener('click', () => this.handleRefreshChats());

        // Modal de nuevo grupo
        this.elements.btnNewGroup.addEventListener('click', () => this.showNewGroupModal());
        this.elements.modalClose.addEventListener('click', () => this.hideNewGroupModal());
        this.elements.btnCancelGroup.addEventListener('click', () => this.hideNewGroupModal());
        this.elements.btnCreateGroup.addEventListener('click', () => this.handleCreateGroup());

        // Cerrar modal al hacer click fuera
        this.elements.modalNewGroup.addEventListener('click', (e) => {
            if (e.target === this.elements.modalNewGroup) {
                this.hideNewGroupModal();
            }
        });
    }

    updateUserInfo() {
        this.elements.currentUserName.textContent = chatState.getCurrentUserName();
    }

    // === Renderizado de chats ===

    renderChatList() {
        const chats = chatState.getChats();
        
        if (chats.length === 0) {
            this.elements.chatList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #667781;">
                    No tienes chats aún.<br>
                    Crea un grupo para empezar.
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
                <span class="chat-item-name">${chat.chatName}${badge}</span>
                <span class="chat-item-time">${time}</span>
            </div>
            <div class="chat-item-preview">${chat.lastMessageContent}</div>
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

    createMessageElement(message) {
        const div = document.createElement('div');
        const isSent = message.senderId === chatState.getCurrentUserId();
        div.className = `message ${isSent ? 'sent' : 'received'}`;

        const time = chatState.formatTimestamp(message.timestamp);
        const showSender = !isSent && chatState.getActiveChat().isGroup;

        div.innerHTML = `
            <div class="message-bubble">
                ${showSender ? `<div class="message-sender">${message.senderName}</div>` : ''}
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

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
            
            // Recargar mensajes del chat activo
            await messageReceiver.refreshActiveChat();
            
            // Re-renderizar mensajes
            this.renderMessages();
            
            // Actualizar lista de chats
            await this.handleRefreshChats();
            
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
                    <span>${user.name} (${user.id})</span>
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
            await iceManager.createGroup(ownerId, groupName, memberIds);
            
            this.hideNewGroupModal();
            
            // Actualizar lista de chats
            await this.handleRefreshChats();
            
            this.hideLoading();
            
            alert('Grupo creado exitosamente');
        } catch (error) {
            console.error('Error al crear grupo:', error);
            this.hideLoading();
            alert('Error al crear el grupo');
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
        this.elements.messageInput.focus();
    }

    disableMessageInput() {
        this.elements.messageInput.disabled = true;
        this.elements.btnSendMessage.disabled = true;
    }

    showLoading(message = 'Cargando...') {
        this.elements.loading.querySelector('p').textContent = message;
        this.elements.loading.classList.add('show');
    }

    hideLoading() {
        this.elements.loading.classList.remove('show');
    }
}

// Exportar instancia singleton
const uiController = new ChatUIController();
module.exports = uiController;