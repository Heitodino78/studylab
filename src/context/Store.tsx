import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { emptyData, type Data } from '../models';
import { load, save } from '../storage';
const Context=createContext<{data:Data; update:(fn:(old:Data)=>Data)=>Promise<boolean>; error:string; ready:boolean}|null>(null);
export function Store({children}:{children:ReactNode}){const [data,setData]=useState(emptyData);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [loadFailed,setLoadFailed]=useState(false);
 useEffect(()=>{load().then(setData).catch(e=>{setLoadFailed(true);setError('Não foi possível abrir os dados; alterações bloqueadas: '+String(e))}).finally(()=>setReady(true));},[]);
 async function update(fn:(old:Data)=>Data){if(loadFailed)return false;try{const next=fn(data);await save(next);setData(next);setError('');return true}catch(e){setError('Não foi possível salvar: '+String(e));return false}}
 return <Context.Provider value={{data,update,error,ready}}>{children}</Context.Provider>}
export function useStore(){const value=useContext(Context);if(!value)throw Error('Store ausente');return value}
