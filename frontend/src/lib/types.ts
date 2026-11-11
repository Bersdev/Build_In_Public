export type Priority = "low" | "medium" | "high";

/** Plano proposto pela IA a partir de um CSV (rota /imports/analyze). */
export interface ImportPlan {
  roadmap: {
    title: string;
    technology: string | null;
    description: string | null;
    stages: { title: string; items: { title: string; url: string | null; notes: string | null }[] }[];
  } | null;
  goals: { title: string; description: string | null; kind: GoalKind; target_value: number; due_date: string | null }[];
  projects: { name: string; description: string | null; objective: string | null; technologies: string[]; due_date: string | null }[];
  tasks: {
    title: string;
    description: string | null;
    priority: Priority;
    due_date: string | null;
    project: string | null;
    technology: string | null;
  }[];
}

export interface ImportResult {
  learning_path_id: number | null;
  goals: number;
  projects: number;
  tasks: number;
}
export type ProjectStatus = "planning" | "in_progress" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type CourseStatus = "planned" | "in_progress" | "completed";
export type GoalKind = "weekly_study_hours" | "total_study_hours" | "completed_projects" | "completed_courses" | "manual";

export interface User {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  career_goal: string | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  timezone: string;
  created_at: string;
  interests: string[];
}

export interface Settings {
  theme: "dark" | "light" | "system";
  default_task_view: "list" | "kanban";
  email_notifications: boolean;
}

export interface StudySession {
  id: number;
  study_date: string;
  duration_minutes: number;
  technology: string | null;
  notes: string | null;
  journal_entry_id: number | null;
  created_at: string;
}

export interface JournalEntry {
  id: number;
  title: string;
  entry_date: string;
  description: string | null;
  duration_minutes: number | null;
  language: string | null;
  difficulties: string | null;
  errors: string | null;
  solutions: string | null;
  key_learnings: string | null;
  project_id: number | null;
  project_name: string | null;
  technologies: string[];
  tags: string[];
  categories: string[];
}

export interface CalendarDay {
  date: string;
  count: number;
}

export interface Technology {
  id: number;
  name: string;
  study_minutes: number;
  journal_entries: number;
  projects: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  project_id: number | null;
  project_name: string | null;
  technology: string | null;
  is_overdue: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  objective: string | null;
  image_url: string | null;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  progress_percent: number;
  github_url: string | null;
  demo_url: string | null;
  learnings: string | null;
  technologies: string[];
  completed_at: string | null;
}

export interface ProjectUpdate {
  id: number;
  kind: string;
  content: string;
  created_at: string;
}

export interface JournalSummary {
  id: number;
  title: string;
  entry_date: string;
  key_learnings: string | null;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  updates: ProjectUpdate[];
  journal_entries: JournalSummary[];
  tasks_total: number;
  tasks_done: number;
}

export interface Course {
  id: number;
  title: string;
  provider: string | null;
  url: string | null;
  status: CourseStatus;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
}

export interface LearningItem {
  id: number;
  title: string;
  url: string | null;
  notes: string | null;
  course_id: number | null;
  course_title: string | null;
  completed_at: string | null;
}

export interface LearningStage {
  id: number;
  title: string;
  items: LearningItem[];
}

export interface LearningPath {
  id: number;
  title: string;
  description: string | null;
  technology: string | null;
  start_date: string | null;
  target_date: string | null;
  total_items: number;
  completed_items: number;
  progress_percent: number;
}

export interface LearningPathDetail extends LearningPath {
  stages: LearningStage[];
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  kind: GoalKind;
  target_value: number;
  manual_value: number;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  current_value: number;
  progress_percent: number;
  is_reached: boolean;
}

export interface Activity {
  id: number;
  kind: string;
  title: string;
  entity_type: string | null;
  entity_id: number | null;
  occurred_at: string;
}

export interface DailyPoint {
  date: string;
  minutes: number;
}

export interface WeeklyPoint {
  week_start: string;
  minutes: number;
}

export interface MonthlyPoint {
  month: string;
  minutes: number;
}

export interface Dashboard {
  total_minutes: number;
  week_minutes: number;
  study_days: number;
  projects_in_progress: number;
  projects_completed: number;
  tasks_pending: number;
  current_goals: Goal[];
  recent_activity: Activity[];
  technologies: Technology[];
  daily_minutes: DailyPoint[];
  weekly_minutes: WeeklyPoint[];
  monthly_minutes: MonthlyPoint[];
  recent_learnings: JournalSummary[];
  xp: number;
  level: number;
  current_streak: number;
}

export interface Evolution {
  total_minutes: number;
  study_days: number;
  study_days_last_30: number;
  goals_completed: number;
  projects_completed: number;
  technologies_explored: number;
  weekly_minutes: WeeklyPoint[];
  monthly_minutes: MonthlyPoint[];
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  threshold: number;
  current: number;
  unlocked_at: string | null;
}

export interface Gamification {
  xp: number;
  level: number;
  level_start_xp: number;
  next_level_xp: number;
  current_streak: number;
  longest_streak: number;
  achievements: Achievement[];
  rules: { action: string; xp: string }[];
}
