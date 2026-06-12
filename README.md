# 🤖 UniBot — Ecosistema Académico

Trabajo Práctico Final — Materia: Programación  
Universidad Nacional de Rafaela (UNRAF)  
**Autores:** Santiago Bortolan

---

## 📌 Descripción

UniBot es una plataforma web académica integral para estudiantes universitarios. Combina gestión de materias, calendario académico, procesamiento de PDFs, flashcards con repetición espaciada, simulador de exámenes y un agente de IA conversacional con contexto académico personalizado.

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite |
| Backend | Django + Django REST Framework |
| Base de datos | SQLite (desarrollo) / PostgreSQL (producción) |
| Tareas async | Celery + Redis |
| IA | Groq API (llama-3.3-70b-versatile) |
| Proxy | Nginx |
| Contenedores | Docker + Docker Compose |

---

## 🚀 Instalación y uso local

### Requisitos previos
- Python 3.11+
- Node.js 18+
- Redis (para Celery)
- Una API key de [Groq](https://console.groq.com/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tpprogramacion-unraf/UniBot.git
cd UniBot
```

### 2. Configurar el backend

```bash
cd backend
pip install -r requirements.txt
```

Crear un archivo `.env`:

```env
SECRET_KEY=tu_secret_key_aqui
DEBUG=True
GROQ_API_KEY=tu_groq_api_key_aqui
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

```bash
python manage.py migrate
python manage.py runserver
```

### 3. Configurar el frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. (Opcional) Levantar con Docker

```bash
docker compose up --build
```

Incluye todos los servicios: backend, frontend, PostgreSQL, Redis y Celery.

---

## ✨ Funcionalidades

- **Gestión académica** — carreras, materias e inscripciones
- **Calendario** — visualización de eventos académicos
- **Brain Drain** — carga y procesamiento de PDFs
- **Flashcards** — generadas por IA con repetición espaciada
- **Simulador de exámenes** — preguntas generadas automáticamente
- **UniBot Chat** — agente conversacional con contexto académico
- **Resumidor de PDF** — crea resumenes de varios pdf's
- **Colab Mode** — crea grupo de amigos y comparte tus resumenes y flashcards
  
