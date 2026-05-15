import type {
  AttendanceStatusValue,
  BrainCategoryValue,
  BurnoutRiskValue,
  TaskPriorityValue,
  TaskStatusValue,
} from './domain';

export interface PersistedUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistedSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistedTask {
  id: string;
  userId: string;
  taskName: string;
  date: string;
  duration: number;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  client: string;
  technologies: string[];
  tags: string[];
  startTime: Date | null;
  endTime: Date | null;
  totalTimeSpent: number | null;
  isTimeTracked: boolean;
  manualTimeOverride: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistedAttendance {
  id: string;
  userId: string;
  date: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatusValue | string;
  breaks: unknown;
  deepWorkSessions: unknown;
  timeline: unknown;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  deepWorkMinutes: number;
  overtimeMinutes: number;
  tasksCompleted: number;
  productivityScore: number;
  burnoutRisk: BurnoutRiskValue | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistedBrainNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: BrainCategoryValue | string;
  tags: string[];
  keywords: string[];
  relatedNotes: unknown;
  relatedTasks: unknown;
  favorite: boolean;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}
