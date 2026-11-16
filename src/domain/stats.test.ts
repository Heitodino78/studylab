import { describe,it,expect } from 'vitest';
import { elapsed, weakSubjects } from './stats';
import { emptyData } from '../models';
describe('estatísticas e foco',()=>{it('conta tempo decorrido sem depender de ticks',()=>expect(elapsed(1000,500,6000)).toBe(5500));it('não inventa pontos fracos',()=>expect(weakSubjects(emptyData())).toEqual([]));});
it('não desconta tempo quando o relógio retrocede e mantém pausa',()=>{expect(elapsed(1000,500,900)).toBe(500);expect(elapsed(null,500,999999)).toBe(500)});
