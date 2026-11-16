import type { Data } from '../models';
export function weakSubjects(data:Data){return data.subjects.map(subject=>{const attempts=data.attempts.filter(a=>a.subjectId===subject.id&&a.score!==undefined&&a.total);const total=attempts.reduce((n,a)=>n+(a.total||0),0);const score=attempts.reduce((n,a)=>n+(a.score||0),0);return {subject,total,score,rate:total?score/total:null}}).filter(x=>x.total>=3&&x.rate!==null&&x.rate<.7).sort((a,b)=>a.rate!-b.rate!)}
export function elapsed(start:number|null,accumulated:number,now:number){return Math.max(0,accumulated+(start===null?0:Math.max(0,now-start)))}
