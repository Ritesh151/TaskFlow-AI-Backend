import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import type {
  BrainCategoryValue,
  BrainClusterDto,
  BrainDashboardDto,
  BrainGraphDto,
  BrainNoteDto,
  BrainRelatedTaskDto,
  TaskDto,
} from '../types/domain';
import type { PersistedBrainNote } from '../types/persistence';
import { listTasks } from './task.service';

const BRAIN_CATEGORIES: BrainCategoryValue[] = ['idea', 'bug', 'learning', 'snippet', 'thought', 'research'];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'before', 'between', 'both', 'but',
  'by', 'can', 'code', 'did', 'do', 'does', 'for', 'from', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'just', 'me', 'more', 'my', 'need', 'new', 'not', 'of', 'on', 'or',
  'our', 'out', 'should', 'so', 'some', 'task', 'tasks', 'that', 'the', 'their', 'them',
  'there', 'this', 'those', 'to', 'up', 'use', 'want', 'was', 'we', 'what', 'when', 'where',
  'which', 'who', 'will', 'with', 'you', 'your',
]);

const TECHNOLOGY_KEYWORDS = [
  'api', 'auth', 'axios', 'bug', 'css', 'dashboard', 'database', 'd3', 'docker', 'eslint',
  'express', 'figma', 'firebase', 'framer motion', 'frontend', 'graphql', 'html', 'javascript',
  'json', 'markdown', 'mongodb', 'mysql', 'next js', 'next.js', 'node', 'node js',
  'performance', 'postgres', 'prisma', 'react', 'redis', 'rest', 'snippet', 'sql', 'supabase',
  'tailwind', 'tailwindcss', 'testing', 'three', 'typescript', 'ui', 'ux', 'vercel', 'vite',
  'websocket', 'zod',
];

const CATEGORY_HINTS: Record<BrainCategoryValue, string[]> = {
  bug: ['bug', 'issue', 'broken', 'fix', 'error', 'crash', 'regression'],
  snippet: ['snippet', 'function', 'component', 'hook', 'const', 'import', 'class', '```'],
  learning: ['learn', 'docs', 'article', 'tutorial', 'course', 'guide', 'resource'],
  research: ['research', 'compare', 'benchmark', 'investigate', 'explore', 'analysis'],
  idea: ['idea', 'feature', 'build', 'ship', 'improve', 'experiment', 'prototype'],
  thought: ['thought', 'note', 'remember', 'journal', 'mindset'],
};

type DashboardOptions = {
  sort?: 'newest' | 'oldest' | 'favorites' | 'most-linked';
  category?: BrainCategoryValue | 'all';
  favoritesOnly?: boolean;
  pinnedOnly?: boolean;
  query?: string;
};

function normalizeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[`_*()[\]{}<>~]/g, ' ')
    .replace(/[^\w\s.#/+:-]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKeyword(value: string) {
  return normalizeText(value).replace(/\bjs\b/g, 'js').replace(/\bts\b/g, 'ts').trim();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function clampArray<T>(values: T[], max: number) {
  return values.slice(0, max);
}

function intersect(left: string[], right: string[]) {
  const set = new Set(right);
  return left.filter((item) => set.has(item));
}

function parseHashtags(text: string) {
  return uniqueStrings(
    [...String(text || '').matchAll(/#([a-z0-9][a-z0-9-]*)/gi)].map((match) => normalizeKeyword(match[1] ?? '')),
  );
}

function titleCase(value: string) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function inferCategory(title: string, content: string, tags: string[] = []): BrainCategoryValue {
  const haystack = normalizeText([title, content, tags.join(' ')].join(' '));
  for (const category of BRAIN_CATEGORIES) {
    if ((CATEGORY_HINTS[category] ?? []).some((hint) => haystack.includes(normalizeKeyword(hint)))) {
      return category;
    }
  }
  return 'thought';
}

function deriveTitle(title: string, content: string) {
  const rawTitle = String(title || '').trim();
  if (rawTitle) {
    return rawTitle.slice(0, 120);
  }

  const cleaned = String(content || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`{1,3}/g, '')
    .trim();

  if (!cleaned) {
    return 'Untitled note';
  }

  const firstLine = cleaned.split('\n').find(Boolean) ?? cleaned;
  return firstLine.length <= 72 ? firstLine : `${firstLine.slice(0, 69).trimEnd()}...`;
}

function extractKeywords(input: string, extraTerms: string[] = []) {
  const normalized = normalizeText(input);
  const frequency = new Map<string, number>();
  const phraseText = ` ${normalized} `;
  const phraseMatches: string[] = [];

  for (const keyword of TECHNOLOGY_KEYWORDS) {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) {
      continue;
    }
    if (phraseText.includes(` ${normalizedKeyword} `)) {
      phraseMatches.push(normalizedKeyword);
      frequency.set(normalizedKeyword, (frequency.get(normalizedKeyword) ?? 0) + 4);
    }
  }

  for (const token of normalized
    .split(/\s+/)
    .map((token) => normalizeKeyword(token))
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  for (const tag of parseHashtags(input)) {
    frequency.set(tag, (frequency.get(tag) ?? 0) + 3);
  }

  for (const term of extraTerms) {
    const normalizedTerm = normalizeKeyword(term);
    if (!normalizedTerm || STOP_WORDS.has(normalizedTerm)) {
      continue;
    }
    frequency.set(normalizedTerm, (frequency.get(normalizedTerm) ?? 0) + 3);
  }

  const ranked = [...frequency.entries()]
    .filter(([keyword]) => keyword.length >= 3)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([keyword]) => keyword);

  return clampArray(uniqueStrings([...phraseMatches, ...ranked]), 18);
}

function extractTechnologies(keywords: string[]) {
  const normalizedTechnologySet = new Set(TECHNOLOGY_KEYWORDS.map((keyword) => normalizeKeyword(keyword)));
  return keywords.filter((keyword) => normalizedTechnologySet.has(normalizeKeyword(keyword)));
}

function buildTaskKeywords(task: TaskDto) {
  return extractKeywords(
    [task.taskName, task.client, ...(task.technologies ?? []), ...(task.tags ?? [])].join(' '),
    [...(task.technologies ?? []), ...(task.tags ?? [])],
  );
}

function noteSearchText(note: BrainNoteDto) {
  return normalizeText([note.title, note.content, note.category, ...note.tags, ...note.keywords].join(' '));
}

function normalizeTags(tags: string[]) {
  return clampArray(
    uniqueStrings(
      tags
        .map((tag) => normalizeKeyword(tag))
        .filter((tag) => Boolean(tag) && tag.length <= 24),
    ),
    10,
  );
}

function serializeRawNote(note: PersistedBrainNote): BrainNoteDto {
  const category = BRAIN_CATEGORIES.includes(note.category as BrainCategoryValue)
    ? (note.category as BrainCategoryValue)
    : 'thought';

  return {
    brainId: note.id,
    title: note.title,
    content: note.content,
    category,
    tags: note.tags,
    keywords: note.keywords,
    relatedNotes: Array.isArray(note.relatedNotes) ? (note.relatedNotes as BrainNoteDto['relatedNotes']) : [],
    relatedTasks: Array.isArray(note.relatedTasks) ? (note.relatedTasks as BrainNoteDto['relatedTasks']) : [],
    favorite: note.favorite,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function enrichNote(note: BrainNoteDto): BrainNoteDto {
  const tags = normalizeTags([...note.tags, ...parseHashtags(`${note.title} ${note.content}`)]);
  const title = deriveTitle(note.title, note.content);
  const content = String(note.content || '').trim();
  const category = BRAIN_CATEGORIES.includes(note.category) ? note.category : inferCategory(title, content, tags);
  const keywords = extractKeywords(`${title} ${content}`, tags);

  return {
    ...note,
    title,
    content,
    category,
    tags,
    keywords,
    relatedNotes: Array.isArray(note.relatedNotes) ? note.relatedNotes : [],
    relatedTasks: Array.isArray(note.relatedTasks) ? note.relatedTasks : [],
    favorite: Boolean(note.favorite),
    pinned: Boolean(note.pinned),
  };
}

function buildRelatedTaskLink(note: BrainNoteDto, task: TaskDto & { _brainKeywords: string[] }): BrainRelatedTaskDto | null {
  const sharedKeywords = intersect(note.keywords, task._brainKeywords);
  const sharedTech = intersect(extractTechnologies(note.keywords), task._brainKeywords);

  let score = 0;
  score += sharedKeywords.length * 14;
  score += sharedTech.length * 10;
  if ((task.tags ?? []).some((tag) => note.tags.includes(normalizeKeyword(tag)))) {
    score += 12;
  }
  if (note.category === 'bug' && /bug|fix|issue|error/i.test(task.taskName)) {
    score += 16;
  }
  if (note.category === 'snippet' && task.technologies.length > 0) {
    score += 8;
  }
  if (note.category === 'research' && /investigate|analy|compare|explore/i.test(task.taskName)) {
    score += 10;
  }
  if (score < 14) {
    return null;
  }

  const reasonParts: string[] = [];
  if (sharedTech.length > 0) {
    reasonParts.push(`${titleCase(sharedTech[0] ?? '')} task`);
  }
  if (sharedKeywords.length > 0) {
    reasonParts.push(`shares ${titleCase(sharedKeywords[0] ?? '')}`);
  }
  if (note.category === 'bug' && /bug|fix|issue|error/i.test(task.taskName)) {
    reasonParts.push('bug context');
  }

  return {
    taskId: task.taskId,
    taskName: task.taskName,
    date: task.date,
    status: task.status,
    score,
    sharedKeywords: clampArray(sharedKeywords, 6),
    technologies: clampArray(sharedTech.length > 0 ? sharedTech : task.technologies, 5),
    reason: reasonParts.join(' · ') || 'related task context',
  };
}

function buildRelatedNoteLink(source: BrainNoteDto, candidate: BrainNoteDto) {
  const sharedKeywords = intersect(source.keywords, candidate.keywords);
  const sharedTags = intersect(source.tags, candidate.tags);
  const sharedTech = intersect(extractTechnologies(source.keywords), extractTechnologies(candidate.keywords));

  let score = 0;
  score += sharedKeywords.length * 16;
  score += sharedTags.length * 20;
  score += sharedTech.length * 12;
  if (source.category === candidate.category) {
    score += 10;
  }
  if (score < 14) {
    return null;
  }

  const reasonParts: string[] = [];
  if (sharedTech.length > 0) {
    reasonParts.push(`${titleCase(sharedTech[0] ?? '')} overlap`);
  }
  if (sharedKeywords.length > 0) {
    reasonParts.push(`shared keyword ${titleCase(sharedKeywords[0] ?? '')}`);
  }
  if (sharedTags.length > 0) {
    reasonParts.push(`tag #${sharedTags[0]}`);
  }
  if (reasonParts.length === 0 && source.category === candidate.category) {
    reasonParts.push(`${titleCase(source.category)} pattern`);
  }

  return {
    brainId: candidate.brainId,
    title: candidate.title,
    category: candidate.category,
    score,
    sharedKeywords: clampArray(sharedKeywords, 6),
    sharedTags: clampArray(sharedTags, 4),
    reason: reasonParts.join(' · ') || 'related context',
  };
}

function generateRelatedNotes(note: BrainNoteDto, notes: BrainNoteDto[], tasks: Array<TaskDto & { _brainKeywords: string[] }>) {
  const relatedNotes = notes
    .filter((candidate) => candidate.brainId !== note.brainId)
    .map((candidate) => buildRelatedNoteLink(note, candidate))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  const relatedTasks = tasks
    .map((task) => buildRelatedTaskLink(note, task))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.score - left.score || left.taskName.localeCompare(right.taskName));

  return {
    relatedNotes: clampArray(relatedNotes as BrainNoteDto['relatedNotes'], 6),
    relatedTasks: clampArray(relatedTasks as BrainNoteDto['relatedTasks'], 4),
  };
}

function syncBrainNotes(notes: BrainNoteDto[], tasks: TaskDto[]) {
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    _brainKeywords: buildTaskKeywords(task),
  }));

  const enrichedNotes = notes.map(enrichNote);
  return enrichedNotes.map((note) => {
    const { relatedNotes, relatedTasks } = generateRelatedNotes(note, enrichedNotes, normalizedTasks);
    return {
      ...note,
      relatedNotes,
      relatedTasks,
    };
  });
}

function sortNotes(notes: BrainNoteDto[], sort: DashboardOptions['sort'] = 'newest') {
  const copy = [...notes];
  copy.sort((left, right) => {
    const leftConnections = left.relatedNotes.length + left.relatedTasks.length;
    const rightConnections = right.relatedNotes.length + right.relatedTasks.length;

    if (sort === 'oldest') {
      return left.createdAt.localeCompare(right.createdAt);
    }
    if (sort === 'favorites') {
      return Number(right.favorite) - Number(left.favorite) || Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt);
    }
    if (sort === 'most-linked') {
      return rightConnections - leftConnections || Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt);
    }
    return Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt);
  });
  return copy;
}

function filterNotes(notes: BrainNoteDto[], options: DashboardOptions) {
  const query = normalizeKeyword(options.query ?? '');
  return sortNotes(
    notes.filter((note) => {
      if (options.favoritesOnly && !note.favorite) {
        return false;
      }
      if (options.pinnedOnly && !note.pinned) {
        return false;
      }
      if (options.category && options.category !== 'all' && note.category !== options.category) {
        return false;
      }
      if (!query) {
        return true;
      }
      return noteSearchText(note).includes(query);
    }),
    options.sort,
  );
}

function detectTopicClusters(notes: BrainNoteDto[]): BrainClusterDto[] {
  const frequency = new Map<string, number>();
  for (const note of notes) {
    for (const keyword of note.keywords) {
      frequency.set(keyword, (frequency.get(keyword) ?? 0) + 1);
    }
  }

  const repeatedKeywords = [...frequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8);

  const keywordClusters = repeatedKeywords.map(([keyword, count]) => {
    const clusterNotes = notes.filter((note) => note.keywords.includes(keyword));
    return {
      clusterId: `cluster-${keyword.replace(/\s+/g, '-')}`,
      label: titleCase(keyword),
      noteCount: clusterNotes.length,
      categories: uniqueStrings(clusterNotes.map((note) => note.category)) as BrainCategoryValue[],
      noteIds: clusterNotes.map((note) => note.brainId),
      keywords: clampArray(
        uniqueStrings(clusterNotes.flatMap((note) => note.keywords).filter((item) => item !== keyword)),
        5,
      ),
      intensity: Math.min(100, count * 18 + clusterNotes.length * 8),
    };
  });

  if (keywordClusters.length > 0) {
    return keywordClusters;
  }

  return BRAIN_CATEGORIES.map((category) => {
    const categoryNotes = notes.filter((note) => note.category === category);
    if (categoryNotes.length < 2) {
      return null;
    }
    return {
      clusterId: `cluster-${category}`,
      label: titleCase(category),
      noteCount: categoryNotes.length,
      categories: [category],
      noteIds: categoryNotes.map((note) => note.brainId),
      keywords: clampArray(uniqueStrings(categoryNotes.flatMap((note) => note.keywords)), 5),
      intensity: Math.min(100, categoryNotes.length * 14),
    };
  }).filter(Boolean) as BrainClusterDto[];
}

function buildGrowth(notes: BrainNoteDto[], days = 10) {
  const rows = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(start);
    day.setDate(day.getDate() - offset);
    const dayKey = day.toISOString().split('T')[0] ?? '';
    rows.push({
      date: dayKey,
      count: notes.filter((note) => note.createdAt.startsWith(dayKey)).length,
    });
  }
  return rows;
}

function buildKnowledgeStreak(notes: BrainNoteDto[]) {
  const uniqueDates = uniqueStrings(notes.map((note) => String(note.createdAt).split('T')[0] ?? '')).sort();
  if (uniqueDates.length === 0) {
    return {
      current: 0,
      longest: 0,
    };
  }

  let longest = 1;
  let currentRun = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00`);
    const current = new Date(`${uniqueDates[index]}T00:00:00`);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);
    if (diffDays === 1) {
      currentRun += 1;
      longest = Math.max(longest, currentRun);
    } else {
      currentRun = 1;
    }
  }

  let current = 1;
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    const currentDate = new Date(`${uniqueDates[index]}T00:00:00`);
    const previousDate = new Date(`${uniqueDates[index - 1]}T00:00:00`);
    const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / 86400000);
    if (diffDays === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

function buildInsights(notes: BrainNoteDto[]) {
  const totalNotes = notes.length;
  const linkedNotes = notes.filter((note) => note.relatedNotes.length + note.relatedTasks.length > 0).length;
  const ideasCaptured = notes.filter((note) => note.category === 'idea').length;
  const codingSnippets = notes.filter((note) => note.category === 'snippet').length;
  const mostConnectedNote = sortNotes(notes, 'most-linked')[0] ?? null;
  const topTechnologies = clampArray(
    [...notes.reduce((map, note) => {
      for (const tech of extractTechnologies(note.keywords)) {
        map.set(tech, (map.get(tech) ?? 0) + 1);
      }
      return map;
    }, new Map<string, number>()).entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([name, count]) => ({ name, count })),
    6,
  );

  const recentTopics = clampArray(
    uniqueStrings(sortNotes(notes, 'newest').slice(0, 8).flatMap((note) => note.keywords)),
    8,
  );

  return {
    totalNotes,
    linkedNotes,
    ideasCaptured,
    codingSnippets,
    favorites: notes.filter((note) => note.favorite).length,
    pinned: notes.filter((note) => note.pinned).length,
    mostConnectedNote,
    topTechnologies,
    recentTopics,
    streak: buildKnowledgeStreak(notes),
    growth: buildGrowth(notes),
  };
}

function buildKnowledgeGraph(notes: BrainNoteDto[]) {
  const nodes: BrainGraphDto['nodes'] = [];
  const links: BrainGraphDto['links'] = [];
  const seenLinks = new Set<string>();
  const taskNodes = new Map<string, BrainGraphDto['nodes'][number]>();

  for (const note of notes) {
    const connections = note.relatedNotes.length + note.relatedTasks.length;
    nodes.push({
      id: `note:${note.brainId}`,
      entityId: note.brainId,
      type: 'note',
      label: note.title,
      category: note.category,
      favorite: note.favorite,
      pinned: note.pinned,
      weight: Math.max(8, 14 + connections * 2),
      linkCount: connections,
      keywords: note.keywords,
    });

    for (const related of note.relatedNotes) {
      const left = note.brainId < related.brainId ? note.brainId : related.brainId;
      const right = note.brainId < related.brainId ? related.brainId : note.brainId;
      const key = `${left}:${right}`;
      if (seenLinks.has(key)) {
        continue;
      }
      seenLinks.add(key);
      links.push({
        id: `link:${key}`,
        source: `note:${note.brainId}`,
        target: `note:${related.brainId}`,
        strength: related.score,
        kind: 'note',
      });
    }

    for (const relatedTask of note.relatedTasks) {
      const taskNodeId = `task:${relatedTask.taskId}`;
      if (!taskNodes.has(taskNodeId)) {
        taskNodes.set(taskNodeId, {
          id: taskNodeId,
          entityId: relatedTask.taskId,
          type: 'task',
          label: relatedTask.taskName,
          category: 'task',
          favorite: false,
          pinned: false,
          weight: 9,
          linkCount: 1,
          keywords: relatedTask.sharedKeywords,
          status: relatedTask.status,
          date: relatedTask.date,
        });
      } else {
        const existing = taskNodes.get(taskNodeId);
        if (existing) {
          existing.linkCount += 1;
        }
      }

      links.push({
        id: `link:task:${note.brainId}:${relatedTask.taskId}`,
        source: `note:${note.brainId}`,
        target: taskNodeId,
        strength: relatedTask.score,
        kind: 'task',
      });
    }
  }

  return {
    nodes: [...nodes, ...taskNodes.values()],
    links,
  };
}

async function loadSyncedNotes(userId: string) {
  const [notes, tasks] = await Promise.all([
    prisma.brainNote.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    listTasks(userId),
  ]);

  return syncBrainNotes(notes.map(serializeRawNote), tasks);
}

async function getDashboardData(userId: string, options: DashboardOptions = {}): Promise<BrainDashboardDto> {
  const syncedNotes = await loadSyncedNotes(userId);
  const filteredNotes = filterNotes(syncedNotes, options);
  return {
    notes: filteredNotes,
    totalMatches: filteredNotes.length,
    stats: buildInsights(syncedNotes),
    clusters: detectTopicClusters(syncedNotes),
    availableTags: uniqueStrings(syncedNotes.flatMap((note) => note.tags)).sort(),
    availableKeywords: uniqueStrings(syncedNotes.flatMap((note) => note.keywords)).sort(),
  };
}

export async function getBrainDashboard(userId: string, options: DashboardOptions = {}) {
  return getDashboardData(userId, options);
}

export async function getBrainGraph(userId: string) {
  const syncedNotes = await loadSyncedNotes(userId);
  const graph = buildKnowledgeGraph(syncedNotes);
  return {
    ...graph,
    clusters: detectTopicClusters(syncedNotes),
  };
}

export async function getBrainNote(userId: string, noteId: string) {
  const notes = await loadSyncedNotes(userId);
  const note = notes.find((item) => item.brainId === noteId);
  if (!note) {
    throw notFound('Note not found');
  }
  return note;
}

export async function createBrainNote(
  userId: string,
  input: {
    title?: string;
    content?: string;
    category?: BrainCategoryValue;
    tags?: string[];
    favorite?: boolean;
    pinned?: boolean;
  },
) {
  const title = String(input.title ?? '').trim();
  const content = String(input.content ?? '').trim();
  const tags = normalizeTags(input.tags ?? []);
  const category = input.category ?? inferCategory(title, content, tags);
  const finalTitle = deriveTitle(title, content);
  const keywords = extractKeywords(`${finalTitle} ${content}`, tags);

  const note = await prisma.brainNote.create({
    data: {
      userId,
      title: finalTitle,
      content,
      category,
      tags,
      keywords,
      relatedNotes: [],
      relatedTasks: [],
      favorite: input.favorite ?? false,
      pinned: input.pinned ?? false,
    },
  });

  return getBrainNote(userId, note.id);
}

export async function updateBrainNote(
  userId: string,
  noteId: string,
  input: {
    title?: string;
    content?: string;
    category?: BrainCategoryValue;
    tags?: string[];
    favorite?: boolean;
    pinned?: boolean;
  },
) {
  const existing = await prisma.brainNote.findFirst({
    where: {
      id: noteId,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Note not found');
  }

  const title = String(input.title ?? existing.title).trim();
  const content = String(input.content ?? existing.content).trim();
  const tags = normalizeTags(input.tags ?? existing.tags);
  const category = input.category ?? inferCategory(title, content, tags);
  const finalTitle = deriveTitle(title, content);
  const keywords = extractKeywords(`${finalTitle} ${content}`, tags);

  await prisma.brainNote.update({
    where: { id: existing.id },
    data: {
      title: finalTitle,
      content,
      category,
      tags,
      keywords,
      favorite: input.favorite ?? existing.favorite,
      pinned: input.pinned ?? existing.pinned,
      updatedAt: new Date(),
    },
  });

  return getBrainNote(userId, existing.id);
}

export async function toggleBrainFavorite(userId: string, noteId: string, value?: boolean) {
  const existing = await prisma.brainNote.findFirst({
    where: {
      id: noteId,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Note not found');
  }

  await prisma.brainNote.update({
    where: { id: existing.id },
    data: {
      favorite: typeof value === 'boolean' ? value : !existing.favorite,
      updatedAt: new Date(),
    },
  });

  return getBrainNote(userId, existing.id);
}

export async function toggleBrainPin(userId: string, noteId: string, value?: boolean) {
  const existing = await prisma.brainNote.findFirst({
    where: {
      id: noteId,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Note not found');
  }

  await prisma.brainNote.update({
    where: { id: existing.id },
    data: {
      pinned: typeof value === 'boolean' ? value : !existing.pinned,
      updatedAt: new Date(),
    },
  });

  return getBrainNote(userId, existing.id);
}

export async function deleteBrainNote(userId: string, noteId: string) {
  const existing = await prisma.brainNote.findFirst({
    where: {
      id: noteId,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Note not found');
  }

  await prisma.brainNote.delete({
    where: { id: existing.id },
  });
}
