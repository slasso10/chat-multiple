/**
 * Cliente WebSocket para comunicación en tiempo real
 * Maneja notificaciones de mensajes y señalización de llamadas
 */

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.userId = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }

    /**
     * Conecta al servidor WebSocket
     */
    connect(userId) {
        return new Promise((resolve, reject) => {
            this.userId = userId;
            
            try {
                this.ws = new WebSocket('ws://localhost:8080');
                
                this.ws.onopen = () => {
                    console.log('✅ Conectado al servidor WebSocket');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Registrar usuario
                    this.send({
                        type: 'register',
                        userId: this.userId
                    });
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ Error en WebSocket:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('🔌 Desconectado del servidor WebSocket');
                    this.isConnected = false;
                    this.attemptReconnect();
                };
                
            } catch (error) {
                console.error('❌ Error al conectar WebSocket:', error);
                reject(error);
            }
        });
    }

    /**
     * Intenta reconectar automáticamente
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                if (this.userId) {
                    this.connect(this.userId).catch(err => {
                        console.error('Error en reconexión:', err);
                    });
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Máximo de intentos de reconexión alcanzado');
        }
    }

    /**
     * Maneja mensajes entrantes del servidor
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const type = message.type;
            
            console.log('📨 Mensaje recibido:', type);
            
            // Llamar al handler registrado para este tipo de mensaje
            const handler = this.messageHandlers.get(type);
            if (handler) {
                handler(message);
            } else {
                console.warn('⚠️ No hay handler para mensaje de tipo:', type);
            }
            
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
        }
    }

    /**
     * Registra un handler para un tipo de mensaje
     */
    on(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    /**
     * Envía un mensaje al servidor
     */
    send(message) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('❌ No hay conexión WebSocket');
        }
    }

    /**
     * Cierra la conexión
     */
    disconnect() {
        if (this.ws) {
            this.reconnectAttempts = this.maxReconnectAttempts; // Evitar reconexión
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    // ===== MÉTODOS DE LLAMADAS =====

    /**
     * Inicia una llamada con otro usuario
     */
    initiateCall(toUserId, offer) {
        this.send({
            type: 'call-offer',
            from: this.userId,
            to: toUserId,
            offer: offer
        });
    }

    /**
     * Responde a una llamada
     */
    answerCall(toUserId, answer) {
        this.send({
            type: 'call-answer',
            from: this.userId,
            to: toUserId,
            answer: answer
        });
    }

    /**
     * Envía un candidato ICE
     */
    sendIceCandidate(toUserId, candidate) {
        this.send({
            type: 'ice-candidate',
            from: this.userId,
            to: toUserId,
            candidate: candidate
        });
    }

    /**
     * Finaliza una llamada
     */
    endCall(toUserId) {
        this.send({
            type: 'call-end',
            from: this.userId,
            to: toUserId
        });
    }

    /**
     * Rechaza una llamada
     */
    rejectCall(toUserId) {
        this.send({
            type: 'call-reject',
            from: this.userId,
            to: toUserId
        });
    }
}

// Exportar instancia singleton
const wsClient = new WebSocketClient();
module.exports = wsClient;