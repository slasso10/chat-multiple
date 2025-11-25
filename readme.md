# Proyecto Final

Para el proyecto final de la materia se desarrolló un sistema de chat distribuido que combina **ZeroC Ice** y **WebSockets** para comunicación en tiempo real. Soporta mensajes de texto, notas de voz, grupos y llamadas de voz.

---

##  Integrantes del Grupo

- **Samuel Lasso** - Código:    A00404737
- **Isaac Chaves** - Código: A00404410
- **Juan David Salazar** - Código: A00404072

---

##  Características

✅ **Mensajería en tiempo real** con notificaciones instantáneas  
✅ **Chats directos** entre usuarios  
✅ **Grupos de chat** con múltiples participantes  
✅ **Notas de voz** con grabación desde el navegador  
✅ **Llamadas de voz P2P**   
✅ **Historial de mensajes** persistente  
✅ **Interfaz web moderna** con tema oscuro  

---

##  Arquitectura del Sistema

### Tecnologías Utilizadas

#### **Backend (Servidor)**
- **Java 17+** - Lenguaje principal del servidor
- **ZeroC Ice 3.7** - Middleware 
- **Java-WebSocket** - Servidor WebSocket para notificaciones en tiempo real
- **Gradle** - Gestor de dependencias y compilación

#### **Frontend (Cliente)**
- **JavaScript (ES6)** - Lenguaje del cliente
- **Ice.js** - Cliente Ice para comunicación RPC
- **Webpack 5** - Bundler de módulos

---

##  Flujo de Comunicación

### **Ice RPC**

Las operaciones que **modifican el estado del servidor** usan Ice RPC:

```
Cliente                          Servidor Ice
   │                                  │
   ├──── registerUser() ──────────────>
   ├──── sendDirectMessage() ─────────>
   ├──── sendGroupMessage() ──────────>
   ├──── createGroup() ───────────────>
   ├──── getDirectChatMessages() ─────>
   ├──── getUserDirectChats() ────────>
   └──── getAllUsers() ───────────────>
```

**Protocolo**: TCP/WebSockets sobre Ice  
**Puerto**: 10000 (WebSocket), 10001 (TCP)  
**Formato**: Ice Protocol 

---

###  **Notificaciones en Tiempo Real (WebSocket)**

Las **notificaciones asíncronas** del servidor a los clientes usan WebSockets:

```
Servidor WebSocket              Cliente
   │                                │
   ├──── new-message ───────────────>  (Nuevo mensaje recibido)
   ├──── new-group ─────────────────>  (Agregado a un grupo)
   ├──── call-offer ────────────────>  (Llamada entrante)
   ├──── call-answer ───────────────>  (Llamada aceptada)
   ├──── ice-candidate ─────────────>  (Candidato ICE para WebRTC)
   └──── call-end ──────────────────>  (Llamada finalizada)
```

**Protocolo**: WebSocket (ws://)  
**Puerto**: 8080  
**Formato**: JSON

---

### **Llamadas de Voz**

Las **llamadas de voz** usan conexiones P2P directas entre clientes:

```
Cliente A                  Servidor WS                Cliente B
   │                           │                          │
   ├─ Crear oferta SDP         │                          │
   ├───── call-offer ──────────>───── call-offer ─────────>
   │                           │                          │
   │                           │         Crear respuesta  ├─
   <───── call-answer ─────────<───── call-answer ────────┤
   │                           │                          │
   ├─ Candidatos ICE           │                          │
   ├───── ice-candidate ───────>───── ice-candidate ──────>
   │                           │                          │
   │           Conexión P2P directa establecida       │
   <═══════════════════════════════════════════════════════>
```

**Protocolo**: SRTP sobre UDP (establecido por WebRTC)  
**Señalización**: WebSocket (para SDP/ICE)  
**STUN Servers**: stun.l.google.com:19302

---

## Estructura del Proyecto

```
CHAT-PROYECTO/
├── CLIENT/                      # Aplicación cliente web
│   ├── src/
│   │   ├── index.js            # Punto de entrada principal
│   │   ├── index.html          # HTML de la aplicación
│   │   ├── styles.css          # Estilos CSS
│   │   ├── IceConnectionManager.js    # Gestor de conexiones Ice RPC
│   │   ├── WebSocketClient.js         # Cliente WebSocket
│   │   ├── CallManager.js             # Gestor de llamadas WebRTC
│   │   ├── AudioManager.js            # Grabación y reproducción de audio
│   │   ├── ChatStateManager.js        # Estado global del chat
│   │   ├── ChatUIController.js        # Controlador de UI
│   │   ├── MessageSender.js           # Envío de mensajes
│   │   ├── MessageReceiver.js         # Recepción de mensajes
│   │   ├── ClientCallback.js          # Callbacks de Ice (legacy)
│   │   └── generated/                 # Código generado por Ice
│   ├── package.json
│   ├── webpack.config.js
│   └── node_modules/
│
└── SERVER/                      # Servidor Java
    ├── src/main/
    │   ├── java/com/compunet/server/
    │   │   ├── ServerMain.java        # Punto de entrada del servidor
    │   │   ├── ChatCore.java          # Lógica de negocio central
    │   │   ├── ChatServiceI.java      # Implementación del servicio Ice
    │   │   ├── GroupServiceI.java     # Implementación de grupos Ice
    │   │   └── WebSocketHandler.java  # Servidor WebSocket
    │   └── slice/
    │       └── chat.ice               # Definición de interfaces Ice
    ├── build.gradle
    └── build/
```

---

##  Instalación y Ejecución

### **Prerrequisitos**

- **Java 17 o superior** 
- **Node.js 16+ y npm** 
- **Gradle 7+** 
- **ZeroC Ice 3.7** 

---

### **Paso 1: Configurar el Servidor**

```bash
# Compilar el proyecto (genera código Ice y compila Java)
.\gradlew.bat :server:build 

# Ejecutar el servidor
.\gradlew.bat :server:run
```


### **Paso 2: Configurar el Cliente**

```bash
# Navegar a la carpeta del cliente
cd CLIENT

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run serve
```



---

### **Paso 3: Acceder a la Aplicación**

1. **Abrir navegador**: `http://localhost:9000`
2. **Ingresar nombre de usuario** (ejemplo: "Ana")
3. **Abrir otra pestaña/navegador** 
4. **Ingresar otro nombre** (ejemplo: "Luis")
5. ¡Listo! Ya puedes chatear entre ambos usuarios

---

##  Guía de Uso

### **1. Iniciar Chat Directo**

1. Click en **" Chat Directo"**
2. Seleccionar un usuario de la lista
3. Click en **"Iniciar Chat"**
4. Escribir mensaje y presionar **Enter** o **"Enviar"**

---

### **2. Crear Grupo**

1. Click en **" Nuevo Grupo"**
2. Escribir nombre del grupo
3. Seleccionar miembros 
4. Click en **"Crear Grupo"**

---

### **3. Enviar Nota de Voz**

1. Click en el botón **🎤** (micrófono)
2. Hablar (el botón se vuelve rojo ⏹️)
3. Click nuevamente en **⏹️** para detener
4. Confirmar envío

---

### **4. Hacer Llamada de Voz**

1. Abrir un chat directo
2. Click en **"📞 Llamar"**
3. El otro usuario recibe una notificación
4. Al aceptar, la llamada se establece
5. Usar **🔇/🔊** para silenciar/activar micrófono
6. Click en **"📞 Colgar"** para finalizar

