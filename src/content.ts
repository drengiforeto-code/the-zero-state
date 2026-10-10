export const APP_NAME = 'Zero State';

// Static copy shown when a day is closed, plus the world-average benchmark.

export const stoicQuotes: Record<string, string> = {
  nofap: 'La cagaste. Le regalaste tu disciplina a cinco minutos de nada. Mañana no hay excusa.',
  diet: 'Comiste basura sabiendo que no debías. Deja de mentirte y arréglalo mañana mismo.',
  minox: 'Un día que no aplicaste es un día que le restaste al resultado que quieres ver.',
  work: 'Perdiste el día. Nadie te lo regala de vuelta — mañana lo compensas con intensidad, no con excusas.',
  sleep: 'Dormiste mal y lo vas a arrastrar todo el día. Corrige la rutina de noche, no la lamentes de día.',
  gym: 'No fuiste. Así de simple. Tu cuerpo no espera a que tengas ganas.',
  scroll: 'Le entregaste tu atención a una pantalla. Esa hora no vuelve. Mañana la reclamas.',
  lookmax: 'Te saltaste los detalles. Nadie construye una mejor versión de sí mismo a medias.',
  pray: 'Ni cinco minutos de quietud te diste. Así se acumula el ruido que después te explota.',
  protein: 'No le diste a tu cuerpo lo que necesitaba para recuperarse. Estás dejando resultados en la mesa.',
  perfect: 'Día perfecto. Ahora la presión es no bajar el nivel mañana.',
};
export const genericQuote = 'Dijiste que lo harías y no lo hiciste. La palabra que te das a ti mismo es la primera que tienes que cumplir.';

export const calloutPool = [
  'Sé honesto: hoy no dio tu mejor versión. Que la incomodidad de leer esto sea la razón para no repetirlo mañana.',
  'Esto no es un examen que repruebas y ya. Es tu vida diaria. Actúa como si importara, porque importa.',
  'Nadie te va a aplaudir por intentarlo. Te van a respetar por sostenerlo. Hoy no lo sostuviste.',
  'Deja de justificarte. Levántate mañana y hazlo distinto — es la única corrección que cuenta.',
  'La versión de ti que quieres ser no se construye perdonándote cada fallo sin cambiar nada.',
  'Guárdate la excusa. Nadie la va a necesitar cuando veas el resultado en tres meses — ni tú.',
  'Hoy fue mediocre y lo sabes. La pregunta no es qué pasó, es qué vas a hacer distinto en 12 horas.',
];

export const successCallouts = [
  'Cumpliste. No te relajes: mañana el estándar es el mismo, no menos.',
  'Un día bien cerrado no es la meta, es el mínimo. Repítelo hasta que sea aburrido.',
  'Bien. Ahora la trampa es pensar que ya te lo ganaste y bajar la guardia mañana.',
];

export const WORLD_AVG = 0.52;

// "Realidad temporal" — short reminders that time is running out. One per day
// (rotates by day of the year); {dias}, {pct} and {anio} are filled in live.
export const TIME_PUNCHES = [
  'El año no espera a que tengas ganas.',
  'Quedan {dias} días. ¿Cuántos más vas a regalar?',
  'No te falta tiempo. Te sobra distracción.',
  'Cada scroll es un minuto que no vuelve.',
  'Mañana es el escondite favorito de los mediocres.',
  'Ya se fue el {pct}% del {anio}. ¿Y tú qué hiciste?',
  'Desahuévate: el reloj no negocia.',
  'Nadie va a recuperar este día por ti.',
  'Ocupado no es lo mismo que productivo.',
  'El tiempo que matas te está matando a ti.',
  'Suelta el celular. La vida está pasando sin ti.',
  'Un día perdido no se compensa: se acumula.',
  'Tu yo de diciembre te está mirando. No lo decepciones.',
  'No estás cansado. Estás distraído.',
  'La disciplina de hoy es la libertad de diciembre.',
  'El reloj corre igual si lo miras o no. Muévete.',
  'Lo urgente te roba lo importante. Elige.',
  'Quedan {dias} días del {anio}. Ninguno vuelve.',
  'Hoy no se repite. Haz que cuente.',
  'Tus excusas no detienen el calendario.',
  'Lo efímero te cobra en lo importante.',
  'Si hoy no avanzas, retrocedes: el tiempo no se queda quieto.',
  // Mentalidad de campeón.
  'Los campeones no esperan a tener ganas. Entrenan igual.',
  'Nadie te regaló nada. Nadie te lo va a regalar. A trabajar.',
  'La disciplina de hoy es lo que se ve en diciembre.',
  'Hazlo cuando duele. Ahí es donde se gana.',
  'El que quiere resultados encuentra la forma. El que no, la excusa.',
  'No se trata de motivación. Se trata de cumplir lo que dijiste.',
];
