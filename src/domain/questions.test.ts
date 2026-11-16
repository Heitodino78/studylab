import { describe,it,expect } from 'vitest';
import { evaluateQuestion } from './questions';
const question={id:'q',title:'Pergunta',createdAt:0,options:['A','B'],answer:'B'};
describe('correção de exercícios',()=>{it('corrige alternativas pela resposta cadastrada',()=>{expect(evaluateQuestion(question,'B')).toEqual({score:1,total:1});expect(evaluateQuestion(question,'A')).toEqual({score:0,total:1})});it('não atribui nota automática a discursivas',()=>expect(evaluateQuestion({...question,options:[]},'texto')).toBeNull())});
