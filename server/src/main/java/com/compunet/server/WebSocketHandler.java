package com.compunet.server;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class WebSocketHandler extends WebSocketServer {

    private final Map<String, WebSocket> userConnections = new ConcurrentHashMap<>();
    private final Gson gson = new Gson();
    private final ChatCore chatCore;

    public WebSocketHandler(int port, ChatCore chatCore) {
        super(new InetSocketAddress(port));
        this.chatCore = chatCore;
        System.out.println(" Servidor WebSocket iniciado en puerto " + port);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println(" Nueva conexión WebSocket: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        // Buscar y eliminar el usuario desconectado
        String disconnectedUser = null;
        for (Map.Entry<String, WebSocket> entry : userConnections.entrySet()) {
            if (entry.getValue() == conn) {
                disconnectedUser = entry.getKey();
                break;
            }
        }

        if (disconnectedUser != null) {
            userConnections.remove(disconnectedUser);
            System.out.println(" Usuario desconectado: " + disconnectedUser);
        }
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        try {
            JsonObject json = gson.fromJson(message, JsonObject.class);
            String type = json.get("type").getAsString();

            switch (type) {
                case "register":
                    handleRegister(conn, json);
                    break;

                case "call-offer":
                    handleCallOffer(json);
                    break;

                case "call-answer":
                    handleCallAnswer(json);
                    break;

                case "ice-candidate":
                    handleIceCandidate(json);
                    break;

                case "call-end":
                    handleCallEnd(json);
                    break;

                case "call-reject":
                    handleCallReject(json);
                    break;

                default:
                    System.out.println(" Tipo de mensaje desconocido: " + type);
            }
        } catch (Exception e) {
            System.err.println(" Error procesando mensaje WebSocket: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println(" Error en WebSocket: " + ex.getMessage());
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println(" Servidor WebSocket listo para aceptar conexiones");
        setConnectionLostTimeout(100);
    }

    private void handleRegister(WebSocket conn, JsonObject json) {
        String userId = json.get("userId").getAsString();
        userConnections.put(userId, conn);

        JsonObject response = new JsonObject();
        response.addProperty("type", "registered");
        response.addProperty("userId", userId);

        conn.send(gson.toJson(response));
        System.out.println(" Usuario registrado en WebSocket: " + userId);
    }

    public void notifyNewMessage(String userId, compunet.Message message) {
        WebSocket conn = userConnections.get(userId);

        if (conn != null && conn.isOpen()) {
            JsonObject notification = new JsonObject();
            notification.addProperty("type", "new-message");

            JsonObject msgJson = new JsonObject();
            msgJson.addProperty("id", message.id);
            msgJson.addProperty("senderId", message.senderId);
            msgJson.addProperty("senderName", message.senderName);
            msgJson.addProperty("content", message.content);
            msgJson.addProperty("timestamp", message.timestamp);
            msgJson.addProperty("chatId", message.chatId);
            msgJson.addProperty("isGroupMessage", message.isGroupMessage);
            msgJson.addProperty("isAudio", message.isAudio);
            msgJson.addProperty("audioData", message.audioData);
            msgJson.addProperty("audioDuration", message.audioDuration);

            notification.add("message", msgJson);

            conn.send(gson.toJson(notification));
            System.out.println(" Notificación de mensaje enviada a: " + userId);
        } else {
            System.out.println(" Usuario no conectado vía WebSocket: " + userId);
        }
    }

    public void notifyNewGroup(String userId, compunet.ChatSummary chatSummary) {
        WebSocket conn = userConnections.get(userId);

        if (conn != null && conn.isOpen()) {
            JsonObject notification = new JsonObject();
            notification.addProperty("type", "new-group");

            JsonObject groupJson = new JsonObject();
            groupJson.addProperty("chatId", chatSummary.chatId);
            groupJson.addProperty("chatName", chatSummary.chatName);
            groupJson.addProperty("lastMessageContent", chatSummary.lastMessageContent);
            groupJson.addProperty("lastMessageTimestamp", chatSummary.lastMessageTimestamp);
            groupJson.addProperty("isGroup", chatSummary.isGroup);

            notification.add("group", groupJson);

            conn.send(gson.toJson(notification));
            System.out.println(" Notificación de grupo enviada a: " + userId);
        }
    }

    private void handleCallOffer(JsonObject json) {
        String fromUser = json.get("from").getAsString();
        String toUser = json.get("to").getAsString();
        String offer = json.get("offer").getAsString();

        WebSocket targetConn = userConnections.get(toUser);

        if (targetConn != null && targetConn.isOpen()) {
            JsonObject callNotification = new JsonObject();
            callNotification.addProperty("type", "call-offer");
            callNotification.addProperty("from", fromUser);
            callNotification.addProperty("offer", offer);

            targetConn.send(gson.toJson(callNotification));
            System.out.println(" Oferta de llamada enviada de " + fromUser + " a " + toUser);
        } else {

            WebSocket callerConn = userConnections.get(fromUser);
            if (callerConn != null && callerConn.isOpen()) {
                JsonObject response = new JsonObject();
                response.addProperty("type", "call-unavailable");
                response.addProperty("reason", "Usuario no disponible");
                callerConn.send(gson.toJson(response));
            }
        }
    }

    private void handleCallAnswer(JsonObject json) {
        String fromUser = json.get("from").getAsString();
        String toUser = json.get("to").getAsString();
        String answer = json.get("answer").getAsString();

        WebSocket targetConn = userConnections.get(toUser);

        if (targetConn != null && targetConn.isOpen()) {
            JsonObject answerNotification = new JsonObject();
            answerNotification.addProperty("type", "call-answer");
            answerNotification.addProperty("from", fromUser);
            answerNotification.addProperty("answer", answer);

            targetConn.send(gson.toJson(answerNotification));
            System.out.println(" Respuesta de llamada enviada de " + fromUser + " a " + toUser);
        }
    }

    private void handleIceCandidate(JsonObject json) {
        String fromUser = json.get("from").getAsString();
        String toUser = json.get("to").getAsString();
        String candidate = json.get("candidate").getAsString();

        WebSocket targetConn = userConnections.get(toUser);

        if (targetConn != null && targetConn.isOpen()) {
            JsonObject iceNotification = new JsonObject();
            iceNotification.addProperty("type", "ice-candidate");
            iceNotification.addProperty("from", fromUser);
            iceNotification.addProperty("candidate", candidate);

            targetConn.send(gson.toJson(iceNotification));
            System.out.println(" ICE candidate enviado de " + fromUser + " a " + toUser);
        }
    }

    private void handleCallEnd(JsonObject json) {
        String fromUser = json.get("from").getAsString();
        String toUser = json.get("to").getAsString();

        WebSocket targetConn = userConnections.get(toUser);

        if (targetConn != null && targetConn.isOpen()) {
            JsonObject endNotification = new JsonObject();
            endNotification.addProperty("type", "call-end");
            endNotification.addProperty("from", fromUser);

            targetConn.send(gson.toJson(endNotification));
            System.out.println(" Llamada finalizada entre " + fromUser + " y " + toUser);
        }
    }

    private void handleCallReject(JsonObject json) {
        String fromUser = json.get("from").getAsString();
        String toUser = json.get("to").getAsString();

        WebSocket targetConn = userConnections.get(toUser);

        if (targetConn != null && targetConn.isOpen()) {
            JsonObject rejectNotification = new JsonObject();
            rejectNotification.addProperty("type", "call-reject");
            rejectNotification.addProperty("from", fromUser);

            targetConn.send(gson.toJson(rejectNotification));
            System.out.println(" Llamada rechazada entre " + fromUser + " y " + toUser);
        }
    }

    public int getConnectedUsersCount() {
        return userConnections.size();
    }

    public boolean isUserConnected(String userId) {
        WebSocket conn = userConnections.get(userId);
        return conn != null && conn.isOpen();
    }
}