import { supabase } from './supabase';
import type { Task, TaskStatus, TaskPriority, TeamMember, TaskComment, ActivityLog } from '../types/kanban';

// (Anonymous Auth) automatically sign in as Guest if no session exists, then return the Guest's user_id
export async function ensureGuestSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(error?.message || 'could not sign in as Guest. make sure turn on Anonymous Sign-ins in Supabase.');
  }
  return data.user.id;
}

//fetch all tasks and team members for the Kanban board
export async function fetchBoardData() {
  const [tasksRes, membersRes] = await Promise.all([
    supabase.from('tasks').select('*').order('position', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('team_members').select('*').order('created_at', { ascending: true }),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (membersRes.error) throw membersRes.error;

  return {
    tasks: (tasksRes.data || []) as Task[],
    members: (membersRes.data || []) as TeamMember[],
  };
}

// add new task to the database and log the activity
export async function createTask(payload: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee_id: string | null;
  labels: string[];
  position: number;
}): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await logActivity(data.id, `Created task in ${formatStatusName(payload.status)}`);
  return data as Task;
}

// updateTaskStatus and position of drag and drop
export async function updateTaskStatusAndOrder(
  taskId: string,
  oldStatus: TaskStatus,
  newStatus: TaskStatus,
  newPosition: number
) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, position: newPosition })
    .eq('id', taskId);

  if (error) throw error;

  if (oldStatus !== newStatus) {
    await logActivity(taskId, `Moved from ${formatStatusName(oldStatus)} → ${formatStatusName(newStatus)}`);
  }
}

// update the details of a task and log the activity
export async function updateTaskDetails(taskId: string, updates: Partial<Task>, logMessage?: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  if (logMessage) {
    await logActivity(taskId, logMessage);
  }
  return data as Task;
}

// Delete a task and associated comments/activity logs
export async function deleteTask(taskId: string) {
  await supabase.from('comments').delete().eq('task_id', taskId);
  await supabase.from('activity_logs').delete().eq('task_id', taskId);
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// Delete a team member and safely unassign their tasks
export async function deleteTeamMember(memberId: string) {
  // Unassign tasks assigned to this member so they are not lost
  await supabase.from('tasks').update({ assignee_id: null }).eq('assignee_id', memberId);
  const { error } = await supabase.from('team_members').delete().eq('id', memberId);
  if (error) throw error;
}

// Clean up duplicate tasks and team members with identical titles/names
export async function cleanDuplicateTasksAndMembers(): Promise<{
  removedTasksCount: number;
  removedMembersCount: number;
}> {
  const { tasks, members } = await fetchBoardData();

  // 1. Deduplicate team members by name (case-insensitive)
  const seenMembers = new Map<string, TeamMember>();
  const duplicateMemberIds: string[] = [];
  const memberRedirectMap = new Map<string, string>(); // duplicateId -> canonicalId

  for (const member of members) {
    const key = member.name.trim().toLowerCase();
    const existing = seenMembers.get(key);
    if (existing) {
      duplicateMemberIds.push(member.id);
      memberRedirectMap.set(member.id, existing.id);
    } else {
      seenMembers.set(key, member);
    }
  }

  // Re-assign tasks pointing to duplicate members to the canonical member ID
  for (const [dupId, canonicalId] of memberRedirectMap.entries()) {
    await supabase.from('tasks').update({ assignee_id: canonicalId }).eq('assignee_id', dupId);
  }

  // Delete duplicate members from database
  if (duplicateMemberIds.length > 0) {
    await supabase.from('team_members').delete().in('id', duplicateMemberIds);
  }

  // 2. Deduplicate tasks by title (case-insensitive)
  const seenTasks = new Map<string, Task>();
  const duplicateTaskIds: string[] = [];

  for (const task of tasks) {
    const key = task.title.trim().toLowerCase();
    if (seenTasks.has(key)) {
      duplicateTaskIds.push(task.id);
    } else {
      seenTasks.set(key, task);
    }
  }

  // Delete duplicate tasks and their comments/logs
  if (duplicateTaskIds.length > 0) {
    await supabase.from('comments').delete().in('task_id', duplicateTaskIds);
    await supabase.from('activity_logs').delete().in('task_id', duplicateTaskIds);
    await supabase.from('tasks').delete().in('id', duplicateTaskIds);
  }

  return {
    removedTasksCount: duplicateTaskIds.length,
    removedMembersCount: duplicateMemberIds.length,
  };
}

// create a new team member 
export async function createTeamMember(name: string, role: string, color: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert([{ name, role, color }])
    .select()
    .single();

  if (error) throw error;
  return data as TeamMember;
}

// fetch the comments and activity logs for a specific task
export async function fetchTaskExtras(taskId: string) {
  const [commentsRes, logsRes] = await Promise.all([
    supabase.from('comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
    supabase.from('activity_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: false }),
  ]);

  if (commentsRes.error) throw commentsRes.error;
  if (logsRes.error) throw logsRes.error;

  return {
    comments: (commentsRes.data || []) as TaskComment[],
    logs: (logsRes.data || []) as ActivityLog[],
  };
}

// add a comment to a task 
export async function addComment(taskId: string, authorName: string, content: string): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ task_id: taskId, author_name: authorName, content }])
    .select()
    .single();

  if (error) throw error;
  await logActivity(taskId, `${authorName} commented on this task`);
  return data as TaskComment;
}

// function that logs an activity for a specific task
export async function logActivity(taskId: string, action: string) {
  await supabase.from('activity_logs').insert([{ task_id: taskId, action }]);
}
export const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
] as const;

function formatStatusName(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
  };
  return map[status];
}

export async function seedSampleWorkspace() {
  const membersData = [
    { name: 'Alex Rivera', role: 'Product Designer', color: '#ec4899' },
    { name: 'Sam Chen', role: 'Full-Stack Eng', color: '#6366f1' },
    { name: 'Jordan Taylor', role: 'QA Lead', color: '#10b981' },
  ];

  const { data: members, error: memberErr } = await supabase
    .from('team_members')
    .insert(membersData)
    .select();

  if (memberErr || !members) throw memberErr;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);    
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const sampleTasks = [
    {
      title: 'Design high-contrast dark mode token system',
      description: 'Establish cohesive color palette and typography hierarchy inspired by Linear and Asana.',
      status: 'done',
      priority: 'high',
      due_date: fmt(yesterday),
      assignee_id: members[0].id,
      labels: ['Design', 'Polish'],
      position: 0,
    },
    {
      title: 'Configure Supabase Anonymous Auth & RLS policies',
      description: 'Ensure each guest session automatically signs in and strictly isolates user row data.',
      status: 'in_review',
      priority: 'high',
      due_date: fmt(today),
      assignee_id: members[1].id,
      labels: ['Backend', 'Feature'],
      position: 0,
    },
    {
      title: 'Implement real-time drag-and-drop column transitions',
      description: 'Integrate smooth card dragging across To Do, In Progress, In Review, and Done columns.',
      status: 'in_progress',
      priority: 'high',
      due_date: fmt(tomorrow),
      assignee_id: members[1].id,
      labels: ['Feature'],
      position: 0,
    },
    {
      title: 'Fix card badge overflow on mobile viewports',
      description: 'Ensure label chips wrap cleanly when more than 3 tags are assigned.',
      status: 'todo',
      priority: 'normal',
      due_date: fmt(yesterday), // Cố tình để quá hạn (overdue) để test cảnh báo màu đỏ!
      assignee_id: members[2].id,
      labels: ['Bug', 'Polish'],
      position: 0,
    },
    {
      title: 'Add slide-over panel for Task Comments & Activity Log',
      description: 'Allow team members to leave chronological notes and audit status changes.',
      status: 'todo',
      priority: 'low',
      due_date: fmt(nextWeek),
      assignee_id: members[0].id,
      labels: ['Feature', 'Design'],
      position: 1,
    },
  ];

  const { data: createdTasks, error: taskErr } = await supabase
    .from('tasks')
    .insert(sampleTasks)
    .select();

  if (taskErr) throw taskErr;

  if (createdTasks && createdTasks.length > 0) {
    await supabase.from('activity_logs').insert(
      createdTasks.map((t) => ({
        task_id: t.id,
        action: 'Task initialized in workspace',
      }))
    );
  }
}