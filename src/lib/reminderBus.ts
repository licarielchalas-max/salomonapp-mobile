// Aviso interno: cuando cambia algo que tiene recordatorio (evento, pago, pospuesto, pagado...),
// se reprograman las notificaciones del teléfono.
type Listener = () => void;
const listeners = new Set<Listener>();

export function emitRemindersChanged(): void {
  listeners.forEach((l) => l());
}

export function onRemindersChanged(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
