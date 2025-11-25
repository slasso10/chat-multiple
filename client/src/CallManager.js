/**
 * CallManager - Gestión de llamadas de voz/video usando WebRTC
 */

const wsClient = require('./WebSocketClient');

class CallManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentCall = null; // { userId, userName, isOutgoing }
        this.onCallStateChange = null; // Callback para cambios de estado
        
        // Configuración ICE con servidores STUN públicos
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    /**
     * Inicializa el gestor de llamadas y registra handlers de WebSocket
     */
    initialize() {
        // Registrar handlers para señalización
        wsClient.on('call-offer', (data) => this.handleCallOffer(data));
        wsClient.on('call-answer', (data) => this.handleCallAnswer(data));
        wsClient.on('ice-candidate', (data) => this.handleIceCandidate(data));
        wsClient.on('call-end', (data) => this.handleCallEnd(data));
        wsClient.on('call-reject', (data) => this.handleCallReject(data));
        wsClient.on('call-unavailable', (data) => this.handleCallUnavailable(data));
        
        console.log('✅ CallManager inicializado');
    }

    /**
     * Inicia una llamada con otro usuario
     */
    async startCall(userId, userName, audioOnly = true) {
        try {
            console.log(`📞 Iniciando llamada con ${userName}...`);
            
            // Obtener acceso a medios locales
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: !audioOnly
            });
            
            // Crear conexión peer
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            
            // Agregar tracks locales
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Manejar tracks remotos
            this.peerConnection.ontrack = (event) => {
                console.log('🎵 Stream remoto recibido');
                this.remoteStream = event.streams[0];
                this.notifyStateChange('connected');
            };
            
            // Manejar candidatos ICE
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    wsClient.sendIceCandidate(userId, JSON.stringify(event.candidate));
                }
            };
            
            // Crear oferta
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Enviar oferta al otro usuario
            wsClient.initiateCall(userId, JSON.stringify(offer));
            
            this.currentCall = {
                userId,
                userName,
                isOutgoing: true
            };
            
            this.notifyStateChange('calling');
            
            console.log('📞 Oferta de llamada enviada');
            return true;
            
        } catch (error) {
            console.error('❌ Error iniciando llamada:', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * Maneja una oferta de llamada entrante
     */
    async handleCallOffer(data) {
        try {
            console.log(`📞 Llamada entrante de ${data.from}`);
            
            const accept = confirm(`Llamada entrante de ${data.from}. ¿Aceptar?`);
            
            if (!accept) {
                wsClient.rejectCall(data.from);
                return;
            }
            
            // Obtener acceso a medios locales
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            // Crear conexión peer
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            
            // Agregar tracks locales
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Manejar tracks remotos
            this.peerConnection.ontrack = (event) => {
                console.log('🎵 Stream remoto recibido');
                this.remoteStream = event.streams[0];
                this.notifyStateChange('connected');
            };
            
            // Manejar candidatos ICE
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    wsClient.sendIceCandidate(data.from, JSON.stringify(event.candidate));
                }
            };
            
            // Establecer descripción remota
            const offer = JSON.parse(data.offer);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Crear respuesta
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Enviar respuesta
            wsClient.answerCall(data.from, JSON.stringify(answer));
            
            this.currentCall = {
                userId: data.from,
                userName: data.from,
                isOutgoing: false
            };
            
            this.notifyStateChange('connected');
            
            console.log('📞 Llamada aceptada');
            
        } catch (error) {
            console.error('❌ Error manejando oferta de llamada:', error);
            this.cleanup();
        }
    }

    /**
     * Maneja una respuesta de llamada
     */
    async handleCallAnswer(data) {
        try {
            console.log('📞 Respuesta de llamada recibida');
            
            const answer = JSON.parse(data.answer);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            
            console.log('✅ Llamada conectada');
            
        } catch (error) {
            console.error('❌ Error manejando respuesta:', error);
            this.endCall();
        }
    }

    /**
     * Maneja un candidato ICE
     */
    async handleIceCandidate(data) {
        try {
            const candidate = JSON.parse(data.candidate);
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('🧊 Candidato ICE agregado');
        } catch (error) {
            console.error('❌ Error agregando candidato ICE:', error);
        }
    }

    /**
     * Maneja el fin de una llamada
     */
    handleCallEnd(data) {
        console.log('📞 Llamada finalizada por el otro usuario');
        this.cleanup();
        this.notifyStateChange('ended');
    }

    /**
     * Maneja el rechazo de una llamada
     */
    handleCallReject(data) {
        console.log('📞 Llamada rechazada');
        this.cleanup();
        this.notifyStateChange('rejected');
        alert('Llamada rechazada por el otro usuario');
    }

    /**
     * Maneja cuando el usuario no está disponible
     */
    handleCallUnavailable(data) {
        console.log('📞 Usuario no disponible');
        this.cleanup();
        this.notifyStateChange('unavailable');
        alert('Usuario no disponible para llamadas');
    }

    /**
     * Finaliza la llamada actual
     */
    endCall() {
        if (this.currentCall) {
            wsClient.endCall(this.currentCall.userId);
            console.log('📞 Llamada finalizada');
        }
        
        this.cleanup();
        this.notifyStateChange('ended');
    }

    /**
     * Limpia recursos de la llamada
     */
    cleanup() {
        // Detener streams locales
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Cerrar conexión peer
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.remoteStream = null;
        this.currentCall = null;
    }

    /**
     * Obtiene el stream remoto para reproducción
     */
    getRemoteStream() {
        return this.remoteStream;
    }

    /**
     * Obtiene el stream local
     */
    getLocalStream() {
        return this.localStream;
    }

    /**
     * Verifica si hay una llamada activa
     */
    isInCall() {
        return this.currentCall !== null;
    }

    /**
     * Obtiene información de la llamada actual
     */
    getCurrentCall() {
        return this.currentCall;
    }

    /**
     * Notifica cambios de estado
     */
    notifyStateChange(state) {
        if (this.onCallStateChange) {
            this.onCallStateChange(state, this.currentCall);
        }
    }

    /**
     * Registra callback para cambios de estado
     */
    setStateChangeCallback(callback) {
        this.onCallStateChange = callback;
    }

    /**
     * Silencia/desilencia el micrófono
     */
    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return !audioTrack.enabled; // Retorna true si está silenciado
            }
        }
        return false;
    }
}

// Exportar instancia singleton
const callManager = new CallManager();
module.exports = callManager;