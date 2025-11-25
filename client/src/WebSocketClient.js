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

    connect(userId) {
        return new Promise((resolve, reject) => {
            this.userId = userId;
            
            try {
                this.ws = new WebSocket('ws://localhost:8080');
                
                this.ws.onopen = () => {
                    console.log(' Conectado al servidor WebSocket');
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
                    console.error(' Error en WebSocket:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log(' Desconectado del servidor WebSocket');
                    this.isConnected = false;
                    this.attemptReconnect();
                };
                
            } catch (error) {
                console.error(' Error al conectar WebSocket:', error);
                reject(error);
            }
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(` Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                if (this.userId) {
                    this.connect(this.userId).catch(err => {
                        console.error('Error en reconexión:', err);
                    });
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error(' Máximo de intentos de reconexión alcanzado');
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const type = message.type;
            
            console.log(' Mensaje recibido:', type);
     
            const handler = this.messageHandlers.get(type);
            if (handler) {
                handler(message);
            } else {
                console.warn(' No hay handler para mensaje de tipo:', type);
            }
            
        } catch (error) {
            console.error(' Error procesando mensaje:', error);
        }
    }

    on(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    send(message) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('No hay conexión WebSocket');
        }
    }

    disconnect() {
        if (this.ws) {
            this.reconnectAttempts = this.maxReconnectAttempts; 
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    initiateCall(toUserId, offer) {
        this.send({
            type: 'call-offer',
            from: this.userId,
            to: toUserId,
            offer: offer
        });
    }

    answerCall(toUserId, answer) {
        this.send({
            type: 'call-answer',
            from: this.userId,
            to: toUserId,
            answer: answer
        });
    }

    sendIceCandidate(toUserId, candidate) {
        this.send({
            type: 'ice-candidate',
            from: this.userId,
            to: toUserId,
            candidate: candidate
        });
    }

    endCall(toUserId) {
        this.send({
            type: 'call-end',
            from: this.userId,
            to: toUserId
        });
    }

    rejectCall(toUserId) {
        this.send({
            type: 'call-reject',
            from: this.userId,
            to: toUserId
        });
    }
}

const wsClient = new WebSocketClient();
module.exports = wsClient;