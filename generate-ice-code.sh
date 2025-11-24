#!/bin/bash

# Script para generar código Ice para el servidor
# El cliente JavaScript usa definiciones manuales, no requiere slice2js
# Uso: ./generate-ice-code.sh

set -e

echo "======================================"
echo "  Generador de Código Ice"
echo "======================================"
echo ""

# Verificar que slice2java esté disponible
if ! command -v slice2java &> /dev/null; then
    echo "❌ Error: slice2java no está instalado o no está en el PATH"
    echo "   Por favor instala ZeroC Ice 3.7.x"
    exit 1
fi

echo "✅ slice2java encontrado"
echo ""

# Rutas
ICE_FILE="server/src/main/slice/chat.ice"
SERVER_OUTPUT="server/build/generated-src"

# Verificar que el archivo .ice existe
if [ ! -f "$ICE_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo $ICE_FILE"
    exit 1
fi

echo "📄 Archivo Ice: $ICE_FILE"
echo ""

# Generar código Java para el servidor
echo "🔨 Generando código Java para el servidor..."
mkdir -p "$SERVER_OUTPUT"
slice2java --output-dir "$SERVER_OUTPUT" "$ICE_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Código Java generado en: $SERVER_OUTPUT"
else
    echo "❌ Error al generar código Java"
    exit 1
fi

echo ""
echo "ℹ️  Nota: El cliente JavaScript usa IceDefinitions.js"
echo "   No se requiere ejecutar slice2js"
echo ""

echo "======================================"
echo "  ✅ Generación completada"
echo "======================================"
echo ""
echo "Siguiente paso:"
echo "  1. Compilar el servidor: cd server && ./gradlew build"
echo "  2. Instalar dependencias del cliente: cd client && npm install"
echo "  3. Ejecutar el servidor: cd server && ./gradlew run"
echo "  4. Ejecutar el cliente: cd client && npm run serve"
echo ""