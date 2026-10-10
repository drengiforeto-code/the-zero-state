import { APP_NAME } from '../content';
import Logo from './Logo';

// Boot screen: the mark draws itself, then the wordmark fades in. `leaving`
// fades the whole screen out once the app has finished its first load.
export default function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`splash fixed inset-0 z-[200] flex flex-col items-center justify-center bg-bg ${leaving ? 'splash-leaving' : ''}`}
      role="status"
      aria-label={`Cargando ${APP_NAME}`}
    >
      <Logo size={76} stroke={1.1} animate />
      <p className="splash-word m-0 mt-7 text-[13px] font-light uppercase text-fg-2">{APP_NAME}</p>
      <div className="splash-track mt-8" aria-hidden="true">
        <div className="splash-bar" />
      </div>
    </div>
  );
}
