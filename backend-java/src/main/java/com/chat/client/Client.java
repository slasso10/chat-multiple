package com.chat.client;

import com.google.gson.Gson;
import com.chat.common.Message;

import java.io.*;
import java.net.Socket;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Paths;

public class Client {
    private static final String SERVER_ADDRESS = "127.0.0.1";
    private static final int SERVER_PORT = 12345;
    private static final Gson gson = new Gson();

    public static void main(String[] args) {
        try (
                Socket socket = new Socket(SERVER_ADDRESS, SERVER_PORT);
                PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
                BufferedReader consoleReader = new BufferedReader(new InputStreamReader(System.in))) {
            System.out.print("Ingresa tu nombre de usuario: ");
            String username = consoleReader.readLine();

            Message connectMessage = new Message(Message.MessageType.CONNECT, username, "server", "connect");
            out.println(gson.toJson(connectMessage));

            new Thread(new ServerListener(socket)).start();

            System.out.println("Conectado. Escribe tus comandos. Usa '/help' para ver las opciones.");
            String userInput;
            while ((userInput = consoleReader.readLine()) != null) {
                handleUserInput(userInput, username, out);
            }

        } catch (UnknownHostException e) {
            System.err.println("Host desconocido: " + SERVER_ADDRESS);
        } catch (IOException e) {
            System.err.println("No se pudo conectar al servidor: " + e.getMessage());
        }
    }

    private static void handleUserInput(String input, String username, PrintWriter out) {
        if (input.isBlank())
            return;

        Message message = null;
        String[] parts = input.split(" ", 3);
        String command = parts[0];

        try {
            switch (command) {
                case "/msg":
                    if (parts.length < 3) {
                        System.out.println("Uso: /msg <destinatario> <mensaje>");
                        return;
                    }
                    message = new Message(Message.MessageType.TEXT_DIRECT, username, parts[1], parts[2]);
                    break;
                case "/groupmsg":
                    if (parts.length < 3) {
                        System.out.println("Uso: /groupmsg <grupo> <mensaje>");
                        return;
                    }
                    message = new Message(Message.MessageType.TEXT_GROUP, username, parts[1], parts[2]);
                    break;
                case "/creategroup":
                    if (parts.length < 2) {
                        System.out.println("Uso: /creategroup <nombre_grupo>");
                        return;
                    }
                    message = new Message(Message.MessageType.CREATE_GROUP, username, parts[1], "");
                    break;
                case "/joingroup":
                    if (parts.length < 2) {
                        System.out.println("Uso: /joingroup <nombre_grupo>");
                        return;
                    }
                    message = new Message(Message.MessageType.JOIN_GROUP, username, parts[1], "");
                    break;
                case "/sendvoice":
                    if (parts.length < 3) {
                        System.out.println("Uso: /sendvoice <destinatario_o_grupo> <ruta_al_archivo>");
                        return;
                    }
                    byte[] audioBytes = Files.readAllBytes(Paths.get(parts[2]));

                    message = new Message(Message.MessageType.VOICE_NOTE, username, parts[1], audioBytes,
                            Paths.get(parts[2]).getFileName().toString());
                    break;
                case "/help":
                    printHelp();
                    return;
                default:
                    System.out.println("Comando desconocido. Usa '/help' para ver las opciones.");
                    return;
            }
            if (message != null) {
                out.println(gson.toJson(message));
            }
        } catch (IOException e) {
            System.err.println("Error al leer archivo de audio: " + e.getMessage());
        }
    }

    private static void printHelp() {
        System.out.println("\n--- Comandos Disponibles ---");
        System.out.println("/msg <usuario> <mensaje>          - Enviar mensaje directo a un usuario.");
        System.out.println("/creategroup <nombre_grupo>       - Crear un nuevo grupo de chat.");
        System.out.println("/joingroup <nombre_grupo>         - Unirse a un grupo existente.");
        System.out.println("/groupmsg <nombre_grupo> <mensaje> - Enviar mensaje a un grupo.");
        System.out.println("/sendvoice <destinatario> <ruta>  - Enviar una nota de voz a un usuario o grupo.");
        System.out.println("/help                               - Mostrar esta ayuda.\n");
    }
}

class ServerListener implements Runnable {
    private final Socket socket;
    private final Gson gson = new Gson();

    public ServerListener(Socket socket) {
        this.socket = socket;
    }

    @Override
    public void run() {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {
            String serverResponse;
            while ((serverResponse = in.readLine()) != null) {
                Message message = gson.fromJson(serverResponse, Message.class);

                if (message.getType() == Message.MessageType.VOICE_NOTE) {

                    String fileName = "received_" + System.currentTimeMillis() + "_" + message.getOriginalFileName();
                    Files.write(Paths.get(fileName), message.getContent());
                    System.out.printf("\n[Nota de voz de %s]: Archivo guardado como '%s'\n> ", message.getSender(),
                            fileName);
                } else {

                    System.out.printf("\n[%s] %s: %s\n> ", message.getSender(), message.getRecipient(),
                            message.getTextContent());
                }
            }
        } catch (IOException e) {
            System.out.println("Desconectado del servidor.");
        }
    }
}