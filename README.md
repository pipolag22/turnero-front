# Turnero Front (Vite + React + Bootstrap + Nginx)

Interfaz web para gestión y visualización de turnos de licencias.  
Construido con [React](https://reactjs.org/) + [Vite](https://vitejs.dev/).

## 🚀 Funcionalidad
- Pantalla de recepción para registrar turnos.
- Panel de operadores (BOX, PSICO, CAJA).
- Pantalla de TV en vivo con colas y alertas.
- Login de administrador.
- Dark/Light mode y estilos personalizados.

---

## 📂 Estructura
front/
├─ src/ # Código React
├─ public/ # Assets estáticos
├─ Dockerfile # Dockerfile para build en producción
└─ README.md

yaml
Copiar código

---

## ⚙️ Requisitos
- Node.js v20+
- npm o yarn
- (Opcional) Docker + Docker Compose

---

## 🔑 Variables de entorno

Crea un archivo `.env` en la carpeta `front/`:

```env
VITE_API_URL=http://localhost:3000/api
En producción con Nginx dentro del compose se usa /api.

🛠️ Instalación local (sin Docker)
bash
Copiar código
cd front
npm install
npm run dev
Por defecto arranca en:
👉 http://localhost:5173

🐳 Uso con Docker
bash
Copiar código
docker build -t turnero-front .
docker run -p 80:80 turnero-front
Por defecto arranca en:
👉 http://localhost

🔄 Integración con Backend
Este frontend espera que la API corra en:

Desarrollo: http://localhost:3000/api

Producción (Docker): /api (proxy vía Nginx).

📺 Pantallas principales
Recepción: ingreso de personas.

TV: pantalla pública con turnos y alertas.

Operadores: BOX, PSICO, CAJERO.

Admin: login y gestión de alertas.
