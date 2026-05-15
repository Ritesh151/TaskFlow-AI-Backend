export type TaskStatusValue = 'pending' | 'in_progress' | 'completed';
export type TaskPriorityValue = 'low' | 'medium' | 'high';
export type AttendanceStatusValue = 'present' | 'absent' | 'half-day' | 'no-data';
export type BurnoutRiskValue = 'low' | 'medium' | 'high';
export type BreakTypeValue = 'lunch' | 'tea' | 'idle' | 'custom';
export type BrainCategoryValue = 'idea' | 'bug' | 'learning' | 'snippet' | 'thought' | 'research';

export type TimelineActionValue =
  | 'check-in'
  | 'check-out'
  | 'break-start'
  | 'break-end'
  | 'task-completed'
  | 'deep-work-start'
  | 'deep-work-end';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthSessionPayload {
  user: ApiUser;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface TaskDto {
  taskId: string;
  taskName: string;
  date: string;
  duration: number;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  client: string;
  technologies: string[];
  createdAt: string;
  updatedAt: string;
  startTime: string | null;
  endTime: string | null;
  totalTimeSpent: number | null;
  tags?: string[];
  isTimeTracked?: boolean;
  manualTimeOverride?: boolean;
}

export interface NextBestTaskDto {
  task: TaskDto;
  reason: string;
}

export interface WorkloadAnalysisDto {
  date: string;
  totalHours: number;
  pendingHours: number;
  completedHours: number;
  totalTasks: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  isOverloaded: boolean;
  overloadPercent: number;
  status: 'empty' | 'normal' | 'heavy' | 'overloaded';
  message: string;
  suggestions: string[];
}

export interface DailySummaryDto {
  date: string;
  completed: TaskDto[];
  pending: TaskDto[];
  totalTime: number;
  completedTime: number;
  completionRate: number;
  productivityScore: number;
  smartSummary: string;
  generatedAt: string;
}

export interface WeeklyDataPointDto {
  date: string;
  total: number;
  completed: number;
  hours: number;
  completedHours: number;
}

export interface InsightsDto {
  weeklyData: WeeklyDataPointDto[];
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  topTechnologies: Array<{ name: string; count: number }>;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  overallCompletionRate: number;
}

export interface AttendanceBreakDto {
  breakId: string;
  start: string;
  end: string | null;
  type: BreakTypeValue;
}

export interface DeepWorkSessionDto {
  sessionId: string;
  start: string;
  end: string | null;
}

export interface TimelineEntryDto {
  time: string;
  action: TimelineActionValue;
}

export interface AttendanceRecordDto {
  attendanceId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatusValue;
  breaks: AttendanceBreakDto[];
  deepWorkSessions: DeepWorkSessionDto[];
  timeline: TimelineEntryDto[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  deepWorkMinutes: number;
  overtimeMinutes: number;
  tasksCompleted: number;
  productivityScore: number;
  burnoutRisk: BurnoutRiskValue;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceWeeklyStatDto {
  date: string;
  workMinutes: number;
  breakMinutes: number;
  deepWorkMinutes: number;
  overtimeMinutes: number;
  productivityScore: number;
  status: AttendanceStatusValue;
}

export interface AttendanceInsightsDto {
  avgCheckInTime: string | null;
  avgWorkDuration: number;
  avgBreakDuration: number;
  mostProductiveWindow: string | null;
  currentStreak: number;
  longestStreak: number;
  overtimeFrequency: number;
  consistencyScore: number;
  totalDaysTracked: number;
  totalWorkHours: number;
  burnoutRisk: BurnoutRiskValue;
  recommendations: string[];
}

export interface AttendanceStatsDto {
  weeklyStats: AttendanceWeeklyStatDto[];
  insights: Omit<AttendanceInsightsDto, 'burnoutRisk' | 'recommendations'>;
}

export interface CalendarDayDto {
  date: string;
  status: AttendanceStatusValue;
}

export interface CalendarMonthDto {
  year: number;
  month: number;
  monthName: string;
  days: CalendarDayDto[];
}

export interface BrainRelatedNoteDto {
  brainId: string;
  title: string;
  category: BrainCategoryValue;
  score: number;
  sharedKeywords: string[];
  sharedTags: string[];
  reason: string;
}

export interface BrainRelatedTaskDto {
  taskId: string;
  taskName: string;
  date: string;
  status: TaskStatusValue;
  score: number;
  sharedKeywords: string[];
  technologies: string[];
  reason: string;
}

export interface BrainNoteDto {
  brainId: string;
  title: string;
  content: string;
  category: BrainCategoryValue;
  tags: string[];
  keywords: string[];
  relatedNotes: BrainRelatedNoteDto[];
  relatedTasks: BrainRelatedTaskDto[];
  favorite: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrainClusterDto {
  clusterId: string;
  label: string;
  noteCount: number;
  categories: BrainCategoryValue[];
  noteIds: string[];
  keywords: string[];
  intensity: number;
}

export interface BrainInsightsDto {
  totalNotes: number;
  linkedNotes: number;
  ideasCaptured: number;
  codingSnippets: number;
  favorites: number;
  pinned: number;
  mostConnectedNote: BrainNoteDto | null;
  topTechnologies: Array<{ name: string; count: number }>;
  recentTopics: string[];
  streak: {
    current: number;
    longest: number;
  };
  growth: Array<{ date: string; count: number }>;
}

export interface BrainDashboardDto {
  notes: BrainNoteDto[];
  totalMatches: number;
  stats: BrainInsightsDto;
  clusters: BrainClusterDto[];
  availableTags: string[];
  availableKeywords: string[];
}

export interface BrainGraphNodeDto {
  id: string;
  entityId: string;
  type: 'note' | 'task';
  label: string;
  category: BrainCategoryValue | 'task';
  favorite: boolean;
  pinned: boolean;
  weight: number;
  linkCount: number;
  keywords: string[];
  status?: TaskStatusValue;
  date?: string;
}

export interface BrainGraphLinkDto {
  id: string;
  source: string;
  target: string;
  strength: number;
  kind: 'note' | 'task';
}

export interface BrainGraphDto {
  nodes: BrainGraphNodeDto[];
  links: BrainGraphLinkDto[];
  clusters: BrainClusterDto[];
}
