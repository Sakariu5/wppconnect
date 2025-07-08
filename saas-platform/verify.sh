#!/bin/bash

echo "🔍 Verificando el estado del proyecto..."

# Verificar estructura de directorios
echo "📁 Verificando estructura de directorios..."
if [ -d "backend" ] && [ -d "frontend" ]; then
    echo "✅ Estructura de directorios correcta"
else
    echo "❌ Estructura de directorios incorrecta"
fi

# Verificar archivos de configuración del backend
echo "🔧 Verificando configuración del backend..."
if [ -f "backend/package.json" ] && [ -f "backend/tsconfig.json" ] && [ -f "backend/prisma/schema.prisma" ]; then
    echo "✅ Configuración del backend completa"
else
    echo "❌ Configuración del backend incompleta"
fi

# Verificar archivos de configuración del frontend
echo "🎨 Verificando configuración del frontend..."
if [ -f "frontend/package.json" ] && [ -f "frontend/tsconfig.json" ] && [ -f "frontend/tailwind.config.js" ]; then
    echo "✅ Configuración del frontend completa"
else
    echo "❌ Configuración del frontend incompleta"
fi

# Verificar archivos principales
echo "📋 Verificando archivos principales..."
key_files=(
    "backend/src/index.ts"
    "backend/src/services/whatsapp.ts"
    "backend/src/services/websocket.ts"
    "frontend/src/stores/auth.tsx"
    "frontend/src/stores/websocket.tsx"
    "frontend/src/components/providers.tsx"
    "docker-compose.yml"
    "README.md"
)

missing_files=()
for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
        missing_files+=("$file")
    fi
done

# Resumen
echo ""
echo "📊 RESUMEN:"
echo "============"
if [ ${#missing_files[@]} -eq 0 ]; then
    echo "🎉 ¡Todos los archivos principales están presentes!"
    echo "🚀 El proyecto está listo para desarrollar"
    echo ""
    echo "📝 Próximos pasos recomendados:"
    echo "1. cd backend && npm install"
    echo "2. cd frontend && npm install" 
    echo "3. docker-compose up -d (para PostgreSQL)"
    echo "4. cd backend && npx prisma db push"
    echo "5. cd backend && npm run dev"
    echo "6. cd frontend && npm run dev"
else
    echo "⚠️  Archivos faltantes: ${#missing_files[@]}"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
fi

echo ""
echo "📚 Documentación disponible:"
echo "- README.md - Información general"
echo "- QUICKSTART.md - Guía de inicio rápido"
echo "- OVERVIEW.md - Descripción técnica detallada"
