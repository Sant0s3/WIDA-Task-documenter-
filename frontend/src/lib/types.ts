export interface Employee {
  id: number;
  name: string;
  role: 'designer' | 'animator';
  active: boolean;
  created_at: string;
}

export interface EmployeeWithStats extends Employee {
  total_activities: number;
  total_tasks: number;
  completed_tasks: number;
  this_week_activities: number;
}

export interface Task {
  id: number;
  title: string;
  employee_id?: number;
  employee_name?: string;
  start_date?: string;
  due_date?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  expected_duration?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAnalytics extends Task {
  days_elapsed?: number;
  days_remaining?: number;
  is_overdue: boolean;
  risk_level: 'on_track' | 'at_risk' | 'overdue';
}

export interface EntityType {
  id: number;
  name: string;
  display_name: string;
}

export interface ActionType {
  id: number;
  name: string;
  display_name: string;
}

export interface DailyActivity {
  id: number;
  employee_id: number;
  employee_name?: string;
  task_id?: number;
  entity_type_id: number;
  entity_type_name?: string;
  action_type_id: number;
  action_type_name?: string;
  quantity: number;
  unit?: 'items' | 'seconds' | 'minutes';
  activity_date: string;
  notes?: string;
  source_text?: string;
  created_at: string;
}

export interface DashboardStats {
  today_activities: number;
  total_activities: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  total_employees: number;
  active_employees: number;
}

export interface EmployeePerformance {
  employee_id: number;
  employee_name: string;
  total_activities: number;
  total_quantity: number;
}

export interface EntityBreakdown {
  entity_name: string;
  total_quantity: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  employee_performance: EmployeePerformance[];
  entity_breakdown: EntityBreakdown[];
  recent_activities: DailyActivity[];
  activity_trend: { date: string; count: number }[];
}

export interface ReportSummary {
  period: string;
  total_activities: number;
  total_quantity: number;
  by_employee: { name: string; activities: number; quantity: number }[];
  by_entity: { name: string; quantity: number }[];
  by_action: { name: string; quantity: number }[];
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_overdue: number;
}

export interface ComparisonReport {
  current_period: ReportSummary;
  previous_period: ReportSummary;
  change_percentage: number;
}

export interface ParsedActivity {
  employee_name: string;
  employee_id?: number;
  entity: string;
  entity_id?: number;
  action: string;
  action_id?: number;
  quantity: number;
  unit?: 'items' | 'seconds' | 'minutes';
}

export interface AIParseResponse {
  success: boolean;
  activities: ParsedActivity[];
  needs_confirmation: boolean;
  confirmation_message?: string;
  unknown_employees: string[];
  unknown_entities: string[];
  unknown_actions: string[];
  similar_employees: Record<string, string[]>;
}
