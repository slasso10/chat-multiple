package com.compunet.server;

import com.zeroc.Ice.*;

public class ServerMain {
    public static void main(String[] args) {
        int status = 0;
        Communicator communicator = null;
        WebSocketHandler webSocketHandler = null;

        try {
            System.out.println("===========================================");
            System.out.println("    Iniciando Servidor de Chat");
            System.out.println("===========================================");

            // Crear la lógica central compartida
            ChatCore chatCore = new ChatCore();

            // 🌐 Iniciar servidor WebSocket en puerto 8080
            webSocketHandler = new WebSocketHandler(8080, chatCore);
            chatCore.setWebSocketHandler(webSocketHandler);
            webSocketHandler.start();

            System.out.println(" Servidor WebSocket iniciado en puerto 8080");

            // Inicializar Ice para servicios RPC
            communicator = Util.initialize(args);

            // Crear el adapter Ice
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                    "ChatAdapter",
                    "ws -h localhost -p 10000:tcp -h localhost -p 10001");

            // Crear e instalar los servants
            ChatServiceI chatService = new ChatServiceI(chatCore);
            GroupServiceI groupService = new GroupServiceI(chatCore);

            adapter.add(chatService, Util.stringToIdentity("chat"));
            adapter.add(groupService, Util.stringToIdentity("group"));

            // Activar el adapter
            adapter.activate();

            System.out.println("===========================================");
            System.out.println("Presiona Ctrl+C para detener el servidor");
            System.out.println();

            // Esperar hasta que se apague el servidor
            communicator.waitForShutdown();

        } catch (java.lang.Exception e) {
            System.err.println("❌ Error en el servidor: " + e.getMessage());
            e.printStackTrace();
            status = 1;
        } finally {
            // Limpiar recursos
            if (webSocketHandler != null) {
                try {
                    webSocketHandler.stop();
                    System.out.println("✅ Servidor WebSocket detenido");
                } catch (java.lang.Exception e) {
                    System.err.println("Error al detener WebSocket: " + e.getMessage());
                }
            }

            if (communicator != null) {
                try {
                    communicator.destroy();
                } catch (java.lang.Exception e) {
                    System.err.println("Error al destruir el comunicador: " + e.getMessage());
                    status = 1;
                }
            }
        }

        System.exit(status);
    }
}