import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  type DropResult 
} from '@hello-pangea/dnd';
import { 
  Plus, 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Search,
  MessageSquare,
  Activity,
  Send,
  Users,
  AlertTriangle,
  Sparkles,
  Gamepad2,
  Kanban,
  List,
  Layers,
  ChevronDown,
  PanelLeft,
  Flame,
  Check,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { 
  ensureGuestSession, 
  fetchBoardData, 
  createTask, 
  updateTaskStatusAndOrder, 
  seedSampleWorkspace,
  fetchTaskExtras,
  addComment,
  createTeamMember,
  updateTaskDetails,
  deleteTask,
  deleteTeamMember,
  cleanDuplicateTasksAndMembers
} from './lib/kanbanApi';
import type { 
  Task, 
  TeamMember, 
  TaskStatus, 
  TaskPriority, 
  TaskComment, 
  ActivityLog 
} from './types/kanban';
import { COLUMNS, DEFAULT_LABELS } from './types/kanban';

const STUDIO_COLORS = [
  '#4f46e5', // Vibrant Indigo
  '#059669', // Emerald
  '#7c3aed', // Purple Violet
  '#d97706', // Warm Amber
  '#e11d48', // Rose Alert
  '#0284c7', // Sky Blue
  '#db2777', // Fuchsia
  '#ca8a04', // Solar Ochre
];

const COLUMN_ACCENTS: Record<TaskStatus, { borderTop: string; dot: string; textBadge: string }> = {
  todo: {
    borderTop: 'border-t-2 border-t-slate-400',
    dot: 'bg-slate-400',
    textBadge: 'text-slate-700'
  },
  in_progress: {
    borderTop: 'border-t-2 border-t-indigo-500',
    dot: 'bg-indigo-500',
    textBadge: 'text-indigo-700'
  },
  in_review: {
    borderTop: 'border-t-2 border-t-amber-500',
    dot: 'bg-amber-500',
    textBadge: 'text-amber-700'
  },
  done: {
    borderTop: 'border-t-2 border-t-emerald-500',
    dot: 'bg-emerald-500',
    textBadge: 'text-emerald-700'
  },
};

const LIGHT_LABELS: Record<string, string> = {
  Bug: 'bg-rose-50 text-rose-700 border-rose-200',
  Feature: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Design: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  Backend: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Polish: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isDueDateOverdue(dateStr: string | null, status: TaskStatus): boolean {
  if (!dateStr || status === 'done') return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return dateStr < todayStr;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getLabelStyle(labelName: string): string {
  return LIGHT_LABELS[labelName] || 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  // Active View State: 'board' | 'list' | 'milestones'
  const [activeView, setActiveView] = useState<'board' | 'list' | 'milestones'>('board');

  // Desktop Navigation Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | string>('all');
  const [labelFilter, setLabelFilter] = useState<'all' | string>('all');

  // Create Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Slide-over Task Detail Drawer State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskLogs, setTaskLogs] = useState<ActivityLog[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Quick Add Team Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(STUDIO_COLORS[0]);
  const [submittingMember, setSubmittingMember] = useState(false);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  // Dragging interaction guard
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  const resetCreateForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('normal');
    setAssigneeId('');
    setSelectedLabels([]);
    setDueDate('');
    setFormError(null);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    if (submitting) return;
    setIsModalOpen(false);
    resetCreateForm();
  }, [submitting, resetCreateForm]);

  const handleCloseMemberModal = useCallback(() => {
    if (submittingMember) return;
    setIsMemberModalOpen(false);
    setNewMemberName('');
    setNewMemberRole('');
    setMemberFormError(null);
  }, [submittingMember]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTaskId(null);
    setTaskComments([]);
    setTaskLogs([]);
    setCommentText('');
  }, []);

  // Initialize app: Ensure guest session, auto-deduplicate, and fetch board data
  useEffect(() => {
    async function initApp() {
      try {
        await ensureGuestSession();
        // Auto-deduplicate on initial load
        await cleanDuplicateTasksAndMembers();
        const data = await fetchBoardData();
        
        const hasSeeded = typeof window !== 'undefined' && localStorage.getItem('np_kanban_seeded') === 'true';

        // Only seed automatically on first-time workspace setup when empty and unseeded
        if (data.tasks.length === 0 && !hasSeeded) {
          await seedSampleWorkspace();
          await cleanDuplicateTasksAndMembers();
          if (typeof window !== 'undefined') {
            localStorage.setItem('np_kanban_seeded', 'true');
          }
          const freshData = await fetchBoardData();
          setTasks(freshData.tasks);
          setMembers(freshData.members);
        } else {
          // If tasks exist, record that workspace has been seeded so user deletions persist on refresh
          if (data.tasks.length > 0 && typeof window !== 'undefined') {
            localStorage.setItem('np_kanban_seeded', 'true');
          }
          setTasks(data.tasks);
          setMembers(data.members);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load workspace'));
      } finally {
        setLoading(false);
      }
    }

    void initApp();
  }, []);

  // Fetch comments and activity logs when drawer opens
  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    let cancelled = false;
    async function loadExtras(taskId: string) {
      setLoadingExtras(true);
      try {
        const extras = await fetchTaskExtras(taskId);
        if (!cancelled) {
          setTaskComments(extras.comments);
          setTaskLogs(extras.logs);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load task discussion and activity'));
        }
      } finally {
        if (!cancelled) {
          setLoadingExtras(false);
        }
      }
    }

    void loadExtras(selectedTaskId);
    return () => {
      cancelled = true;
    };
  }, [selectedTaskId]);

  // Global Keyboard shortcuts: Escape closes active overlays
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isMemberModalOpen && !submittingMember) {
          handleCloseMemberModal();
        } else if (isModalOpen && !submitting) {
          handleCloseCreateModal();
        } else if (selectedTaskId) {
          handleCloseDrawer();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMemberModalOpen, 
    submittingMember, 
    isModalOpen, 
    submitting, 
    selectedTaskId, 
    handleCloseMemberModal, 
    handleCloseCreateModal, 
    handleCloseDrawer
  ]);

  const handleOpenCreateModal = (status: TaskStatus = 'todo', initialLabel?: string) => {
    setModalStatus(status);
    setFormError(null);
    if (initialLabel) {
      setSelectedLabels([initialLabel]);
    }
    setIsModalOpen(true);
  };

  const toggleLabel = (labelName: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelName) 
        ? prev.filter(l => l !== labelName)
        : [...prev, labelName]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setLabelFilter('all');
  };

  const hasActiveFilters = 
    searchQuery.trim() !== '' || 
    priorityFilter !== 'all' || 
    assigneeFilter !== 'all' || 
    labelFilter !== 'all';

  // Board Summary KPIs
  const totalTasksCount = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const overdueCount = tasks.filter(t => isDueDateOverdue(t.due_date, t.status)).length;
  const sprintProgressPct = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  // Dynamic Milestone Tracks computed directly from actual tasks state
  const milestoneData = useMemo(() => {
    // 1. Overall Sprint 4 Track
    const sprintTotal = tasks.length;
    const sprintDone = tasks.filter(t => t.status === 'done').length;
    const sprintInProgress = tasks.filter(t => t.status === 'in_progress').length;
    const sprintInReview = tasks.filter(t => t.status === 'in_review').length;
    const sprintTodo = tasks.filter(t => t.status === 'todo').length;
    const sprintOverdue = tasks.filter(t => isDueDateOverdue(t.due_date, t.status)).length;
    const sprintPct = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;

    // 2. Track 1: Core Features & Backend
    const featureBackendTasks = tasks.filter(t =>
      t.labels.some(l => {
        const lower = l.toLowerCase();
        return lower === 'feature' || lower === 'backend';
      })
    );
    const fbDone = featureBackendTasks.filter(t => t.status === 'done').length;
    const fbInProgress = featureBackendTasks.filter(t => t.status === 'in_progress').length;
    const fbInReview = featureBackendTasks.filter(t => t.status === 'in_review').length;
    const fbTodo = featureBackendTasks.filter(t => t.status === 'todo').length;
    const fbPct = featureBackendTasks.length > 0 ? Math.round((fbDone / featureBackendTasks.length) * 100) : 0;

    // 3. Track 2: UI Design & Polish
    const designPolishTasks = tasks.filter(t =>
      t.labels.some(l => {
        const lower = l.toLowerCase();
        return lower === 'design' || lower === 'polish';
      })
    );
    const dpDone = designPolishTasks.filter(t => t.status === 'done').length;
    const dpInProgress = designPolishTasks.filter(t => t.status === 'in_progress').length;
    const dpInReview = designPolishTasks.filter(t => t.status === 'in_review').length;
    const dpTodo = designPolishTasks.filter(t => t.status === 'todo').length;
    const dpPct = designPolishTasks.length > 0 ? Math.round((dpDone / designPolishTasks.length) * 100) : 0;

    // 4. Track 3: Bug Triage & High Priority
    const bugHighTasks = tasks.filter(t =>
      t.labels.some(l => l.toLowerCase() === 'bug') || t.priority === 'high'
    );
    const bhDone = bugHighTasks.filter(t => t.status === 'done').length;
    const bhInProgress = bugHighTasks.filter(t => t.status === 'in_progress').length;
    const bhInReview = bugHighTasks.filter(t => t.status === 'in_review').length;
    const bhTodo = bugHighTasks.filter(t => t.status === 'todo').length;
    const bhPct = bugHighTasks.length > 0 ? Math.round((bhDone / bugHighTasks.length) * 100) : 0;

    return {
      sprint: {
        total: sprintTotal,
        done: sprintDone,
        inProgress: sprintInProgress,
        inReview: sprintInReview,
        todo: sprintTodo,
        overdue: sprintOverdue,
        pct: sprintPct,
      },
      tracks: [
        {
          id: 'features-backend',
          title: 'Core Features & Backend',
          description: 'Gameplay mechanics, API endpoints, backend services, and engine runtime logic.',
          defaultLabel: 'Feature',
          tasks: featureBackendTasks,
          done: fbDone,
          inProgress: fbInProgress,
          inReview: fbInReview,
          todo: fbTodo,
          total: featureBackendTasks.length,
          pct: fbPct,
          progressBg: 'bg-indigo-600',
          badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        },
        {
          id: 'design-polish',
          title: 'UI Design & Polish',
          description: 'Visual interfaces, animations, typography hierarchy, sound FX, and user experience polish.',
          defaultLabel: 'Design',
          tasks: designPolishTasks,
          done: dpDone,
          inProgress: dpInProgress,
          inReview: dpInReview,
          todo: dpTodo,
          total: designPolishTasks.length,
          pct: dpPct,
          progressBg: 'bg-fuchsia-600',
          badgeStyle: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
        },
        {
          id: 'bug-triage',
          title: 'Bug Triage & High Priority',
          description: 'Critical blockers, gameplay bugs, physics stability, and urgent release tickets.',
          defaultLabel: 'Bug',
          tasks: bugHighTasks,
          done: bhDone,
          inProgress: bhInProgress,
          inReview: bhInReview,
          todo: bhTodo,
          total: bugHighTasks.length,
          pct: bhPct,
          progressBg: 'bg-rose-600',
          badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200',
        },
      ],
    };
  }, [tasks]);

  // Filtered tasks mapping
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          if (task.assignee_id !== null) return false;
        } else {
          if (task.assignee_id !== assigneeFilter) return false;
        }
      }
      if (labelFilter !== 'all') {
        if (!task.labels.includes(labelFilter)) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter, labelFilter]);

  // Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const position = tasks.filter(t => t.status === modalStatus).length;
      const created = await createTask({
        title: title.trim(),
        description: description.trim(),
        status: modalStatus,
        priority,
        due_date: dueDate ? dueDate : null,
        assignee_id: assigneeId || null,
        labels: selectedLabels,
        position,
      });

      setTasks(prev => [...prev, created]);
      handleCloseCreateModal();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to create task. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Task Handler (from card, list row, or drawer)
  const handleDeleteTask = async (taskId: string, taskTitle: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const confirmed = window.confirm(`Are you sure you want to delete "${taskTitle}"?`);
    if (!confirmed) return;

    const prevTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      handleCloseDrawer();
    }

    try {
      await deleteTask(taskId);
      setNotice(`Task "${taskTitle}" was deleted.`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      setTasks(prevTasks);
      setError(getErrorMessage(err, 'Failed to delete task. Changes were reverted.'));
    }
  };

  // Delete Team Member Handler (from sidebar roster)
  const handleDeleteMember = async (memberId: string, memberName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Remove team member "${memberName}"? Any tasks assigned to them will be moved to Unassigned.`);
    if (!confirmed) return;

    const prevMembers = [...members];
    const prevTasks = [...tasks];

    // Optimistic update
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setTasks(prev => prev.map(t => t.assignee_id === memberId ? { ...t, assignee_id: null } : t));
    if (assigneeFilter === memberId) {
      setAssigneeFilter('all');
    }

    try {
      await deleteTeamMember(memberId);
      setNotice(`Team member "${memberName}" was removed.`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      setMembers(prevMembers);
      setTasks(prevTasks);
      setError(getErrorMessage(err, 'Failed to remove team member. Changes were reverted.'));
    }
  };

  // Manual Duplicate Cleanup Handler
  const handleCleanDuplicates = async () => {
    setCleaningDuplicates(true);
    try {
      const res = await cleanDuplicateTasksAndMembers();
      const fresh = await fetchBoardData();
      setTasks(fresh.tasks);
      setMembers(fresh.members);
      if (res.removedTasksCount > 0 || res.removedMembersCount > 0) {
        setNotice(`Cleaned ${res.removedTasksCount} duplicate task(s) and ${res.removedMembersCount} duplicate member(s).`);
      } else {
        setNotice('Workspace is clean. No duplicates found.');
      }
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to clean duplicates'));
    } finally {
      setCleaningDuplicates(false);
    }
  };

  // Manual Workspace Re-seed Handler (explicitly requested by user)
  const handleReseedWorkspace = async () => {
    setLoading(true);
    try {
      await seedSampleWorkspace();
      await cleanDuplicateTasksAndMembers();
      if (typeof window !== 'undefined') {
        localStorage.setItem('np_kanban_seeded', 'true');
      }
      const freshData = await fetchBoardData();
      setTasks(freshData.tasks);
      setMembers(freshData.members);
      setNotice('Sample workspace data generated successfully.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to generate sample workspace'));
    } finally {
      setLoading(false);
    }
  };

  // Add Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const author = commentAuthor.trim() || 'Studio Member';
      const created = await addComment(selectedTaskId, author, commentText.trim());
      setTaskComments(prev => [...prev, created]);
      setTaskLogs(prev => [
        {
          id: `log-${Date.now()}`,
          task_id: selectedTaskId,
          user_id: '',
          action: `${author} added a note: "${commentText.trim().slice(0, 30)}..."`,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setCommentText('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to post comment.'));
    } finally {
      setSubmittingComment(false);
    }
  };

  // Update single task field from Drawer or List View
  const handleUpdateDrawerField = async (
    field: keyof Task, 
    value: string | string[] | null, 
    logLabel: string,
    targetTaskId?: string
  ) => {
    const idToUpdate = targetTaskId || selectedTask?.id;
    if (!idToUpdate) return;

    const taskToUpdate = tasks.find(t => t.id === idToUpdate);
    if (!taskToUpdate) return;

    const oldTask = taskToUpdate;
    const updated = { ...taskToUpdate, [field]: value };

    // Optimistic update
    setTasks(prev => prev.map(t => (t.id === idToUpdate ? updated : t)));

    try {
      await updateTaskDetails(idToUpdate, { [field]: value }, `Updated ${logLabel}`);
      setTaskLogs(prev => [
        {
          id: `log-${Date.now()}`,
          task_id: idToUpdate,
          user_id: '',
          action: `Updated ${logLabel}`,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      // Revert on error
      setTasks(prev => prev.map(t => (t.id === idToUpdate ? oldTask : t)));
      setError(getErrorMessage(err, `Failed to update ${logLabel}`));
    }
  };

  // Create Team Member Submission
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      setMemberFormError('Member name is required.');
      return;
    }

    setSubmittingMember(true);
    setMemberFormError(null);

    try {
      const created = await createTeamMember(
        newMemberName.trim(),
        newMemberRole.trim() || 'Studio Contributor',
        newMemberColor
      );
      setMembers(prev => [...prev, created]);
      handleCloseMemberModal();
    } catch (err: unknown) {
      setMemberFormError(getErrorMessage(err, 'Failed to create team member.'));
    } finally {
      setSubmittingMember(false);
    }
  };

  // Drag-and-Drop Handler (Clean coordinates without offset bugs)
  const handleDragEnd = async (result: DropResult) => {
    setIsDraggingAny(false);
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    // Snapshot for rollback in case of error
    const previousTasks = [...tasks];

    const sourceColTasks = tasks
      .filter(t => t.status === sourceStatus)
      .sort((a, b) => a.position - b.position);

    const draggedTask = sourceColTasks.find(t => t.id === draggableId);
    if (!draggedTask) return;

    let nextTasks: Task[];

    if (sourceStatus === destStatus) {
      // Reorder within the same column
      const reordered = Array.from(sourceColTasks);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);

      const updatedCol = reordered.map((t, idx) => ({ ...t, position: idx }));
      nextTasks = tasks.map(t => {
        if (t.status === sourceStatus) {
          const found = updatedCol.find(u => u.id === t.id);
          return found || t;
        }
        return t;
      });
    } else {
      // Move across columns
      const destColTasks = tasks
        .filter(t => t.status === destStatus)
        .sort((a, b) => a.position - b.position);

      const updatedSource = Array.from(sourceColTasks);
      updatedSource.splice(source.index, 1);
      const reindexedSource = updatedSource.map((t, idx) => ({ ...t, position: idx }));

      const updatedDest = Array.from(destColTasks);
      const moved = { ...draggedTask, status: destStatus, position: destination.index };
      updatedDest.splice(destination.index, 0, moved);
      const reindexedDest = updatedDest.map((t, idx) => ({ ...t, position: idx }));

      const untouched = tasks.filter(t => t.status !== sourceStatus && t.status !== destStatus);
      nextTasks = [...untouched, ...reindexedSource, ...reindexedDest];
    }

    // Optimistic UI state update
    setTasks(nextTasks);

    // Persist to Supabase
    try {
      await updateTaskStatusAndOrder(draggedTask.id, sourceStatus, destStatus, destination.index);
    } catch (err: unknown) {
      setTasks(previousTasks);
      setError(`Failed to update task: ${getErrorMessage(err, 'Network error')}. Changes were reverted.`);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="text-xl font-medium flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-spin" />
          Loading Next Play Games workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sleek Linear/Asana Left Navigation Sidebar (Light Mode) */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full'
        } transition-all duration-300 ease-in-out flex-shrink-0 bg-slate-100/90 border-r border-slate-200/90 flex flex-col justify-between overflow-hidden z-20 select-none`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Workspace Switcher */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs transition cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-semibold text-slate-900 truncate">Next Play Games</h2>
                <p className="text-[10px] text-slate-500">Studio Workspace</p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </div>

          {/* Views Navigation (Fully Switchable) */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Views
            </div>
            
            {/* View 1: Sprint Board */}
            <button
              type="button"
              onClick={() => setActiveView('board')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                activeView === 'board'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Kanban className="w-3.5 h-3.5" />
                <span>Sprint Board</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                activeView === 'board' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {totalTasksCount}
              </span>
            </button>

            {/* View 2: Task List */}
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                activeView === 'list'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <List className="w-3.5 h-3.5" />
                <span>Task List</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                activeView === 'list' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {totalTasksCount}
              </span>
            </button>

            {/* View 3: Milestones */}
            <button
              type="button"
              onClick={() => setActiveView('milestones')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                activeView === 'milestones'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Milestones</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {sprintProgressPct}%
              </span>
            </button>
          </div>

          {/* Active Sprint Progress Box */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-slate-900">Sprint 4 Active</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">5 days left</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                <div 
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${sprintProgressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>{completedCount} of {totalTasksCount} completed</span>
                <span className="font-bold text-emerald-700">{sprintProgressPct}%</span>
              </div>
            </div>
          </div>

          {/* Studio Team Roster with Clearly Visible Delete Action */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Studio Team ({members.length})
              </span>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(true)}
                className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="space-y-1">
              {members.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setAssigneeFilter(prev => prev === m.id ? 'all' : m.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer group ${
                    assigneeFilter === m.id
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                  title={`Filter board by ${m.name}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="truncate font-medium">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 truncate max-w-[70px]">
                      {m.role}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteMember(m.id, m.name, e)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
                      title={`Remove ${m.name}`}
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-100/90 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">Supabase Sync Active</span>
          </div>
          <span className="font-mono text-slate-400">v2.4</span>
        </div>
      </aside>

      {/* Main Kanban Workspace Container (No backdrop-blur or transform to ensure cursor alignment) */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 bg-slate-50">
        {/* Top Desktop Application Bar */}
        <header className="sticky top-0 z-10 px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Toggle navigation sidebar"
              aria-label="Toggle navigation sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Next Play Games</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 font-medium">Sprints</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 font-semibold flex items-center gap-1.5">
                {activeView === 'board' ? 'Sprint Board (Kanban)' : activeView === 'list' ? 'Task List (Stage Table)' : 'Milestones Roadmap'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Team Avatars Quick Preview */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
              <div className="flex -space-x-1.5 overflow-hidden">
                {members.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-white text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: m.color }}
                    title={`${m.name} (${m.role})`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(true)}
                className="text-[10px] text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                title="Add new member"
              >
                <Users className="w-3 h-3 text-indigo-600" />
                <span className="font-medium">+ Member</span>
              </button>
            </div>

            {/* Guest Active Status Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Guest Active
            </span>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal('todo')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </button>
          </div>
        </header>

        {/* Board Main Content Area */}
        <main className="p-6 flex-1 flex flex-col space-y-6">
          {/* Telemetry Strip: Board KPI Summary + Instant Search & Filtering + Clean Duplicates */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Left: KPI Badges */}
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Total:</span>
                <span className="font-bold text-slate-800">{totalTasksCount}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span className="font-medium">In Progress:</span>
                <span className="font-bold">{inProgressCount}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span className="font-medium">Done:</span>
                <span className="font-bold">{completedCount}</span>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                overdueCount > 0 
                  ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-medium">Overdue:</span>
                <span className={`font-bold ${overdueCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  {overdueCount}
                </span>
              </div>
            </div>

            {/* Right: Search Input, Filter Dropdowns & Clean Duplicates Action */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Clean Duplicates Button */}
              <button
                type="button"
                onClick={() => void handleCleanDuplicates()}
                disabled={cleaningDuplicates}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Deduplicate tasks and team members"
              >
                <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${cleaningDuplicates ? 'animate-spin' : ''}`} />
                <span>{cleaningDuplicates ? 'Cleaning...' : 'Clean Duplicates'}</span>
              </button>

              {/* Seed Demo Data Button (when workspace is empty) */}
              {tasks.length === 0 && (
                <button
                  type="button"
                  onClick={() => void handleReseedWorkspace()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
                  title="Generate sample game sprint tasks and members"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Seed Demo Data</span>
                </button>
              )}

              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-xs text-slate-800 placeholder-slate-400 outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs text-slate-700 outline-none transition cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="low">Low Priority</option>
              </select>

              {/* Assignee Filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs text-slate-700 outline-none transition cursor-pointer"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              {/* Label Filter */}
              <select
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-xs text-slate-700 outline-none transition cursor-pointer"
              >
                <option value="all">All Labels</option>
                {DEFAULT_LABELS.map(lbl => (
                  <option key={lbl.name} value={lbl.name}>{lbl.name}</option>
                ))}
              </select>

              {/* Reset Filters Pill */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                  title="Clear all active filters"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </section>

          {/* Success / Notice Toast Banner */}
          {notice && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">{notice}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setNotice(null)} 
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer ml-4"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Network / Persistence Error Toast Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setError(null)} 
                className="text-rose-500 hover:text-rose-800 cursor-pointer ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* VIEW 1: SPRINT BOARD (KANBAN with clean drag coordinates locked to cursor) */}
          {activeView === 'board' && (
            <DragDropContext 
              onBeforeDragStart={() => setIsDraggingAny(true)}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 items-start">
                {COLUMNS.map((col) => {
                  const columnTasks = filteredTasks
                    .filter((t) => t.status === col.id)
                    .sort((a, b) => a.position - b.position);

                  const accent = COLUMN_ACCENTS[col.id];

                  return (
                    <div 
                      key={col.id} 
                      className={`bg-slate-100/80 rounded-xl p-4 border border-slate-200 ${accent.borderTop} flex flex-col shadow-xs transition-all`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${accent.dot}`} />
                          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-800">
                            {col.title}
                          </h2>
                          <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold border border-slate-200 shadow-2xs">
                            {columnTasks.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(col.id)}
                          className="text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 p-1 rounded-md transition cursor-pointer"
                          title={`Add task to ${col.title}`}
                          aria-label={`Add task to ${col.title}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Droppable Task Cards List */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 space-y-3 min-h-[220px] rounded-lg transition-colors duration-150 ${
                              snapshot.isDraggingOver ? 'bg-indigo-50/60 ring-1 ring-indigo-400/40' : ''
                            }`}
                          >
                            {columnTasks.map((task, index) => {
                              const assignee = task.assignee_id ? memberMap.get(task.assignee_id) : undefined;
                              const isOverdue = isDueDateOverdue(task.due_date, task.status);

                              return (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      onClick={() => {
                                        if (!isDraggingAny) {
                                          setSelectedTaskId(task.id);
                                        }
                                      }}
                                      className={`bg-white hover:bg-slate-50/80 p-4 rounded-lg border transition-all duration-150 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing select-none group ${
                                        dragSnapshot.isDragging
                                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl z-50'
                                          : 'border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      {/* Card Title & Hover Delete Button */}
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <h3 className="font-medium text-sm text-slate-900 leading-snug group-hover:text-slate-700 transition">
                                          {task.title}
                                        </h3>
                                        <button
                                          type="button"
                                          onClick={(e) => void handleDeleteTask(task.id, task.title, e)}
                                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition cursor-pointer flex-shrink-0"
                                          title="Delete task"
                                          aria-label="Delete task"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {task.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                          {task.description}
                                        </p>
                                      )}

                                      {/* Assignee & Due Date Meta Row */}
                                      {(assignee || task.due_date) && (
                                        <div className="flex items-center justify-between gap-2 mb-2.5 pt-1 text-xs">
                                          {assignee ? (
                                            <span
                                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                              style={{
                                                borderColor: `${assignee.color}40`,
                                                backgroundColor: `${assignee.color}15`,
                                                color: assignee.color,
                                              }}
                                              title={`${assignee.name} (${assignee.role})`}
                                            >
                                              <span 
                                                className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                                                style={{ backgroundColor: assignee.color }} 
                                              />
                                              <span className="truncate max-w-[100px]">{assignee.name}</span>
                                            </span>
                                          ) : <span />}

                                          {task.due_date && (
                                            <span
                                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                                isOverdue
                                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                                              }`}
                                              title={isOverdue ? 'Overdue task!' : 'Due date'}
                                            >
                                              <Calendar className="w-2.5 h-2.5" />
                                              {formatDueDate(task.due_date)}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* Labels & Priority Footer */}
                                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                        <div className="flex gap-1 flex-wrap">
                                          {task.labels.map((lbl, idx) => (
                                            <span
                                              key={idx}
                                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getLabelStyle(lbl)}`}
                                            >
                                              {lbl}
                                            </span>
                                          ))}
                                        </div>
                                        <span
                                          className={`text-[10px] font-bold uppercase tracking-wider ${
                                            task.priority === 'high'
                                              ? 'text-rose-600'
                                              : task.priority === 'normal'
                                              ? 'text-amber-600'
                                              : 'text-indigo-600'
                                          }`}
                                        >
                                          {task.priority}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}

                            {provided.placeholder}

                            {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                              <div className="flex h-24 items-center justify-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg bg-white/50">
                                {hasActiveFilters ? 'No matching tasks' : 'No tasks in this stage'}
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}

          {/* VIEW 2: TASK LIST (Asana/Linear Style Grouped Stage Table) */}
          {activeView === 'list' && (
            <div className="space-y-6">
              {COLUMNS.map((col) => {
                const groupTasks = filteredTasks.filter(t => t.status === col.id);
                const accent = COLUMN_ACCENTS[col.id];

                return (
                  <div key={col.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    {/* Stage Group Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${accent.dot}`} />
                        <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-800">
                          {col.title}
                        </h3>
                        <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold border border-slate-200">
                          {groupTasks.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateModal(col.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>

                    {/* Table Rows List */}
                    <div className="divide-y divide-slate-100">
                      {groupTasks.map((task) => {
                        const assignee = task.assignee_id ? memberMap.get(task.assignee_id) : undefined;
                        const isOverdue = isDueDateOverdue(task.due_date, task.status);

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
                                  void handleUpdateDrawerField('status', nextStatus, 'Status', task.id);
                                }}
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                                  task.status === 'done' 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'border-slate-300 hover:border-slate-400'
                                }`}
                                title={task.status === 'done' ? 'Mark uncompleted' : 'Mark as done'}
                              >
                                {task.status === 'done' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>

                              <div className="min-w-0 flex-1">
                                <h4 className={`text-sm font-medium leading-snug group-hover:text-slate-700 transition truncate ${
                                  task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}>
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Row Meta Chips & Delete Button */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Labels */}
                              <div className="hidden sm:flex items-center gap-1">
                                {task.labels.map((lbl, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getLabelStyle(lbl)}`}
                                  >
                                    {lbl}
                                  </span>
                                ))}
                              </div>

                              {/* Priority */}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                task.priority === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                task.priority === 'normal' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                {task.priority}
                              </span>

                              {/* Assignee */}
                              <div className="w-28 truncate text-right">
                                {assignee ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                    <span 
                                      className="w-2 h-2 rounded-full flex-shrink-0" 
                                      style={{ backgroundColor: assignee.color }} 
                                    />
                                    <span className="truncate">{assignee.name}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Unassigned</span>
                                )}
                              </div>

                              {/* Due Date */}
                              <div className="w-24 text-right">
                                {task.due_date ? (
                                  <span className={`text-xs font-medium ${
                                    isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                                  }`}>
                                    {formatDueDate(task.due_date)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </div>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={(e) => void handleDeleteTask(task.id, task.title, e)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition cursor-pointer"
                                title="Delete task"
                                aria-label="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {groupTasks.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          No tasks in {col.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: MILESTONES (Dynamic Studio Release Roadmap & Tracks) */}
          {activeView === 'milestones' && (
            <div className="space-y-6">
              {/* Milestones Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Studio Release Milestones & Tracks</h2>
                  <p className="text-xs text-slate-500">Live development velocity and track deliverable completion computed directly from active tasks.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal('todo')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Task</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('board')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <span>Open Kanban Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* OVERALL SPRINT 4 MILESTONE HERO CARD */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                        <Flame className="w-4 h-4" />
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                        Sprint 4 Active Milestone & Velocity
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        milestoneData.sprint.pct === 100 && milestoneData.sprint.total > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : milestoneData.sprint.total === 0
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {milestoneData.sprint.pct === 100 && milestoneData.sprint.total > 0
                          ? 'Milestone Complete'
                          : milestoneData.sprint.total === 0
                            ? 'Workspace Empty'
                            : 'Active Sprint'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Overall game release velocity across all active tickets, bugs, code commits, and asset pipeline tasks.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-slate-900 font-mono">
                        {milestoneData.sprint.pct}%
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        Completion Rate
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 p-0.5">
                    <div 
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${milestoneData.sprint.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">
                      {milestoneData.sprint.done} of {milestoneData.sprint.total} tasks completed
                    </span>
                    <span>
                      {milestoneData.sprint.total - milestoneData.sprint.done} tasks remaining in scope
                    </span>
                  </div>
                </div>

                {/* Sprint Stage KPI Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Backlog (To Do)</div>
                    <div className="text-base font-bold text-slate-800">{milestoneData.sprint.todo}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                    <div className="text-[10px] uppercase font-bold text-indigo-600">In Progress</div>
                    <div className="text-base font-bold text-indigo-900">{milestoneData.sprint.inProgress}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100">
                    <div className="text-[10px] uppercase font-bold text-amber-700">In Review</div>
                    <div className="text-base font-bold text-amber-900">{milestoneData.sprint.inReview}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Done / Shipped</div>
                    <div className="text-base font-bold text-emerald-900">{milestoneData.sprint.done}</div>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    milestoneData.sprint.overdue > 0 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <div className="text-[10px] uppercase font-bold">Overdue Tickets</div>
                    <div className="text-base font-bold">{milestoneData.sprint.overdue}</div>
                  </div>
                </div>
              </div>

              {/* THREE DYNAMIC TRACK CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {milestoneData.tracks.map((track) => (
                  <div 
                    key={track.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${track.badgeStyle}`}>
                          {track.total === 0 
                            ? 'No Tasks' 
                            : track.pct === 100 
                              ? 'Track Complete' 
                              : `${track.pct}% Complete`}
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          {track.done}/{track.total} done
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {track.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                          {track.description}
                        </p>
                      </div>

                      {/* Track Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>Track Progress</span>
                          <span className="font-bold font-mono text-slate-900">{track.pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full ${track.progressBg} transition-all duration-300`}
                            style={{ width: `${track.pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{track.inProgress} in progress · {track.inReview} review</span>
                          <span>{track.todo} backlog</span>
                        </div>
                      </div>
                    </div>

                    {/* Track Tasks Preview */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Tasks in Track ({track.tasks.length})</span>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal('todo', track.defaultLabel)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>

                      {track.tasks.length === 0 ? (
                        <div className="py-6 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200 space-y-2">
                          <p className="text-xs text-slate-400">No active tasks in this track</p>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal('todo', track.defaultLabel)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-indigo-600 border border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add {track.defaultLabel} Task</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {track.tasks.slice(0, 4).map((task) => {
                            const assignee = task.assignee_id ? memberMap.get(task.assignee_id) : null;
                            const isOverdue = isDueDateOverdue(task.due_date, task.status);

                            return (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/70 hover:border-indigo-200 cursor-pointer transition text-xs group"
                                title={`Click to view details for "${task.title}"`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span 
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      task.priority === 'high' 
                                        ? 'bg-rose-500' 
                                        : task.priority === 'normal' 
                                          ? 'bg-indigo-500' 
                                          : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="truncate font-medium text-slate-800 group-hover:text-slate-900">
                                    {task.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isOverdue && (
                                    <span className="text-[10px] text-rose-600 font-bold">!</span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                    task.status === 'done'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : task.status === 'in_progress'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : task.status === 'in_review'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {COLUMNS.find(c => c.id === task.status)?.title}
                                  </span>
                                  {assignee && (
                                    <span 
                                      className="w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: assignee.color }}
                                      title={assignee.name}
                                    >
                                      {assignee.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {track.tasks.length > 4 && (
                            <button
                              type="button"
                              onClick={() => {
                                setLabelFilter(track.defaultLabel);
                                setActiveView('board');
                              }}
                              className="w-full text-center py-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                            >
                              + {track.tasks.length - 4} more in track (filter board)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-over Task Detail Drawer (Clean Light Mode) */}
      {selectedTask && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={handleCloseDrawer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          <div 
            className="w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  #{selectedTask.id.slice(0, 8)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {COLUMNS.find(c => c.id === selectedTask.status)?.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDeleteTask(selectedTask.id, selectedTask.title)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition cursor-pointer"
                  aria-label="Close task drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body: Two Column Layout */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column (65%): Title, Description, Comments Discussion */}
              <div className="md:col-span-7 p-6 space-y-6">
                <div>
                  <h2 id="drawer-title" className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                    {selectedTask.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>

                {/* Task Comments Discussion */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                        Discussion ({taskComments.length})
                      </h3>
                    </div>
                    {loadingExtras && (
                      <span className="text-[10px] text-slate-400 animate-pulse">Loading notes...</span>
                    )}
                  </div>

                  {/* Comments Feed */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {taskComments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-800">{comment.author_name}</span>
                          <span className="text-[10px] text-slate-400">{formatRelativeTime(comment.created_at)}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}

                    {taskComments.length === 0 && !loadingExtras && (
                      <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No comments yet. Leave a note below.
                      </div>
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        placeholder="Your name (e.g. Lead Dev)"
                        className="w-1/2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment or note..."
                        className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 placeholder-slate-400 outline-none resize-none"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !commentText.trim()}
                        className="absolute right-2.5 bottom-3 text-indigo-600 hover:text-indigo-800 disabled:opacity-40 cursor-pointer"
                        title="Submit comment"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column (35%): Properties & Activity Log Timeline */}
              <div className="md:col-span-5 p-6 space-y-6 bg-slate-50/70">
                {/* Properties Box */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                    Properties
                  </h3>

                  {/* Status Property */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => handleUpdateDrawerField('status', e.target.value, 'Status')}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 outline-none"
                    >
                      {COLUMNS.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Property */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Priority
                    </label>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => handleUpdateDrawerField('priority', e.target.value, 'Priority')}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 outline-none capitalize"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Assignee Property */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500">
                        Assignee
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsMemberModalOpen(true)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium"
                      >
                        + Add Member
                      </button>
                    </div>
                    <select
                      value={selectedTask.assignee_id || ''}
                      onChange={(e) => handleUpdateDrawerField('assignee_id', e.target.value || null, 'Assignee')}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 outline-none"
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date Property */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={selectedTask.due_date || ''}
                      onChange={(e) => handleUpdateDrawerField('due_date', e.target.value || null, 'Due Date')}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  {/* Labels Property */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                      Labels
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_LABELS.map(lbl => {
                        const isSelected = selectedTask.labels.includes(lbl.name);
                        return (
                          <button
                            key={lbl.name}
                            type="button"
                            onClick={() => {
                              const next = isSelected 
                                ? selectedTask.labels.filter(l => l !== lbl.name)
                                : [...selectedTask.labels, lbl.name];
                              void handleUpdateDrawerField('labels', next, 'Labels');
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                              isSelected
                                ? `${getLabelStyle(lbl.name)} ring-1 ring-indigo-500/30`
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {lbl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Activity Log Audit Timeline */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                      Activity Log
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {taskLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-slate-700">{log.action}</p>
                          <span className="text-[10px] text-slate-400">{formatRelativeTime(log.created_at)}</span>
                        </div>
                      </div>
                    ))}

                    {taskLogs.length === 0 && !loadingExtras && (
                      <p className="text-xs text-slate-400">No activity recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgraded Clean Light-Mode Create Task Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleCloseCreateModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h3 id="modal-title" className="text-base font-semibold text-slate-900 tracking-tight">
                  Create New Task
                </h3>
                <p className="text-xs text-slate-500">Add an issue or task to the sprint workspace</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={submitting}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title Field */}
              <div>
                <label htmlFor="task-title" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Optimize particle draw calls in arena scene"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="task-desc" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="task-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context, reproduction steps, or asset notes..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm text-slate-900 placeholder-slate-400 outline-none transition resize-none"
                />
              </div>

              {/* Column Status & Priority Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-status" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Target Column
                  </label>
                  <select
                    id="task-status"
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-sm text-slate-800 outline-none transition"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['low', 'normal', 'high'] as TaskPriority[]).map((p) => {
                      const isActive = priority === p;
                      const activeStyles = 
                        p === 'high' ? 'bg-rose-50 border-rose-300 text-rose-700' :
                        p === 'normal' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                        'bg-indigo-50 border-indigo-300 text-indigo-700';

                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-1.5 text-xs font-semibold uppercase rounded-md border transition cursor-pointer text-center ${
                            isActive
                              ? activeStyles
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Assignee & Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="task-assignee" className="block text-xs font-medium text-slate-700">
                      Assignee
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsMemberModalOpen(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium"
                    >
                      + New Member
                    </button>
                  </div>
                  <select
                    id="task-assignee"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-sm text-slate-800 outline-none transition"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="task-duedate" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Due Date
                  </label>
                  <input
                    id="task-duedate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-sm text-slate-800 outline-none transition"
                  />
                </div>
              </div>

              {/* Label Chips Multi-Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Taxonomy Labels
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.map((lbl) => {
                    const isSelected = selectedLabels.includes(lbl.name);
                    return (
                      <button
                        key={lbl.name}
                        type="button"
                        onClick={() => toggleLabel(lbl.name)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? `${getLabelStyle(lbl.name)} ring-1 ring-indigo-500/30`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        {lbl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? 'Creating...' : '+ Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Team Member Modal (Clean Light Mode) */}
      {isMemberModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleCloseMemberModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h3 id="member-modal-title" className="text-base font-semibold text-slate-900 tracking-tight">
                  Add Team Member
                </h3>
                <p className="text-xs text-slate-500">Expand the studio roster for task assignments</p>
              </div>
              <button
                type="button"
                onClick={handleCloseMemberModal}
                disabled={submittingMember}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-6 space-y-4">
              {memberFormError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{memberFormError}</span>
                </div>
              )}

              <div>
                <label htmlFor="member-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="member-name"
                  type="text"
                  autoFocus
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g., Sarah Vance"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="member-role" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Role / Discipline
                </label>
                <input
                  id="member-role"
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="e.g., Lead Graphics Programmer"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Avatar Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {STUDIO_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewMemberColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        newMemberColor === c ? 'scale-115 ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseMemberModal}
                  disabled={submittingMember}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMember}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {submittingMember ? 'Adding...' : '+ Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
