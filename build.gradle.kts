// build.gradle.kts
plugins {
    java
    application
}

group = "com.tuempresa"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    // Librería de Google para convertir objetos Java a JSON y viceversa
    implementation("com.google.code.gson:gson:2.10.1")
}

// Tarea para ejecutar el servidor
tasks.register<JavaExec>("runServer") {
    group = "Application"
    description = "Ejecuta el servidor del chat"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.chat.server.Server")
}

// Tarea para ejecutar el cliente
tasks.register<JavaExec>("runClient") {
    group = "Application"
    description = "Ejecuta un cliente del chat"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.chat.client.Client")
    standardInput = System.`in` // Permite que el cliente lea desde la consola
}