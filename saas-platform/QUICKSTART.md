# 🚀 Quick Start Guide

## Instalación Rápida (Windows)

### 1. Prerrequisitos

- Node.js 18+ ([Descargar](https://nodejs.org/))
- Docker Desktop ([Descargar](https://www.docker.com/products/docker-desktop/))
- Git ([Descargar](https://git-scm.com/))

### 2. Instalación Automática

```powershell
# Abrir PowerShell como administrador y ejecutar:
cd "c:\Users\germa\OneDrive\Desktop\Web Mentor\Chatbot SaaS\wppconnect\saas-platform"

# Ejecutar script de instalación
.\install.ps1
```

### 3. Instalación Manual (si el script falla)

```powershell
# 1. Instalar dependencias
npm install
cd backend && npm install
cd ..\frontend && npm install
cd ..

# 2. Configurar entorno
copy backend\.env.example backend\.env
# Editar backend\.env con tus configuraciones

# 3. Crear archivo frontend\.env.local
echo NEXT_PUBLIC_API_URL=http://localhost:3001 > frontend\.env.local
echo NEXT_PUBLIC_WS_URL=http://localhost:3001 >> frontend\.env.local

# 4. Iniciar base de datos
docker-compose up -d postgres redis

# 5. Configurar base de datos
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 6. Iniciar aplicación
npm run dev
```

### 4. Acceder a la Aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555 (ejecutar `npm run prisma:studio`)

### 5. Credenciales Demo

```
Admin Demo:
- Email: admin@demo.com
- Password: admin123
- Subdomain: demo

Usuario Demo:
- Email: user@demo.com
- Password: demo123
- Subdomain: demo
```

## Estructura del Proyecto

```
saas-platform/
├── backend/           # API REST + WebSocket
│   ├── src/
│   │   ├── routes/    # Endpoints de API
│   │   ├── services/  # Lógica de negocio
│   │   ├── middleware/# Auth, tenant, errores
│   │   └── prisma/    # Base de datos
│   └── uploads/       # Archivos subidos
├── frontend/          # Dashboard React/Next.js
│   ├── src/
│   │   ├── app/       # Pages (App Router)
│   │   ├── components/# Componentes UI
│   │   ├── stores/    # Estado global
│   │   └── lib/       # Utilidades
└── docker-compose.yml # Servicios
```

## Comandos Útiles

```powershell
# Desarrollo
npm run dev              # Iniciar frontend + backend
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend

# Base de datos
npm run prisma:studio    # Abrir Prisma Studio
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:generate  # Generar cliente

# Producción
npm run build           # Build completo
npm start              # Iniciar en producción

# Docker
docker-compose up -d    # Iniciar servicios
docker-compose down     # Detener servicios
docker-compose logs     # Ver logs
```

## Troubleshooting

### Error: Puerto en uso

```powershell
# Verificar qué está usando el puerto 3000/3001
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar proceso si es necesario
taskkill /PID <PID> /F
```

### Error: Docker no conecta

```powershell
# Verificar que Docker Desktop esté corriendo
docker --version
docker-compose --version

# Reiniciar servicios
docker-compose down
docker-compose up -d
```

### Error: Base de datos

```powershell
# Resetear base de datos
cd backend
npx prisma migrate reset
npx prisma db seed
```

### Error: Permisos PowerShell

```powershell
# Si el script no ejecuta, cambiar política de ejecución:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Próximos Pasos

1. **Configurar WhatsApp**: Crear instancia y escanear QR
2. **Crear Chatbot**: Usar el wizard visual para configurar flujos
3. **Personalizar Branding**: Subir logo y cambiar colores
4. **Invitar Usuarios**: Agregar miembros del equipo
5. **Ver Analytics**: Monitorear conversaciones y métricas

## Soporte

- 📖 [Documentación Completa](README.md)
- 🐛 [Reportar Issues](https://github.com/tu-repo/issues)
- 💬 [Discord Community](https://discord.gg/tu-server)
- 📧 [Email Support](mailto:soporte@tudominio.com)

---

**¡Felicidades! 🎉 Tu plataforma SaaS de chatbots está lista para usar.**
