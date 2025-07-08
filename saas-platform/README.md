# WhatsApp Chatbot SaaS Platform

Una plataforma SaaS white-label completa para crear chatbots de WhatsApp sin programar, usando WPPConnect como backend de WhatsApp.

## 🚀 Características Principales

### ✨ Funcionalidades Core

- **White-label Multi-tenant**: Cada cliente tiene su propia instancia con branding personalizado
- **Conexión WhatsApp**: Integración con WPPConnect para conectar números de WhatsApp vía QR
- **Wizard Visual**: Constructor de chatbots drag-and-drop sin código
- **Motor de Flujos**: Sistema inteligente de procesamiento de mensajes y respuestas
- **Analytics**: Métricas detalladas de conversaciones y rendimiento
- **Handoff a Humanos**: Transferencia fluida a agentes cuando sea necesario

### 🛠 Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **WhatsApp**: WPPConnect (librería original del proyecto)
- **Real-time**: Socket.IO para actualizaciones en tiempo real
- **Auth**: JWT + bcrypt
- **Cache**: Redis
- **Containerización**: Docker + Docker Compose

### 📋 Funcionalidades del Wizard

1. **Paso 1**: Definir disparadores (palabra clave, mensaje exacto, horarios)
2. **Paso 2**: Configurar respuestas (texto, imagen, PDF, botones, listas)
3. **Paso 3**: Lógica condicional y derivación a humano
4. **Paso 4**: Activación y pruebas del bot

## 📦 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- PostgreSQL (o usar el contenedor)
- Redis (o usar el contenedor)

### 1. Clonar y Configurar

```bash
# Navegar al directorio del proyecto
cd "c:\\Users\\germa\\OneDrive\\Desktop\\Web Mentor\\Chatbot SaaS\\wppconnect\\saas-platform"

# Instalar dependencias del workspace
npm run install:all
```

### 2. Configurar Variables de Entorno

#### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Editar `backend/.env`:

```env
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/whatsapp_saas?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET=tu-clave-secreta-muy-segura-cambia-en-produccion
JWT_EXPIRES_IN=7d

# WPPConnect
WPPCONNECT_BASE_URL=http://localhost:21465

# App
APP_NAME="WhatsApp Chatbot SaaS"
APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@tudominio.com
```

#### Frontend (.env.local)

```bash
cd ../frontend
touch .env.local
```

Contenido de `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME="WhatsApp Chatbot SaaS"
```

### 3. Iniciar Servicios de Base de Datos

```bash
# Desde el directorio raíz del proyecto
docker-compose up -d postgres redis
```

### 4. Configurar Base de Datos

```bash
cd backend

# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Poblar con datos iniciales
npm run prisma:seed
```

### 5. Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 6. Iniciar en Modo Desarrollo

```bash
# Desde el directorio raíz
npm run dev

# O individualmente:
# Backend: cd backend && npm run dev
# Frontend: cd frontend && npm run dev
```

## 🔧 Uso de la Plataforma

### Acceso Demo

- **URL**: http://localhost:3000
- **Admin Demo**: admin@demo.com / admin123
- **Usuario Demo**: user@demo.com / demo123
- **Subdominio**: demo

### Flujo de Uso

1. **Registro**: Crear cuenta con subdominio personalizado
2. **Conexión WhatsApp**:
   - Crear instancia de WhatsApp
   - Escanear código QR
   - Verificar conexión
3. **Crear Chatbot**:
   - Configurar disparadores
   - Diseñar flujos de conversación
   - Definir respuestas y acciones
   - Activar bot
4. **Monitorear**: Ver conversaciones y analytics en tiempo real

### Estructura del Wizard

#### Tipos de Disparadores

- `KEYWORD`: Palabra clave en el mensaje
- `EXACT_MESSAGE`: Mensaje exacto
- `TIME_BASED`: Horarios específicos
- `WELCOME`: Mensaje de bienvenida automático

#### Tipos de Respuestas

- `TEXT`: Mensaje de texto simple
- `IMAGE`: Imagen con caption
- `DOCUMENT`: PDF u otros documentos
- `BUTTON`: Botones interactivos
- `LIST`: Lista de opciones
- `LOCATION`: Ubicación GPS

#### Lógica Condicional

- Evaluación de respuestas del usuario
- Branching basado en contenido
- Handoff automático a humanos
- Variables de sesión

## 🏗 Arquitectura

```
├── backend/                 # API REST + WebSocket
│   ├── src/
│   │   ├── routes/         # Endpoints de API
│   │   ├── services/       # Lógica de negocio
│   │   ├── middleware/     # Auth, tenant, error handling
│   │   └── prisma/         # Base de datos y migraciones
│   └── uploads/            # Archivos subidos
├── frontend/               # Dashboard React
│   ├── src/
│   │   ├── app/           # Pages (Next.js App Router)
│   │   ├── components/    # Componentes UI
│   │   ├── stores/        # Estado global (Zustand)
│   │   ├── hooks/         # React hooks personalizados
│   │   └── lib/           # Utilidades y configuración
└── docker-compose.yml     # Servicios de infraestructura
```

### Flujo de Datos

1. **WhatsApp** → **WPPConnect** → **Backend API**
2. **Backend** → **Motor de Chatbots** → **Procesamiento de Reglas**
3. **Motor** → **Base de Datos** → **WebSocket** → **Frontend**
4. **Frontend** → **API REST** → **Base de Datos**

## 🔌 API Endpoints

### Autenticación

- `POST /api/auth/register` - Registro de tenant y usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/verify` - Verificar token

### WhatsApp

- `GET /api/whatsapp/instances` - Listar instancias
- `POST /api/whatsapp/instances` - Crear instancia
- `POST /api/whatsapp/instances/:id/connect` - Conectar WhatsApp
- `GET /api/whatsapp/instances/:id/qr` - Obtener código QR

### Chatbots

- `GET /api/chatbots` - Listar chatbots
- `POST /api/chatbots` - Crear chatbot
- `PUT /api/chatbots/:id` - Actualizar chatbot
- `GET /api/chatbots/:id/flows` - Obtener flujos del bot
- `POST /api/chatbots/:id/flows` - Crear flujo

### WebSocket Events

- `whatsapp-status` - Estado de conexión WhatsApp
- `new-message` - Nuevo mensaje recibido
- `conversation-status` - Cambio de estado de conversación
- `analytics-update` - Actualización de métricas

## 🎨 Personalización White-Label

### Branding por Tenant

- Logo personalizado
- Colores primarios y secundarios
- Subdominios personalizados
- Dominios propios (opcional)

### Configuración CSS

```css
:root {
  --primary-color: var(--tenant-primary, #3b82f6);
  --secondary-color: var(--tenant-secondary, #1f2937);
}
```

## 📊 Base de Datos

### Modelos Principales

- `Tenant` - Instancias white-label
- `User` - Usuarios por tenant
- `WhatsappInstance` - Conexiones de WhatsApp
- `Chatbot` - Bots configurados
- `BotFlow` - Flujos de conversación
- `Conversation` - Conversaciones activas
- `Message` - Mensajes intercambiados
- `Analytics` - Métricas y estadísticas

## 🚀 Despliegue en Producción

### Docker Compose Completo

```bash
docker-compose up -d
```

### Variables de Entorno de Producción

- Cambiar `JWT_SECRET` por una clave segura
- Configurar `DATABASE_URL` para PostgreSQL en producción
- Ajustar `REDIS_URL` para Redis en producción
- Configurar SMTP para notificaciones por email
- Configurar Stripe para pagos (opcional)

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name *.tudominio.com;

    location /api/ {
        proxy_pass http://backend:3001;
    }

    location / {
        proxy_pass http://frontend:3000;
    }
}
```

## 🔒 Seguridad

- Autenticación JWT con expiración
- Rate limiting en endpoints de API
- Validación de entrada con Joi
- Middleware de seguridad con Helmet
- CORS configurado apropiadamente
- Sanitización de datos de entrada

## 🐛 Desarrollo y Debug

### Logs

```bash
# Ver logs del backend
cd backend && npm run dev

# Ver logs de WPPConnect
docker logs wppconnect-container

# Ver logs de base de datos
docker logs postgres-container
```

### Prisma Studio

```bash
cd backend && npm run prisma:studio
# Abre en http://localhost:5555
```

### Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 📈 Roadmap y Mejoras Futuras

### Fase 1 (Actual)

- ✅ Conexión WhatsApp básica
- ✅ Wizard de chatbots
- ✅ Multi-tenant
- ✅ Dashboard básico

### Fase 2

- [ ] Editor visual drag-and-drop
- [ ] Templates de chatbots
- [ ] Integraciones (Google Sheets, Zapier)
- [ ] Métricas avanzadas

### Fase 3

- [ ] IA y NLP
- [ ] Chatbots con GPT
- [ ] Marketplace de templates
- [ ] API pública para desarrolladores

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-repo/issues)
- **Email**: soporte@tudominio.com
- **Discord**: [Servidor de la Comunidad](https://discord.gg/tu-server)

---

**Desarrollado con ❤️ usando WPPConnect y tecnologías modernas**
