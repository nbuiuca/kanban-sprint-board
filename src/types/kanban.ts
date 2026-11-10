export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee_id: string | null;
  labels: string[];
  position: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  created_at: string;
}

export const COLUMNS: { id: TaskStatus; title: string; dotColor: string }[] = [
  { id: 'todo', title: 'To Do', dotColor: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress', dotColor: 'bg-blue-500' },
  { id: 'in_review', title: 'In Review', dotColor: 'bg-amber-500' },
  { id: 'done', title: 'Done', dotColor: 'bg-emerald-500' },
];

export const DEFAULT_LABELS = [
  { name: 'Bug', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  { name: 'Feature', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  { name: 'Design', color: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  { name: 'Backend', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { name: 'Polish', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
];