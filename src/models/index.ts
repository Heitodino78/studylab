export interface FlashcardSchedule { repetitions:number; intervalDays:number; easeFactor:number; dueAt:number }
export type Kind = 'subjects'|'topics'|'notes'|'questions'|'cards'|'tasks'|'goals'|'exams'|'sessions'|'attempts'|'simulations';
export interface Item { id:string; title:string; subjectId?:string; parentId?:string; body?:string; status?:string; priority?:string; color?:string; icon?:string; due?:string; options?:string[]; answer?:string; explanation?:string; schedule?:FlashcardSchedule; createdAt:number; duration?:number; score?:number; total?:number; questionIds?:string[] }
export type Data = Record<Kind,Item[]>;
export const kinds:Kind[]=['subjects','topics','notes','questions','cards','tasks','goals','exams','sessions','attempts','simulations'];
export const emptyData=():Data=>Object.fromEntries(kinds.map(k=>[k,[]])) as unknown as Data;
