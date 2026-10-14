# CONTEXT — Zero State

> Resumen para retomar el proyecto sin releer el código. Actualízalo al cerrar cada cambio relevante.
> Última actualización: 2026-10-14.

## 1. Qué es
App personal de disciplina diaria (PWA). El usuario responde hábitos cada día, cierra el día y ve reportes (coherencia, rachas, tendencias). Producción: https://the-zero-state.vercel.app/ — Vercel despliega solo al fusionar a `main` (~45 s).

**Usuario:** no programador, hispanohablante, directo. Pide cambios, espera que se implementen, prueben, fusionen y desplieguen. Tiene espondilitis anquilosante: el dolor físico puede arruinar su sueño (por eso «Dolor físico» es una razón de «Descansé mal»).

**No es para ahora (dicho por él):** login/cuentas, apps nativas Android/iOS, cobro premium. Solo mejoras visuales/UX y desplegar.

## 2. Stack
Vite + React 19 + TypeScript · Tailwind v4 (`@theme`, `@layer components` en `src/index.css`) · zustand con `persist` (localStorage) · Supabase (`@supabase/supabase-js`) · lucide-react (única familia de iconos) · fuente Geist.

## 3. Mapa del código
- `src/App.tsx` — estado y efectos: carga de historial/hábitos, splash, cierre del día, rollover a las 4:00 a. m., **sincronización del día en curso con la nube** (`syncDay`, `pushDay`, `dayUpdatedAt`).
- `src/store.ts` — zustand. Clave de persistencia `sovereign-os-storage-v3`, **versión 2: no renombrar ni cambiar la clave** (se perderían los datos locales).
- `src/habits.ts` — modelo de hábito, `BLOQUES`, hábitos por defecto, **migraciones de distribución versionadas** (`LAYOUT_STEPS`, `HABIT_LAYOUT_VERSION`).
- `src/icons.ts` — icono por bloque y por hábito (id conocido → palabra clave del nombre → `Target`).
- `src/ui.ts` — colores de nivel (`tierColor`), helpers de clases.
- `src/lib/` — `supabase.ts`, `habitsRepo.ts` (tabla `habitos`), `dayRepo.ts` (tabla `dia_actual`), `history.ts` (filas y fechas; `logicalDateStr`, corte 4:00), `text.ts` (`sentence()`), `pwa.ts`.
- `src/content.ts` — `APP_NAME`, citas, `TIME_PUNCHES` (frases de Realidad temporal).
- `src/components/` — `AppHeader` (marca, estado de guardado, pestañas, barra de progreso), `TrackerView` (flujo del día), `HabitCard`, `Collapse` (plegado animado), `TimeReality`, `Ring`, `ReportsView`, `HistoryList`, `SettingsTab`, `Splash`, `Logo`, `SummaryModal`, `Toast`, `InstallCard`.
- `public/` — manifiesto, `sw.js` (caché `zs-shell-vN`; **súbele el número cuando cambien íconos/shell**), íconos.
- `database_schema.sql` — todo el SQL de Supabase (idempotente donde importa).
- `vercel.json` — headers, `sw.js` sin caché.

## 4. Supabase (proyecto `rssnigidyllgcpcptsuy`)
Sin login: RLS abierto a `anon` (cualquiera con el enlace puede leer/escribir; riesgo conocido, avisado al usuario). Tablas:
- `dias_cerrados` — historial (select/insert/update/delete).
- `habitos` — configuración de hábitos (`orden`, `activo`, `config` jsonb).
- `dia_actual` — **día en curso** (una fila `id='actual'`, `estado` jsonb con `ts`). **Debe crearla el usuario ejecutando el SQL al final de `database_schema.sql`.** Si no existe, la app sigue funcionando solo en local y muestra «Solo en este dispositivo».

Las variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` se incrustan en el build.

## 5. Flujo del día
Bloques: `inicio` (Anoche y al despertar, obligatorio para iniciar) → botón «Iniciar el día» → `manana`, `dia`, `noche` → «Cerrar mi día» (guarda en `dias_cerrados`). Día lógico: el corte es a las 4:00 a. m. Un día cerrado se puede editar. Respuestas del día en curso:
- Local (zustand) siempre; **además se guardan en la nube tras cada cambio** (debounce 700 ms), se sincronizan al volver a la app, y gana la copia con `ts`/`dayUpdatedAt` más reciente.

Hábitos por defecto (ids): `sleep`, `pray`, `diet`, `protein`, `minox`, `nofap`, `scroll` (inicio) · `work`, `gym` (día) · `lookmax` (**noche**, se hace al cerrar el día).
`sleep` → razones de «Descansé mal» incluyen «Dolor físico».

**Migraciones de distribución:** cambiar `DEFAULT_HABITS` no toca a un usuario existente (sus hábitos viven en Supabase). Para mover/ajustar hábitos ya guardados se añade un paso a `LAYOUT_STEPS` (pasos actuales: v1 inicio, v2 dieta/proteína/lookmax, v3 «Dolor físico», v4 lookmax→noche).

## 6. Diseño (decisiones vigentes)
- Identidad azul tipo TheGrefg: fondo azul marino `#070c16`, gradiente marca `#0a9bff → #38d0ff`, texto oscuro sobre azul. Verde = bien, rojo = mal (nunca decorativo).
- **Sin emojis decorativos**; una sola familia de iconos (lucide, trazo ~1.8). Tarjetas planas; el brillo/gradiente solo en paneles `.hero` y botón primario.
- Tokens en `@theme` de `src/index.css`. Radios: control 10, tarjeta 14, modal 18.
- Respeta `prefers-reduced-motion`.
- Cuidado con nombres de clase propios: no usar `collapse` (choca con Tailwind) — el plegado se llama `fold`.
- Rendimiento móvil: evitar `backdrop-filter` y sombras animadas grandes (causaban lentitud al plegar/desplegar).

## 7. Flujo de trabajo para cambios
1. `git fetch origin main && git checkout -B claude/github-environment-rgu85j origin/main`
2. Editar → `npm run build` y `npm run lint`.
3. Probar con Playwright (Chromium en `/opt/pw-browsers/chromium`; módulo en `/opt/node-tools/node_modules/playwright`): servidor `VITE_SUPABASE_URL=http://mock.local VITE_SUPABASE_ANON_KEY=x npm run dev -- --port 5199`, Supabase simulado con `page.route('**/rest/v1/**')`. Sembrar localStorage desde `/favicon.svg` (una página que no ejecuta la app). `page.clock` no avanza transiciones CSS (usar `waitForTimeout`).
4. Commit con la atribución pedida, `git push -u origin claude/github-environment-rgu85j`, PR (`owner=drengiforeto-code`, `repo=the-zero-state`), fusionar con método `merge`, verificar en Vercel (p. ej. que `sw.js` tenga la versión nueva) y alinear la rama con `main`.
5. Lecciones: no usar `pkill -f` (mata el shell); hacer Read antes de Write; no crear PR sin que lo pidan (aquí el usuario espera PR + fusión + despliegue en cada cambio).

## 8. Estado actual / pendientes
- Hecho: rediseño azul, iconos coherentes, razón «Dolor físico», lookmax en noche, guardado automático en la nube del día en curso, bloques plegables con animación, frase de Realidad temporal que rota sola cada 60 s (el botón la cambia al instante).
- **Pendiente del usuario:** ejecutar en Supabase el SQL de `dia_actual` (final de `database_schema.sql`) para activar el guardado en la nube.
- Ideas ofrecidas, no confirmadas: frases propias del usuario en `TIME_PUNCHES`; para más adelante: login con RLS por usuario, notificaciones push, Capacitor (Android/iOS), premium.

## 9. Historial de cambios (resumen)
PR #1–#8: base, despliegue Vercel, reordenar hábitos, historial editable, PWA, Realidad temporal. #9: rebranding monocromo. #10: rediseño vivo (índigo/emojis). #11: identidad azul + iconos coherentes sin emojis. Siguiente: «Dolor físico», lookmax en noche, guardado en la nube, plegado de bloques, frases automáticas, documentación (`README.md`, `CONTEXT.md`, `CLAUDE.md`).
