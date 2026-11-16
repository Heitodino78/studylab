import type { ReactNode } from 'react';
const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="3" y="15" width="7" height="6" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /></>,
  book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" /><path d="M12 6v14M6 9h3M15 9h3" /></>,
  chart: <path d="M4 3v17h17M8 15v-4M13 15V7M18 15V4" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />,
  library: <path d="M4 4h4v16H4zM11 4h4v16h-4zM18 4l3 15" />,
  pencil: <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" />,
  cards: <><rect x="7" y="6" width="14" height="15" rx="2" /><path d="M17 6V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h3M11 11h6M11 15h4" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="m9 13 2 2 4-5" /></>,
  check: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m7 12 3 3 7-7" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h2M14 14h2M7 17h2" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M9 2h6M12 5V2M12 9v5l3 2M18 6l2-2" /></>,
  settings: <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3H9Z" /><circle cx="12" cy="12" r="3" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>,
  moon: <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  warning: <><path d="m12 3 10 17H2L12 3Z" /><path d="M12 9v4M12 16h.01" /></>,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon">{paths[name]}</svg>;
}
