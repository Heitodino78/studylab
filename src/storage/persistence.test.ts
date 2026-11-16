import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, save } from './index';
import { emptyData } from '../models';

// Small asynchronous IndexedDB stand-in checks transaction completion and failure propagation.
function mockDB(fail=false){let stored:unknown;const db={createObjectStore:()=>{},close:()=>{},transaction:()=>{const tx:{oncomplete?:()=>void;onerror?:()=>void;error?:Error;objectStore:()=>unknown}={objectStore:()=>({put:(value:unknown)=>{queueMicrotask(()=>{if(fail){tx.error=Error('quota');tx.onerror?.()}else{stored=structuredClone(value);tx.oncomplete?.()}})},get:()=>{const request:{result?:unknown;onsuccess?:()=>void}={};queueMicrotask(()=>{request.result=stored;request.onsuccess?.()});return request}})};return tx}};return {open:()=>{const req:{result:typeof db;onupgradeneeded?:()=>void;onsuccess?:()=>void}={result:db};queueMicrotask(()=>{req.onupgradeneeded?.();req.onsuccess?.()});return req}}}
afterEach(()=>{vi.unstubAllGlobals()});
describe('persistência',()=>{it('salva e recarrega após a transação concluir',async()=>{vi.stubGlobal('indexedDB',mockDB());const d=emptyData();d.subjects.push({id:'s',title:'Matemática',createdAt:1});await save(d);expect(await load()).toEqual(d)});it('propaga falhas da transação',async()=>{vi.stubGlobal('indexedDB',mockDB(true));await expect(save(emptyData())).rejects.toThrow('quota')})});
