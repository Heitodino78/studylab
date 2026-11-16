export interface FlashcardSchedule {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface Preferences {
  displayName: string;
  theme: 'light' | 'dark' | 'system';
  dailyMinutes: number;
  weeklyMinutes: number;
  pomodoro: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; cyclesBeforeLongBreak: number };
}
export interface FocusState {
  id: string;
  mode: 'pomodoro' | 'stopwatch';
  phase: 'focus' | 'shortBreak' | 'longBreak';
  startedAt: number | null;
  accumulatedMs: number;
  subjectId: string;
  cycle: number;
  durationMinutes: number;
}
export interface QuestionSnapshot {
  id: string;
  title: string;
  body: string;
  options: string[];
  answer: string;
  explanation: string;
  subjectId?: string;
  topicId?: string;
  subjectTitle?: string;
  topicTitle?: string;
  difficulty?: Difficulty;
}
export interface SimulationRun {
  id: string;
  title: string;
  questions: QuestionSnapshot[];
  answers: Record<string, string>;
  startedAt: number;
  deadline: number | null;
}
export type Kind = 'subjects' | 'topics' | 'notes' | 'questions' | 'cards' | 'tasks' | 'goals' | 'exams' | 'sessions' | 'attempts' | 'simulations' | 'reviews';
export interface Item {
  id: string;
  title: string;
  subjectId?: string;
  parentId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  questionId?: string;
  assessment?: 'objective' | 'manual' | 'pending';
  cardId?: string;
  quality?: number;
  period?: 'daily' | 'weekly';
  targetMinutes?: number;
  linkedNoteIds?: string[];
  snapshots?: QuestionSnapshot[];
  responses?: Record<string, string>;
  startedAt?: number;
  body?: string;
  status?: string;
  priority?: string;
  color?: string;
  icon?: string;
  due?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  schedule?: FlashcardSchedule;
  createdAt: number;
  duration?: number;
  score?: number;
  total?: number;
  questionIds?: string[];
}
export type Data = Record<Kind, Item[]> & { settings: Preferences; focus: FocusState; activeSimulation: SimulationRun | null };
export const kinds: Kind[] = ['subjects', 'topics', 'notes', 'questions', 'cards', 'tasks', 'goals', 'exams', 'sessions', 'attempts', 'simulations', 'reviews'];
export function emptyData(): Data {
  return {
    subjects: [], topics: [], notes: [], questions: [], cards: [], tasks: [], goals: [], exams: [], sessions: [], attempts: [], simulations: [], reviews: [],
    settings: { displayName: '', theme: 'system', dailyMinutes: 60, weeklyMinutes: 300, pomodoro: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, cyclesBeforeLongBreak: 4 } },
    focus: { id: 'initial-focus', mode: 'pomodoro', phase: 'focus', startedAt: null, accumulatedMs: 0, subjectId: '', cycle: 0, durationMinutes: 25 },
    activeSimulation: null,
  };
}
