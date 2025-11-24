package com.compunet.server;

import com.zeroc.Ice.*;

public class ServerMain {
    public static void main(String[] args) {
        int status = 0;
        Communicator communicator = null;

        try {
            // Inicializar Ice
            communicator = Util.initialize(args);

            // Crear el adapter
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                    "ChatAdapter",
                    "ws -h localhost -p 10000:tcp -h localhost -p 10001");

            // Crear la lógica central compartida
            ChatCore chatCore = new ChatCore();

            // Crear e instalar los servants
            ChatServiceI chatService = new ChatServiceI(chatCore);
            GroupServiceI groupService = new GroupServiceI(chatCore);

            adapter.add(chatService, Util.stringToIdentity("chat"));
            adapter.add(groupService, Util.stringToIdentity("group"));

            // Activar el adapter
            adapter.activate();

            System.out.println("===========================================");
            System.out.println("    Servidor de Chat iniciado");
            System.out.println("===========================================");
            System.out.println("WebSocket endpoint: ws://localhost:10000");
            System.out.println("TCP endpoint: tcp://localhost:10001");
            System.out.println("Servicios disponibles:");
            System.out.println("  - ChatService (identity: 'chat')");
            System.out.println("  - GroupService (identity: 'group')");
            System.out.println("===========================================");
            System.out.println("Presiona Ctrl+C para detener el servidor");
            System.out.println();

            // Esperar hasta que se apague el servidor
            communicator.waitForShutdown();

        } catch (java.lang.Exception e) {
            System.err.println("Error en el servidor: " + e.getMessage());
            e.printStackTrace();
            status = 1;
        } finally {
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