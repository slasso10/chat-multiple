const { compunet } = require('./generated/chat.js');
const Ice = require('ice').Ice;
const ClientCallbackI = require("./ClientCallback");

class IceConnectionManager {
    constructor() {
        this.communicator = null;
        this.chatServicePrx = null;
        this.groupServicePrx = null;
        this.isConnected = false;
        this.callbackAdapter = null;
    }

    async initialize() {
        try {
            console.log('Inicializando conexión Ice...');
            
            // Inicializar comunicador con propiedades para callbacks
            const initData = new Ice.InitializationData();
            initData.properties = Ice.createProperties();
            
            this.communicator = Ice.initialize(initData);
            
            // Crear proxies para los servicios principales
            const chatBase = this.communicator.stringToProxy("chat:ws -h localhost -p 10000");
            this.chatServicePrx = await compunet.ChatServicePrx.checkedCast(chatBase);

            const groupBase = this.communicator.stringToProxy("group:ws -h localhost -p 10000");
            this.groupServicePrx = await compunet.GroupServicePrx.checkedCast(groupBase);

            if (!this.chatServicePrx || !this.groupServicePrx) {
                throw new Error("No se pudieron crear los proxies de los servicios");
            }

            this.isConnected = true;
            console.log('Conexión Ice establecida correctamente');

            return true;

        } catch (error) {
            console.error('Error al inicializar Ice:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async shutdown() {
        if (this.communicator) {
            try {
                await this.communicator.destroy();
                this.isConnected = false;
                console.log('Conexión Ice cerrada');
            } catch (error) {
                console.error('Error al cerrar la conexión Ice:', error);
            }
        }
    }

    // === Métodos de ChatService ===

    async registerUser(userId, userName) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            await this.chatServicePrx.registerUser(userId, userName);
            console.log(`Usuario registrado: ${userId}`);
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            throw error;
        }
    }

    async getUser(userId) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            return await this.chatServicePrx.getUser(userId);
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            throw error;
        }
    }

    async getAllUsers() {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            return await this.chatServicePrx.getAllUsers();
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            throw error;
        }
    }

    async sendDirectMessage(fromUserId, toUserId, content) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            await this.chatServicePrx.sendDirectMessage(fromUserId, toUserId, content);
            console.log(`Mensaje enviado de ${fromUserId} a ${toUserId}`);
        } catch (error) {
            console.error('Error al enviar mensaje directo:', error);
            throw error;
        }
    }

    async getDirectChatMessages(userId, otherUserId) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            return await this.chatServicePrx.getDirectChatMessages(userId, otherUserId);
        } catch (error) {
            console.error('Error al obtener mensajes directos:', error);
            throw error;
        }
    }

    async loginAndSetup(userId, userName) {
        // 1. Registrar el usuario en el servidor (ChatService)
        await this.registerUser(userId, userName); 
        
        // 2. Registrar el callback local en el servidor
        await this.registerCallback(userId); 
        
        console.log(` Login completo: ${userName}`);
    }

    // === Métodos de GroupService ===

    async createGroup(ownerId, groupName, memberIds) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            const groupId = await this.groupServicePrx.createGroup(ownerId, groupName, memberIds);
            console.log(`Grupo creado: ${groupId}`);
            return groupId;
        } catch (error) {
            console.error('Error al crear grupo:', error);
            throw error;
        }
    }

    async addMembersToGroup(groupId, memberIds) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            await this.groupServicePrx.addMembersToGroup(groupId, memberIds);
            console.log(`Miembros agregados al grupo ${groupId}`);
        } catch (error) {
            console.error('Error al agregar miembros al grupo:', error);
            throw error;
        }
    }

    async getGroupMembers(groupId) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            return await this.groupServicePrx.getGroupMembers(groupId);
        } catch (error) {
            console.error('Error al obtener miembros del grupo:', error);
            throw error;
        }
    }

    async sendGroupMessage(fromUserId, groupId, content) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            await this.groupServicePrx.sendGroupMessage(fromUserId, groupId, content);
            console.log(`Mensaje enviado al grupo ${groupId}`);
        } catch (error) {
            console.error('Error al enviar mensaje al grupo:', error);
            throw error;
        }
    }

    async sendDirectAudio(fromUserId, toUserId, audioData, duration) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            // Llama al proxy con la firma exacta del Slice
            await this.chatServicePrx.sendDirectAudio(fromUserId, toUserId, audioData, duration);
            console.log(`Audio enviado de ${fromUserId} a ${toUserId}`);
        } catch (error) {
            console.error('Error al enviar audio directo:', error);
            throw error;
        }
    }

    async sendGroupAudio(fromUserId, groupId, audioData, duration) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            // Llama al proxy con la firma exacta del Slice
            await this.groupServicePrx.sendGroupAudio(fromUserId, groupId, audioData, duration);
            console.log(`Audio enviado al grupo ${groupId}`);
        } catch (error) {
            console.error('Error al enviar audio al grupo:', error);
            throw error;
        }
    }

    async getGroupChatMessages(groupId) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            return await this.groupServicePrx.getGroupChatMessages(groupId);
        } catch (error) {
            console.error('Error al obtener mensajes del grupo:', error);
            throw error;
        }
    }

    async getUserDirectChats(userId) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            // Llama al proxy del servicio de Chat
            return await this.chatServicePrx.getUserDirectChats(userId);
        } catch (error) {
            console.error('Error al obtener chats directos:', error);
            throw error;
        }
    }

    async getUserGroupChats(userId) {
        if (!this.isConnected) throw new Error('No hay conexión con el servidor');
        try {
            return await this.groupServicePrx.getUserGroupChats(userId);
        } catch (error) {
            console.error('Error al obtener grupos del usuario:', error);
            throw error;
        }
    }

    // === Registro de Callbacks ===

    async registerCallback(userId) {
        try {
            console.log("Registrando callback para:", userId);

            // Crear adapter local para callbacks
            this.callbackAdapter = await this.communicator.createObjectAdapter("");
            
            // Activar adapter
            await this.callbackAdapter.activate();

            // Crear el servant del callback
            const servant = new ClientCallbackI();

            // Crear identidad única para este cliente
            const identity = new Ice.Identity("callback_" + userId, "");

            // Registrar servant en el adapter
            const proxy = this.callbackAdapter.add(servant, identity);

            // Registrar en el servidor
            await this.chatServicePrx.registerCallback(proxy, userId);

            console.log("Callback registrado con éxito para:", userId);

        } catch (err) {
            console.error("Error registrando callback:", err);
            throw err;
        }
    }

    async unregisterCallback(userId) {
        try {
            await this.chatServicePrx.unregisterCallback(userId);
            console.log("Callback eliminado para:", userId);
        } catch (err) {
            console.error("Error eliminando callback:", err);
        }
    }
}

// Exportar una instancia singleton
const iceManager = new IceConnectionManager();
module.exports = iceManager;