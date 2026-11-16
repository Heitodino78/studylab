import { beforeEach, describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { emptyData } from '../models';
import { load, save, updateAtomic } from './index';

globalThis.indexedDB = indexedDB;
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('studylab');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});
describe('IndexedDB', () => {
  it('persiste e recarrega estado', async () => {
    const data = emptyData();
    data.subjects.push({ id: 's', title: 'Matemática', createdAt: 1 });
    await save(data);
    expect(await load()).toEqual(data);
  });
  it('serializa alterações concorrentes entre conexões', async () => {
    const add = (id: string) => updateAtomic(data => ({ ...data, subjects: [...data.subjects, { id, title: id, createdAt: 1 }] }));
    await Promise.all([add('a'), add('b'), add('c')]);
    expect((await load()).subjects.map(s => s.id).sort()).toEqual(['a','b','c']);
  });
  it('aborta transação inválida e preserva dados anteriores', async () => {
    const data = emptyData(); data.subjects.push({ id: 's', title: 'Salva', createdAt: 1 });
    await save(data);
    await expect(updateAtomic(current => ({ ...current, subjects: [...current.subjects, current.subjects[0]] }))).rejects.toThrow();
    expect(await load()).toEqual(data);
  });
});
