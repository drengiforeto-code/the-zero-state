import { Download, Share } from 'lucide-react';
import { isIos, isStandalone, promptInstall, useCanPromptInstall } from '../lib/pwa';
import Logo from './Logo';

// "Install the app" card. Hidden once the app runs installed. Chrome/Edge on
// Android and desktop get a real button; iOS gets the Share → Add to Home steps.
export default function InstallCard() {
  const canPrompt = useCanPromptInstall();
  if (isStandalone()) return null;

  return (
    <section className="card flex flex-col gap-4 sm:flex-row sm:items-center" aria-label="Instalar la app">
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[10px] border border-line bg-bg">
          <Logo size={26} stroke={1.6} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">Instala Zero State</h2>
          <p className="help mt-0.5">
            {canPrompt
              ? 'Ábrela desde tu pantalla de inicio, a pantalla completa y al instante.'
              : isIos()
                ? 'En Safari, toca Compartir y luego «Agregar a inicio».'
                : 'En el menú del navegador, elige «Instalar app» o «Agregar a la pantalla de inicio».'}
          </p>
        </div>
      </div>
      {canPrompt ? (
        <button type="button" className="btn btn-primary w-full shrink-0 sm:w-auto" onClick={() => promptInstall()}>
          <Download size={16} aria-hidden="true" />
          Instalar
        </button>
      ) : (
        isIos() && (
          <span className="flex items-center gap-2 text-[12px] text-fg-3" aria-hidden="true">
            <Share size={16} /> → Agregar a inicio
          </span>
        )
      )}
    </section>
  );
}
