# 🤖 UniBot — Ecosistema Académico 360°

Trabajo Práctico Final — Materia: Programación  
Universidad Nacional de Rafaela (UNRAF)  
**Autores:** Santiago Bortolan & Julián Jacob

---

## 📌 Descripción

UniBot es una plataforma web académica integral desarrollada para estudiantes universitarios. Integra gestión de materias, calendario académico, procesamiento de PDFs, flashcards con repetición espaciada, simulador de exámenes y un agente de IA conversacional con contexto académico personalizado.

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite |
| Backend | Django + Django REST Framework |
| Base de datos | PostgreSQL |
| Tareas async | Celery + Redis |
| IA | Groq API (llama-3.3-70b-versatile) |
| Proxy | Nginx |
| Contenedores | Docker + Docker Compose |

---

## 🚀 Instalación y uso local

### Requisitos previos
- [Docker](https://www.docker.com/) y Docker Compose instalados
- Una API key de [Groq](https://console.groq.com/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tpprogramacion-unraf/UniBot.git
cd UniBot
```

### 2. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Django
SECRET_KEY=tu_secret_key_aqui
DEBUG=False

# PostgreSQL
POSTGRES_DB=unibot
POSTGRES_USER=unibot_user
POSTGRES_PASSWORD=unibot_pass
DATABASE_URL=postgresql://unibot_user:unibot_pass@db:5432/unibot

# Groq
GROQ_API_KEY=tu_groq_api_key_aqui

# Redis / Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### 3. Levantar los servicios

```bash
docker compose up --build
```

Esto levanta los 5 servicios: **backend**, **frontend**, **PostgreSQL**, **Redis** y **Celery worker**.

### 4. Ejecutar migraciones

```bash
docker compose exec backend python manage.py migrate
```

### 5. (Opcional) Crear superusuario

```bash
docker compose exec backend python manage.py createsuperuser
```

### 6. Acceder a la app

- Frontend: [http://localhost](http://localhost)
- Admin Django: [http://localhost/api/admin](http://localhost/api/admin)

---

## 📂 Estructura del proyecto

UniBot/
├── backend/          # API Django (modelos, vistas, IA, autenticación)
│   ├── core/
│   │   ├── ai/       # Agente, cliente Groq, prompts, tools
│   │   └── ...
│   └── unibot/       # Configuración principal Django
├── frontend/         # React + Vite
│   └── src/
│       ├── pages/    # Dashboard, Chat, Materias, BrainDrain, etc.
│       └── ...
├── nginx/            # Configuración del proxy inverso
├── docker-compose.yml
└── .env              # Variables de entorno


## ✨ Funcionalidades principales

- **Gestión académica** — carreras, materias e inscripciones
- **Calendario** — visualización de eventos académicos
- **Brain Drain** — carga y procesamiento de PDFs
- **Flashcards** — generadas por IA con repetición espaciada
- **Simulador de exámenes** — preguntas generadas automáticamente
- **UniBot Chat** — agente conversacional con contexto académico e inyección de herramientas

---
