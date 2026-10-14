# Zero State

Auditoría diaria de disciplina personal: tracker de hábitos, reportes con tendencias y un gestor de hábitos.

Producción: https://the-zero-state.vercel.app/ (PWA instalable).

> **Contexto técnico completo para humanos y para Claude: [`CONTEXT.md`](CONTEXT.md).** `CLAUDE.md` le indica a Claude que lo lea primero.

## Qué hace

- **Hoy:** responde «Anoche y al despertar», inicia el día, registra lo que ocurre y cierra el día. Cada respuesta se guarda sola (en el dispositivo y en la nube).
- **Reportes:** coherencia, rachas, tendencias, calendario de constancia e historial editable.
- **Ajustes:** crea, edita, ordena y archiva hábitos.
- **Realidad temporal:** fecha, cuenta regresiva del año y una frase que cambia cada minuto.

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
3. Ejecuta `database_schema.sql` en el SQL Editor de Supabase (crea `dias_cerrados`, `habitos` y `dia_actual`; es seguro repetirlo).
4. Las variables `VITE_*` se incrustan en el build: tras cambiarlas, redeploya.

Ver `.env.example` para desarrollo local.
