# Chat con Gradle (TCP/UDP)

Este proyecto implementa un sistema de chat,
que permite crear grupos, enviar mensajes de texto, notas de voz y
realizar llamadas entre usuarios o grupos, todo desde la terminal. El
sistema está dividido en dos componentes principales: el **servidor** y
los **clientes**. El servidor centraliza la comunicación entre los
usuarios, gestiona los grupos y almacena el historial de mensajes,
mientras que los clientes permiten la interacción directa por consola.

## 1. Ejecución del sistema

Primero se ejecuta el **servidor**, que gestionará las conexiones de
todos los clientes. Para iniciarlo, abrir una terminal en la raíz del
proyecto y ejecutar:


./gradlew runServer


El servidor mostrará el mensaje:

    Servidor de chat iniciado en el puerto 12345

Luego, abrir una nueva terminal por cada usuario que desee conectarse al
chat y ejecutar:

./gradlew runClient


El cliente solicitará un nombre de usuario; al ingresarlo, se conectará
automáticamente al servidor.

## 2. Comandos disponibles

Una vez dentro del chat, se pueden usar los siguientes comandos:\
- `/msg <usuario> <mensaje>` → Envía un mensaje directo a un usuario
específico.\
- `/group <nombre>` → Crea un nuevo grupo de chat con el nombre
indicado.\
- `/join <nombre>` → Permite unirse a un grupo existente.\
- `/gmsg <grupo> <mensaje>` → Envía un mensaje al grupo indicado.\
- `/audio <usuario|grupo> <ruta_archivo>` → Envía una nota de voz
(archivo `.wav` o `.mp3`) al usuario o grupo especificado.\
- `/call <usuario|grupo>` → Simula una llamada (inicio y registro de
llamada).\
- `/exit` → Cierra la sesión del cliente y finaliza la conexión.

## 3. Historial y almacenamiento

El servidor guarda todos los mensajes (texto y audio) dentro de la
carpeta `chat_history/`, con un archivo de registro por usuario o grupo.
Esto garantiza que el historial se conserve incluso si se cierra el
programa. Los archivos de audio enviados también se copian en esta
carpeta para simular la persistencia del contenido multimedia.


## 4. Pruebas y funcionamiento

Para comprobar el funcionamiento completo del chat, seguir estos pasos:\
1. Iniciar el servidor con `./gradlew runServer`.\
2. Abrir dos o más terminales adicionales y ejecutar
`./gradlew runClient` en cada una.\
3. Ingresar nombres de usuario distintos (por ejemplo, `Ana`, `Luis`,
`Carlos`).\
4. Desde un cliente, probar el envío de mensajes directos:\
   /msg Luis Hola, ¿cómo estás?`\
En la terminal de "Luis" aparecerá el mensaje recibido.\
5. Crear y probar un grupo:\
 /group Amigos    /join Amigos    /gmsg Amigos ¡Hola a todos!`\
Todos los miembros del grupo verán el mensaje simultáneamente.\
6. Para salir, ejecutar `/exit`.

Este proyecto fue desarrollado por \[Samuel Lasso - Isaac Chaves - Juan David Salazar\] 
