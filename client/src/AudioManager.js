class AudioManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioStream = null;
    }


    async initialize() {
        try {
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            console.log(' Permisos de micrófono concedidos');
            return true;
        } catch (error) {
            console.error(' Error al acceder al micrófono:', error);
            throw new Error('No se pudo acceder al micrófono. Por favor, concede los permisos necesarios.');
        }
    }

    async startRecording() {
        try {
            if (!this.audioStream) {
                await this.initialize();
            }

            this.audioChunks = [];
            
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            console.log('🎙️ Grabación iniciada');
            return true;
        } catch (error) {
            console.error('Error al iniciar grabación:', error);
            throw error;
        }
    }

    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || !this.isRecording) {
                reject(new Error('No hay grabación en curso'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                
                this.isRecording = false;
                this.audioChunks = [];
                
                console.log('⏹️ Grabación detenida. Tamaño:', audioBlob.size, 'bytes');
                
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    cancelRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.audioChunks = [];
            console.log(' Grabación cancelada');
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64, mimeType = 'audio/webm;codecs=opus') {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
        }

        return new Blob([new Uint8Array(byteArrays)], { type: mimeType });
    }

    async playAudio(base64Audio) {
        try {
            const audioBlob = this.base64ToBlob(base64Audio);
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
            
            return audio;
        } catch (error) {
            console.error('Error al reproducir audio:', error);
            throw error;
        }
    }

    async getAudioDuration(blob) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => {
                resolve(Math.round(audio.duration));
            };
            audio.src = URL.createObjectURL(blob);
        });
    }

    cleanup() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }

    static isSupported() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 window.MediaRecorder);
    }
}

const audioManager = new AudioManager();
module.exports = audioManager;