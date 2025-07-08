#!/bin/bash

echo "🚀 Iniciando WhatsApp Chatbot SaaS Platform..."

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encuentra package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Puerto $port está en uso"
        return 1
    else
        return 0
    fi
}

# Verificar puertos
echo "📋 Verificando puertos..."
if ! check_port 3000; then
    echo "❌ Puerto 3000 (frontend) está en uso. Por favor libéralo antes de continuar."
    exit 1
fi

if ! check_port 3001; then
    echo "❌ Puerto 3001 (backend) está en uso. Por favor libéralo antes de continuar."
    exit 1
fi

# Verificar servicios de Docker
echo "🐳 Verificando servicios de Docker..."
if ! docker-compose ps | grep -q "postgres.*Up"; then
    echo "⚠️  PostgreSQL no está corriendo. Iniciando..."
    docker-compose up -d postgres redis
    sleep 5
fi

# Iniciar backend en segundo plano
echo "🔧 Iniciando backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Esperar un momento para que el backend inicie
sleep 3

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Aplicación iniciada exitosamente!"
echo ""
echo "📱 URLs disponibles:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Prisma Studio: http://localhost:5555 (ejecutar 'npm run prisma:studio')"
echo ""
echo "👤 Credenciales demo:"
echo "   Admin: admin@demo.com / admin123"
echo "   Usuario: user@demo.com / demo123"
echo ""
echo "⏹️  Para detener: presiona Ctrl+C"
echo ""

# Función para cleanup cuando se termina el script
cleanup() {
    echo "🛑 Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT

# Esperar indefinidamente
wait
