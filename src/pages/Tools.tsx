/**
 * Learning pages (dashboard, statistics, focus, simulations, settings). Each page lives in
 * `./tools/`; this file keeps the original import path stable for `main.tsx`.
 */
export { Dashboard } from './tools/Dashboard';
export { Statistics } from './tools/Statistics';
export { Focus } from './tools/Focus';
export { Simulation } from './tools/Simulation';
export { Settings } from './tools/Settings';
/** Optional: render once inside <Store> so timers/simulations finish on time on every page. */
export { StudyWatchers } from './tools/watchers';
