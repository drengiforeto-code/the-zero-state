# Zero State

Auditoría diaria de disciplina personal: tracker de hábitos, reportes con tendencias y un gestor de hábitos extra.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) (`@tailwindcss/vite`)
- [lucide-react](https://lucide.dev) para iconos
- Tipografía [Geist](https://fonts.google.com/specimen/Geist); estilos base y componentes en `src/index.css` (tokens de color y radios en `@theme`)

## Desarrollo

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — servidor de desarrollo con HMR
- `npm run build` — type-check (`tsc -b`) + build de producción
- `npm run lint` — Oxlint
- `npm run preview` — sirve el build de producción localmente

## Deploy en Vercel

1. Importa el repo en Vercel (preset **Vite**, detectado vía `vercel.json`).
2. Define en *Settings → Environment Variables* (Production y Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Ejecuta `database_schema.sql` una vez en el SQL Editor de Supabase.
4. Las variables `VITE_*` se incrustan en el build: tras cambiarlas, redeploya.

Ver `.env.example` para desarrollo local.
