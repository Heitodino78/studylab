import { describe, expect, it } from 'vitest';
import { emptyData } from '../models';
import { removeItem } from './Collection';

describe('exclusão e histórico', () => {
  it('preserva tentativas e remove vínculos ao excluir uma disciplina', () => {
    const data = emptyData();
    const subject = { id: 's', title: 'Disciplina', createdAt: 1 };
    data.subjects.push(subject);
    data.topics.push({ id: 't', title: 'Assunto', subjectId: 's', createdAt: 1 });
    data.attempts.push({ id: 'a', title: 'Resposta', subjectId: 's', topicId: 't', createdAt: 2 });
    data.focus.subjectId = 's';
    const result = removeItem(data, 'subjects', subject);
    expect(result.topics).toEqual([]);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].subjectId).toBeUndefined();
    expect(result.attempts[0].topicId).toBeUndefined();
    expect(result.focus.subjectId).toBe('');
  });
  it('preserva respostas ao excluir questão', () => {
    const data = emptyData();
    const question = { id: 'q', title: 'Pergunta', createdAt: 1, options: ['A'], answer: 'A' };
    data.questions.push(question); data.attempts.push({ id: 'a', title: 'Resposta', questionId: 'q', createdAt: 2 });
    const result = removeItem(data, 'questions', question);
    expect(result.attempts[0].questionId).toBeUndefined();
    expect(result.attempts[0].title).toBe('Resposta');
  });
});
