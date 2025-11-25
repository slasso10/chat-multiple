const wsClient = require('./WebSocketClient');

class CallManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentCall = null; 
        this.onCallStateChange = null; 
        this.pendingOffer = null; 
        this.pendingIceCandidates = []; 
        
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    initialize() {
        wsClient.on('call-offer', (data) => this.handleCallOffer(data));
        wsClient.on('call-answer', (data) => this.handleCallAnswer(data));
        wsClient.on('ice-candidate', (data) => this.handleIceCandidate(data));
        wsClient.on('call-end', (data) => this.handleCallEnd(data));
        wsClient.on('call-reject', (data) => this.handleCallReject(data));
        wsClient.on('call-unavailable', (data) => this.handleCallUnavailable(data));
        
        console.log(' CallManager inicializado');
    }

    async startCall(userId, userName, audioOnly = true) {
        try {
            console.log(` Iniciando llamada con ${userName}...`);
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: !audioOnly
            });
            
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                console.log(' Stream remoto recibido');
                this.remoteStream = event.streams[0];
                this.notifyStateChange('connected');
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    wsClient.sendIceCandidate(userId, JSON.stringify(event.candidate));
                }
            };
            
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log(' Estado de ICE:', this.peerConnection.iceConnectionState);
                
                if (this.peerConnection.iceConnectionState === 'disconnected' || 
                    this.peerConnection.iceConnectionState === 'failed') {
                    console.warn(' Conexión ICE perdida');
                    this.endCall();
                }
            };
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            wsClient.initiateCall(userId, JSON.stringify(offer));
            
            this.currentCall = {
                userId,
                userName,
                isOutgoing: true
            };
            
            this.notifyStateChange('calling');
            
            console.log(' Oferta de llamada enviada');
            return true;
            
        } catch (error) {
            console.error(' Error iniciando llamada:', error);
            this.cleanup();
            throw error;
        }
    }

    async handleCallOffer(data) {
        try {
            console.log(` Llamada entrante de ${data.from}`);
            
            this.pendingOffer = data;
            
            this.pendingIceCandidates = [];
            
            this.showIncomingCallDialog(data.from);
            
        } catch (error) {
            console.error(' Error manejando oferta de llamada:', error);
            this.cleanup();
        }
    }

    showIncomingCallDialog(callerId) {
        const chatState = require('./ChatStateManager');
        const callerUser = chatState.getAllUsers().find(u => u.id === callerId);
        const callerName = callerUser ? callerUser.name : callerId;
        
        // Crear el diálogo HTML
        const dialog = document.createElement('div');
        dialog.id = 'incoming-call-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1f6feb;
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            z-index: 10000;
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        dialog.innerHTML = `
            <div style="text-align: center;">
                <h3 style="margin: 0 0 10px 0;">📞 Llamada entrante</h3>
                <p style="margin: 0 0 20px 0; font-size: 16px;">${this.escapeHtml(callerName)}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="accept-call-btn" style="
                        background: #238636;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Aceptar</button>
                    <button id="reject-call-btn" style="
                        background: #da3633;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Rechazar</button>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(dialog);
        
        document.getElementById('accept-call-btn').addEventListener('click', () => {
            dialog.remove();
            this.acceptIncomingCall();
        });
        
        document.getElementById('reject-call-btn').addEventListener('click', () => {
            dialog.remove();
            wsClient.rejectCall(this.pendingOffer.from);
            this.pendingOffer = null;
            this.pendingIceCandidates = [];
        });
        
        setTimeout(() => {
            if (document.getElementById('incoming-call-dialog')) {
                dialog.remove();
                if (this.pendingOffer) {
                    wsClient.rejectCall(this.pendingOffer.from);
                    this.pendingOffer = null;
                    this.pendingIceCandidates = [];
                }
            }
        }, 30000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async acceptIncomingCall() {
        if (!this.pendingOffer) {
            console.error(' No hay oferta pendiente');
            return;
        }
        
        const data = this.pendingOffer;
        this.pendingOffer = null;
        
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                console.log('🎵 Stream remoto recibido');
                this.remoteStream = event.streams[0];
                this.notifyStateChange('connected');
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    wsClient.sendIceCandidate(data.from, JSON.stringify(event.candidate));
                }
            };
            
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('🔗 Estado de ICE:', this.peerConnection.iceConnectionState);
                
                if (this.peerConnection.iceConnectionState === 'disconnected' || 
                    this.peerConnection.iceConnectionState === 'failed') {
                    console.warn('⚠️ Conexión ICE perdida');
                    this.endCall();
                }
            };
            
            const offer = JSON.parse(data.offer);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            console.log(`🧊 Agregando ${this.pendingIceCandidates.length} candidatos ICE pendientes`);
            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.warn('⚠️ Error agregando candidato pendiente:', err);
                }
            }
            this.pendingIceCandidates = [];
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            wsClient.answerCall(data.from, JSON.stringify(answer));
            
            const chatState = require('./ChatStateManager');
            const callerUser = chatState.getAllUsers().find(u => u.id === data.from);
            const callerName = callerUser ? callerUser.name : data.from;
            
            this.currentCall = {
                userId: data.from,
                userName: callerName, 
                isOutgoing: false
            };
            
            this.notifyStateChange('connected');
            
            console.log(' Llamada aceptada');
            
        } catch (error) {
            console.error(' Error aceptando llamada:', error);
            this.cleanup();
        }
    }

    async handleCallAnswer(data) {
        try {
            console.log(' Respuesta de llamada recibida');
            
            const answer = JSON.parse(data.answer);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            
            console.log(' Llamada conectada');
            
        } catch (error) {
            console.error(' Error manejando respuesta:', error);
            this.endCall();
        }
    }

    async handleIceCandidate(data) {
        try {
            const candidate = JSON.parse(data.candidate);
            
            if (!this.peerConnection) {
                if (this.pendingOffer && data.from === this.pendingOffer.from) {
                    console.log(' Guardando candidato ICE para cuando se acepte la llamada');
                    this.pendingIceCandidates.push(candidate);
                    return;
                }
                
                console.warn(' Candidato ICE recibido pero no hay peerConnection ni oferta pendiente');
                return;
            }
            
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log(' Candidato ICE agregado');
        } catch (error) {
            console.error(' Error agregando candidato ICE:', error);
        }
    }

    handleCallEnd(data) {
        console.log(' Llamada finalizada por el otro usuario');
        this.cleanup();
        this.notifyStateChange('ended');
    }

    handleCallReject(data) {
        console.log(' Llamada rechazada');
        this.cleanup();
        this.notifyStateChange('rejected');
        alert('Llamada rechazada por el otro usuario');
    }

    handleCallUnavailable(data) {
        console.log(' Usuario no disponible');
        this.cleanup();
        this.notifyStateChange('unavailable');
        alert('Usuario no disponible para llamadas');
    }

    endCall() {
        if (this.currentCall) {
            wsClient.endCall(this.currentCall.userId);
            console.log(' Llamada finalizada');
        }
        
        this.cleanup();
        this.notifyStateChange('ended');
    }

    cleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.remoteStream = null;
        this.currentCall = null;
        this.pendingOffer = null;
        this.pendingIceCandidates = []; 
        
        const dialog = document.getElementById('incoming-call-dialog');
        if (dialog) {
            dialog.remove();
        }
    }

    getRemoteStream() {
        return this.remoteStream;
    }

    getLocalStream() {
        return this.localStream;
    }

    isInCall() {
        return this.currentCall !== null;
    }

    getCurrentCall() {
        return this.currentCall;
    }
    
    notifyStateChange(state) {
        if (this.onCallStateChange) {
            this.onCallStateChange(state, this.currentCall);
        }
    }

    setStateChangeCallback(callback) {
        this.onCallStateChange = callback;
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return !audioTrack.enabled; 
            }
        }
        return false;
    }
}

const callManager = new CallManager();
module.exports = callManager;