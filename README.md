# CotizaCCTV

CotizaCCTV es una plataforma integral para la gestión de cotizaciones y administración de servicios de CCTV. 

## Estructura del Proyecto

El proyecto está organizado como un monorepo con los siguientes componentes:

- **`cotizacctv-api`**: Backend desarrollado con Laravel (PHP).
- **`cotizacctv-web`**: Frontend desarrollado con Next.js (TypeScript) y Tailwind CSS.
- **`cotizacctv-mcps`**: Servidores MCP (Model Context Protocol) para integración de herramientas de IA.

## Tecnologías Utilizadas

- **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn/UI.
- **Backend**: Laravel 11, MySQL, PHP.
- **API**: Axios para comunicación entre frontend y backend.

## Instalación

### Backend (API)
```bash
cd cotizacctv-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Frontend (Web)
```bash
cd cotizacctv-web
npm install
npm run dev
```

## Licencia

Este proyecto es privado.
