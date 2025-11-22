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
    
    implementation("com.google.code.gson:gson:2.10.1")
}


tasks.register<JavaExec>("runServer") {
    group = "Application"
    description = "Ejecuta el servidor del chat"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.chat.server.Server")
}


tasks.register<JavaExec>("runClient") {
    group = "Application"
    description = "Ejecuta un cliente del chat"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.chat.client.Client")
    standardInput = System.`in` 
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

application {
    mainClass.set("com.chat.server.Server")
}
