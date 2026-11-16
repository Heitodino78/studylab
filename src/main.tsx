import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter,NavLink,Route,Routes } from 'react-router-dom';
import { Store,useStore } from './context/Store';
import { Collection } from './pages/Collection';
import { Dashboard,Focus,Settings,Simulation } from './pages/Tools';
import type { Kind } from './models';
import './style.css';
const links:[string,string][]=[['/','Visão geral'],['/subjects','Disciplinas'],['/topics','Tópicos'],['/notes','Biblioteca'],['/questions','Exercícios'],['/cards','Flashcards'],['/tasks','Tarefas'],['/goals','Metas'],['/exams','Provas'],['/focus','Foco'],['/simulations','Simulados'],['/settings','Ajustes']];
function App(){const {error,ready}=useStore();const [dark,setDark]=useState(()=>localStorage.getItem('studylab-theme')==='dark');return <div className={dark?'app dark':'app'}><aside><div className="brand"><span>✦</span><div>StudyLab<small>Seu espaço para aprender</small></div></div><nav aria-label="Navegação principal">{links.map(([path,label])=><NavLink key={path} to={path} end>{label}</NavLink>)}</nav><button className="secondary theme" onClick={()=>{localStorage.setItem('studylab-theme',dark?'light':'dark');setDark(!dark)}}>{dark?'☀ Tema claro':'☾ Tema escuro'}</button></aside><main>{error&&<div className="error" role="alert">{error}</div>}{!ready?<p>Carregando dados…</p>:<Routes><Route path="/" element={<Dashboard/>}/>{(['subjects','topics','notes','questions','cards','tasks','goals','exams'] as Kind[]).map(k=><Route key={k} path={'/'+k} element={<Collection key={k} kind={k}/>}/>)}<Route path="/focus" element={<Focus/>}/><Route path="/simulations" element={<Simulation/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<p>Página não encontrada.</p>}/></Routes>}</main></div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Store><HashRouter><App/></HashRouter></Store></React.StrictMode>);
