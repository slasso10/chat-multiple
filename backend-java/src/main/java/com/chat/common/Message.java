package com.chat.common;

import java.io.Serializable;
import java.util.Arrays;

public class Message implements Serializable {

    public enum MessageType {
        CONNECT,
        TEXT_DIRECT,
        TEXT_GROUP,
        VOICE_NOTE,
        CREATE_GROUP,
        JOIN_GROUP,
        CALL_REQUEST,
        SERVER_INFO,
        HISTORY,
        LIST_GROUPS
    }

    private final MessageType type;
    private final String sender;
    private final String recipient;
    private final byte[] content;
    private final String originalFileName;

    public Message(MessageType type, String sender, String recipient, String textContent) {
        this.type = type;
        this.sender = sender;
        this.recipient = recipient;
        this.content = (textContent != null) ? textContent.getBytes() : null;
        this.originalFileName = null;
    }

    public Message(MessageType type, String sender, String recipient, byte[] audioContent, String fileName) {
        this.type = type;
        this.sender = sender;
        this.recipient = recipient;
        this.content = audioContent;
        this.originalFileName = fileName;
    }

    public MessageType getType() {
        return type;
    }

    public String getSender() {
        return sender;
    }

    public String getRecipient() {
        return recipient;
    }

    public byte[] getContent() {
        return content;
    }

    public String getTextContent() {
        if (content == null) {
            return "";
        }
        return new String(content);
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

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