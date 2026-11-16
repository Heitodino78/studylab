import type { Item } from '../models';
/** Discursive answers require manual assessment and do not contribute to accuracy. */
export function evaluateQuestion(question:Item,answer:string):{score:number;total:number}|null {
 if(!question.options?.length)return null;
 return {score:answer===question.answer?1:0,total:1};
}
