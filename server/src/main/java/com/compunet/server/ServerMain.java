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

            // Inicializar usuarios de prueba
            initializeTestData(chatCore);

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

    private static void initializeTestData(ChatCore chatCore) {
        System.out.println("Inicializando datos de prueba...");

        // Crear usuarios de prueba
        chatCore.registerUser("user1", "Alice");
        chatCore.registerUser("user2", "Bob");
        chatCore.registerUser("user3", "Charlie");
        chatCore.registerUser("user4", "Diana");

        // Crear un grupo de prueba
        String groupId = chatCore.createGroup("user1", "Proyecto Universitario",
                new String[] { "user2", "user3" });

        // Enviar algunos mensajes de prueba
        chatCore.sendDirectMessage("user2", "user1", "Hola Alice, ¿cómo estás?");
        chatCore.sendDirectMessage("user1", "user2", "¡Hola Bob! Todo bien, ¿y tú?");

        chatCore.sendGroupMessage("user1", groupId, "¡Bienvenidos al grupo del proyecto!");
        chatCore.sendGroupMessage("user2", groupId, "Gracias Alice, listo para trabajar.");

        System.out.println("Datos de prueba inicializados correctamente.");
        System.out.println();
    }
}