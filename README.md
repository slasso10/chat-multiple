# Sistema de Chat HTTP

## Integrantes
- Samuel Lasso  
- Isaac Chaves  
- Juan David Salazar  

---

## Contexto
Este proyecto corresponde a la **Tarea 2**, donde se adapta un sistema de chat previamente implementado con **sockets TCP** para que funcione en un entorno web mediante **HTTP**.  

- El **cliente** se implementa en **HTML, CSS y JavaScript**.  
- El **backend** sigue siendo en **Java** (TCP).  
- Se utiliza un **proxy HTTP en Node.js** con Express que traduce las peticiones HTTP a mensajes TCP.

---

##  Objetivo
Permitir la comunicación entre el cliente web y el servidor TCP mediante un proxy HTTP, manteniendo las funcionalidades principales:

- Crear grupos de chat.  
- Enviar mensajes de texto a usuarios individuales o grupos.  
- Consultar el historial de mensajes por usuario o grupo.  

>  Funcionalidades en tiempo real como notas de voz o llamadas no están implementadas en esta versión.

---


---

## Instalación y ejecución

### 1. Clonar el repositorio

-git clone <URL_DEL_REPOSITORIO>
-cd <NOMBRE_DEL_REPOSITORIO>

### 2. Iniciar el backend java
-cd backend-java
-./gradlew runServer

### 3. Iniciar el proxy HTTP
cd proxy-http
npm install
npm start

El proxy estará disponible en: http://localhost:3000

### 4. 4. Abrir el cliente web

acceder mediante el proxy:
http://localhost:3000

---
Flujo de comunicación



-El cliente envía peticiones HTTP al proxy (/api/connect, /api/groups, /api/messages, etc.).

-El proxy traduce las peticiones a mensajes TCP y los envía al backend Java.

-El backend procesa la información y responde al proxy.

-El proxy devuelve la respuesta al cliente, actualizando la interfaz.

---
## Funcionalidades del cliente web
1. Conexión de usuario

Ingresa un nombre de usuario y se conecta al backend a través del proxy.

Estado visible: Conectado / Desconectado.

2. Crear grupo

Ingresa un nombre de grupo y lo envía al backend.

3. Unirse a grupo

Ingresa un nombre de un grupo existente para unirse.

4. Lista de usuarios conectados

Se muestran todos los usuarios actualmente conectados (excepto el usuario activo).

5. Chat en vivo

Mensajes recientes del chat directo o de grupo (últimos 5 minutos o 50 mensajes) se muestran en la interfaz principal.

6. Historial de mensajes

Botón "Ver historial" para cargar mensajes antiguos desde los archivos de log del backend Java.
