import { emptyData, kinds, type Data, type Item } from '../models';
const DB='studylab', STORE='state';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});}
export async function load():Promise<Data>{const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get('data');req.onsuccess=()=>resolve(req.result?validate(req.result):emptyData());req.onerror=()=>reject(req.error);});}finally{db.close()}}
export async function save(data:Data):Promise<void>{validate(data);const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,'data');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close()}}
export function validate(input:unknown):Data{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Dados inválidos');
 const obj=input as Record<string,unknown>;if(Object.keys(obj).length!==kinds.length||kinds.some(k=>!Array.isArray(obj[k])))throw Error('Coleções inválidas');
 const ids=new Set<string>();let count=0;
 for(const kind of kinds) for(const value of obj[kind] as unknown[]){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Registro inválido');const x=value as Record<string,unknown>;
  const allowed=['id','title','subjectId','parentId','body','status','priority','color','icon','due','options','answer','explanation','schedule','createdAt','duration','score','total','questionIds'];
  if(Object.keys(x).some(k=>!allowed.includes(k))||typeof x.id!=='string'||!x.id||ids.has(x.id)||typeof x.title!=='string'||!x.title.trim()||x.title.length>500||typeof x.createdAt!=='number'||!Number.isFinite(x.createdAt))throw Error('Registro inválido ou duplicado');
  ids.add(x.id);if(++count>50000)throw Error('Limite de registros excedido');
  for(const key of ['subjectId','parentId','body','status','priority','color','icon','due','answer','explanation'])if(x[key]!==undefined&&(typeof x[key]!=='string'||(x[key] as string).length>100000))throw Error('Campo inválido');
  for(const key of ['duration','score','total'])if(x[key]!==undefined&&(typeof x[key]!=='number'||!Number.isFinite(x[key])||(x[key] as number)<0))throw Error('Número inválido');
  for(const key of ['options','questionIds'])if(x[key]!==undefined&&(!Array.isArray(x[key])||(x[key] as unknown[]).length>1000||(x[key] as unknown[]).some(s=>typeof s!=='string'||s.length>10000)))throw Error('Lista inválida');
  if(x.status!==undefined&&!['pendente','em andamento','concluído'].includes(x.status as string))throw Error('Status inválido');
  if(x.priority!==undefined&&!['baixa','média','alta'].includes(x.priority as string))throw Error('Prioridade inválida');
  if(x.due!==undefined&&x.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(x.due as string))throw Error('Data inválida');
  if(x.score!==undefined&&x.total!==undefined&&(x.score as number)>(x.total as number))throw Error('Pontuação inválida');
  if(kind==='questions'&&Array.isArray(x.options)&&x.options.length>0&&(typeof x.answer!=='string'||!x.options.includes(x.answer)||new Set(x.options).size!==x.options.length))throw Error('Alternativas inválidas');
  if(x.schedule!==undefined){const s=x.schedule as Record<string,unknown>;if(!s||typeof s!=='object'||Object.keys(s).sort().join(',')!=='dueAt,easeFactor,intervalDays,repetitions'||Object.values(s).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0)||!Number.isInteger(s.repetitions)||((s.easeFactor as number)<1.3))throw Error('Agenda inválida');}
 }
 const data=obj as unknown as Data;const subjects=new Set(data.subjects.map(x=>x.id));const topics=new Map(data.topics.map(x=>[x.id,x]));const questions=new Set(data.questions.map(x=>x.id));
 for(const kind of kinds)for(const x of data[kind]){if(x.subjectId&&!subjects.has(x.subjectId))throw Error('Disciplina inexistente');if(x.parentId&&(!topics.has(x.parentId)||kind!=='topics'||x.parentId===x.id||topics.get(x.parentId)?.subjectId!==x.subjectId))throw Error('Tópico pai inválido');if(x.questionIds?.some(id=>!questions.has(id)))throw Error('Questão inexistente');}
 for(const t of data.topics){const seen=new Set<string>();let node:Item|undefined=t;while(node?.parentId){if(seen.has(node.id))throw Error('Ciclo de tópicos');seen.add(node.id);node=topics.get(node.parentId);}}
 return data;
}
export function parseBackup(text:string):Data{if(text.length>10_000_000)throw Error('Arquivo excede 10 MB');const value:unknown=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Backup inválido');const o=value as Record<string,unknown>;if(Object.keys(o).sort().join(',')!=='data,version'||o.version!==1)throw Error('Versão de backup inválida');return validate(o.data)}
