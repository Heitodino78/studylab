import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyData, type Data } from '../models';
import { load, updateAtomic } from '../storage';

interface StoreValue {
  data: Data;
  update: (fn: (old: Data) => Data) => Promise<boolean>;
  error: string;
  ready: boolean;
}
const Context = createContext<StoreValue | null>(null);

export function Store({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const failed = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let active = true;
    load().then(value => { if (active) setData(value); }).catch(reason => {
      if (active) { failed.current = true; setError('Não foi possível abrir os dados; alterações bloqueadas: ' + String(reason)); }
    }).finally(() => { if (active) setReady(true); });
    if (typeof BroadcastChannel !== 'undefined') {
      const current = new BroadcastChannel('studylab-updates');
      channel.current = current;
      current.onmessage = () => {
        queue.current = queue.current.then(async () => {
          try { const latest = await load(); if (active) { setData(latest); setError('Dados atualizados em outra aba.'); } }
          catch (reason) { if (active) setError('Não foi possível atualizar dados de outra aba: ' + String(reason)); }
        });
      };
    }
    return () => { active = false; channel.current?.close(); channel.current = null; };
  }, []);

  function update(fn: (old: Data) => Data): Promise<boolean> {
    if (failed.current) return Promise.resolve(false);
    let success = false;
    const task = queue.current.then(async () => {
      try {
        const next = await updateAtomic(fn);
        setData(next);
        setError('');
        channel.current?.postMessage('changed');
        success = true;
      } catch (reason) { setError('Não foi possível salvar: ' + String(reason)); }
    });
    queue.current = task;
    return task.then(() => success);
  }
  return <Context.Provider value={{ data, update, error, ready }}>{children}</Context.Provider>;
}
export function useStore(): StoreValue {
  const value = useContext(Context);
  if (!value) throw Error('Store ausente');
  return value;
}
