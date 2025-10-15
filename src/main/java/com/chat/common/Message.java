package com.chat.common;

import java.io.Serializable;
import java.util.Arrays;

// Usamos 'implements Serializable' para poder enviar este objeto a través de streams.
public class Message implements Serializable {

    // Tipo de mensaje para que el servidor sepa qué hacer
    public enum MessageType {
        CONNECT,            // Conexión de un nuevo usuario
        TEXT_DIRECT,        // Mensaje de texto a un usuario específico
        TEXT_GROUP,         // Mensaje de texto a un grupo
        VOICE_NOTE,         // Nota de voz (a usuario o grupo)
        CREATE_GROUP,       // Comando para crear un grupo
        JOIN_GROUP,         // Comando para unirse a un grupo
        CALL_REQUEST,       // Solicitud de llamada (UDP)
        SERVER_INFO,        // Mensaje informativo del servidor
        HISTORY             // Solicitud de historial
    }

    private final MessageType type;
    private final String sender;      // Quién envía
    private final String recipient;   // A quién (usuario o nombre de grupo)
    private final byte[] content;     // Contenido (texto o audio)
    private final String originalFileName; // Para notas de voz

    public Message(MessageType type, String sender, String recipient, String textContent) {
        this.type = type;
        this.sender = sender;
        this.recipient = recipient;
        this.content = textContent.getBytes(); // Convertimos el texto a bytes
        this.originalFileName = null;
    }

    public Message(MessageType type, String sender, String recipient, byte[] audioContent, String fileName) {
        this.type = type;
        this.sender = sender;
        this.recipient = recipient;
        this.content = audioContent;
        this.originalFileName = fileName;
    }

    // Getters
    public MessageType getType() { return type; }
    public String getSender() { return sender; }
    public String getRecipient() { return recipient; }
    public byte[] getContent() { return content; }
    public String getTextContent() { return new String(content); }
    public String getOriginalFileName() { return originalFileName; }

    @Override
    public String toString() {
        return "Message{" +
                "type=" + type +
                ", sender='" + sender + '\'' +
                ", recipient='" + recipient + '\'' +
                ", content=" + (type == MessageType.VOICE_NOTE ? "AudioData" : getTextContent()) +
                '}';
    }
}