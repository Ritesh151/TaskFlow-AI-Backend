CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "BrainCategory" AS ENUM ('idea', 'bug', 'learning', 'snippet', 'thought', 'research');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskName" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "duration" DOUBLE PRECISION NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'pending',
  "priority" "TaskPriority" NOT NULL,
  "client" TEXT NOT NULL DEFAULT '',
  "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "startTime" TIMESTAMP(3),
  "endTime" TIMESTAMP(3),
  "totalTimeSpent" INTEGER,
  "isTimeTracked" BOOLEAN NOT NULL DEFAULT false,
  "manualTimeOverride" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_userId_date_idx" ON "Task"("userId", "date");
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_priority_idx" ON "Task"("userId", "priority");

CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "checkIn" TIMESTAMP(3),
  "checkOut" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'absent',
  "breaks" JSONB NOT NULL DEFAULT '[]',
  "deepWorkSessions" JSONB NOT NULL DEFAULT '[]',
  "timeline" JSONB NOT NULL DEFAULT '[]',
  "totalWorkMinutes" INTEGER NOT NULL DEFAULT 0,
  "totalBreakMinutes" INTEGER NOT NULL DEFAULT 0,
  "deepWorkMinutes" INTEGER NOT NULL DEFAULT 0,
  "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
  "productivityScore" INTEGER NOT NULL DEFAULT 0,
  "burnoutRisk" TEXT NOT NULL DEFAULT 'low',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");
CREATE INDEX "Attendance_userId_date_idx" ON "Attendance"("userId", "date");

CREATE TABLE "BrainNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" "BrainCategory" NOT NULL DEFAULT 'thought',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relatedNotes" JSONB NOT NULL DEFAULT '[]',
  "relatedTasks" JSONB NOT NULL DEFAULT '[]',
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrainNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrainNote_userId_category_idx" ON "BrainNote"("userId", "category");
CREATE INDEX "BrainNote_userId_favorite_idx" ON "BrainNote"("userId", "favorite");
CREATE INDEX "BrainNote_userId_pinned_idx" ON "BrainNote"("userId", "pinned");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrainNote"
  ADD CONSTRAINT "BrainNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
