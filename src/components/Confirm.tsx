import { useEffect, useRef, useState } from 'react';

interface Request { message: string; resolve: (accepted: boolean) => void }
const requests: Request[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

/** An explicit, keyboard-accessible confirmation that does not block the browser thread. */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise(resolve => { requests.push({ message, resolve }); notify(); });
}

export function ConfirmationHost() {
  const [request, setRequest] = useState<Request | null>(requests[0] ?? null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const sync = () => setRequest(requests[0] ?? null);
    listeners.add(sync);
    sync();
    return () => { listeners.delete(sync); };
  }, []);
  useEffect(() => {
    if (request && !dialog.current?.open) dialog.current?.showModal();
    if (!request && dialog.current?.open) dialog.current.close();
  }, [request]);

  function finish(accepted: boolean) {
    const current = requests.shift();
    current?.resolve(accepted);
    notify();
  }
  return <dialog ref={dialog} className="confirmation" aria-labelledby="confirmation-title" aria-describedby="confirmation-message" onCancel={event => { event.preventDefault(); finish(false); }}>
    <h2 id="confirmation-title">Confirmar ação</h2>
    <p id="confirmation-message">{request?.message}</p>
    <div className="actions"><button autoFocus className="secondary" onClick={() => finish(false)}>Cancelar</button><button className="danger" onClick={() => finish(true)}>Confirmar</button></div>
  </dialog>;
}
