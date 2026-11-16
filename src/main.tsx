import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Store, useStore } from './context/Store';
import { Collection } from './pages/Collection';
import { Dashboard, Focus, Settings, Simulation, Statistics, StudyWatchers } from './pages/Tools';
import { Icon, type IconName } from './components/Icon';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmationHost } from './components/Confirm';
import type { Kind } from './models';
import './style.css';

type Navigation = { path: string; label: string; icon: IconName };
const groups: { label: string; items: Navigation[] }[] = [
  { label: 'Seu espaço', items: [
    { path: '/', label: 'Visão geral', icon: 'dashboard' },
    { path: '/statistics', label: 'Estatísticas', icon: 'chart' },
  ] },
  { label: 'Aprender', items: [
    { path: '/subjects', label: 'Disciplinas', icon: 'book' },
    { path: '/topics', label: 'Assuntos', icon: 'layers' },
    { path: '/notes', label: 'Biblioteca', icon: 'library' },
    { path: '/questions', label: 'Exercícios', icon: 'pencil' },
    { path: '/cards', label: 'Flashcards', icon: 'cards' },
    { path: '/simulations', label: 'Simulados', icon: 'clipboard' },
  ] },
  { label: 'Organizar', items: [
    { path: '/tasks', label: 'Planejamento', icon: 'check' },
    { path: '/goals', label: 'Metas', icon: 'target' },
    { path: '/exams', label: 'Provas e datas', icon: 'calendar' },
    { path: '/focus', label: 'Modo Foco', icon: 'timer' },
  ] },
];
const allLinks = groups.flatMap(group => group.items);

function Brand() {
  return <div className="brand"><span className="brand-mark"><Icon name="book" size={24} /></span><div>StudyLab<small>Aprender é uma prática.</small></div></div>;
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Navegação principal">{groups.map(group => (
    <div className="nav-group" key={group.label}>
      <p className="nav-label">{group.label}</p>
      {group.items.map(item => <NavLink end key={item.path} to={item.path} onClick={onNavigate}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}
    </div>
  ))}<div className="nav-group nav-settings"><NavLink to="/settings" onClick={onNavigate}><Icon name="settings" /><span>Ajustes e dados</span></NavLink></div></nav>;
}

function App() {
  const { data, error, ready, update } = useStore();
  const { pathname } = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = data.settings.theme === 'dark' || (data.settings.theme === 'system' && systemDark);
  const current = allLinks.find(link => link.path === pathname);
  const title = current?.label ?? (pathname === '/settings' ? 'Ajustes e dados' : 'StudyLab');
  const name = data.settings.displayName.trim();
  const initials = name ? name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() : 'S';
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => { document.title = `${title} · StudyLab`; }, [title]);
  useEffect(() => {
    if (!ready) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }, [pathname, ready]);

  async function toggleTheme() {
    await update(old => ({ ...old, settings: { ...old.settings, theme: dark ? 'light' : 'dark' } }));
  }

  return <div className={`app${dark ? ' dark' : ''}`}>
    <ConfirmationHost />
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Pular para o conteúdo</a>
    <aside className="sidebar">
      <Brand />
      <NavigationLinks />
      <div className="sidebar-foot"><span className="storage-dot" /><div>Seu conhecimento, com você.<small>Dados salvos neste navegador</small></div><NavLink to="/settings" aria-label="Gerenciar dados e backups"><Icon name="shield" /></NavLink></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><Icon name={current?.icon ?? 'settings'} /><span>Meu workspace</span><span className="breadcrumb-separator">/</span><strong>{title}</strong></div>
        <div className="topbar-actions"><time>{date}</time><button className="icon-button" onClick={toggleTheme} disabled={!ready} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}><Icon name={dark ? 'sun' : 'moon'} /></button><NavLink className="avatar" to="/settings" aria-label={name ? `Preferências de ${name}` : 'Personalizar seu perfil'}>{initials}</NavLink></div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {error && <div className="error" role="alert"><Icon name="warning" /><div>{error}<br /><NavLink to="/settings">Ver opções de recuperação dos dados</NavLink></div></div>}
        {!ready ? <div className="loading" role="status"><span className="loader" />Abrindo seu espaço de estudo…</div> : <>
          <StudyWatchers />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {(['subjects', 'topics', 'notes', 'questions', 'cards', 'tasks', 'goals', 'exams'] as Kind[]).map(kind => <Route key={kind} path={`/${kind}`} element={<Collection key={kind} kind={kind} />} />)}
            <Route path="/focus" element={<Focus />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/simulations" element={<Simulation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<section className="panel empty"><h1>Página não encontrada</h1><p>Esse endereço não faz parte do seu espaço.</p><NavLink to="/">Voltar à visão geral</NavLink></section>} />
          </Routes>
          <footer className="workspace-footer"><span>StudyLab</span><span>Um pouco de prática. Todos os dias.</span><NavLink to="/settings">Backup e privacidade</NavLink></footer>
        </>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Atalhos no celular">
      {(['/', '/notes', '/questions', '/focus'] as const).map(path => { const item = allLinks.find(link => link.path === path)!; return <NavLink end to={path} key={path}><Icon name={item.icon} /><span>{path === '/' ? 'Início' : path === '/focus' ? 'Foco' : item.label}</span></NavLink>; })}
      <button onClick={() => dialog.current?.showModal()} aria-label="Abrir navegação completa"><Icon name="menu" /><span>Mais</span></button>
    </nav>
    <dialog ref={dialog} className="mobile-menu" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="mobile-menu-header"><Brand /><button className="icon-button" aria-label="Fechar navegação" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
      <NavigationLinks onNavigate={() => dialog.current?.close()} />
    </dialog>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><Store><HashRouter><App /></HashRouter></Store></ErrorBoundary></React.StrictMode>);
