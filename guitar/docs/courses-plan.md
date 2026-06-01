# Guitar Courses — Design & Build Plan

## Philosophy

A **tutorial** is a song with embedded teaching context. Tutorials live in
`data/songs/*.json` with the optional `tutorial` field, can be put in any
folder, and play like any other song. None of that changes.

A **course** is a _curated, ordered path_ through tutorials, with:

- An explicit story arc ("first this, then this, then you'll be ready for…")
- Progress tracking (completed / current / not yet)
- The ability to jump ahead or revisit
- Module grouping so the course feels like chapters

Courses **reference** tutorial song IDs — they don't own them. So:

- The same tutorial can appear in multiple courses
- Deleting a tutorial leaves a "missing" placeholder in any course
- A tutorial outside a course is still fully usable

## Courses we ship

### Guitar Beginnings (Beginner) — 14 lessons, ~90 min

For someone who has never touched a guitar.

**Module A — Meet the Keyboard**

1. The Keyboard's Pattern
2. Octaves & Note Names

**Module B — Rhythm Before Pitch** 3. One Note, In Time 4. Counting to Four

**Module C — Your First Hand Position** 5. The C Position 6. First Melodies (Hot Cross Buns / Mary Had a Little Lamb)

**Module D — The Scale & Finding Home** 7. C Major, Up and Down 8. C is Home

**Module E — Intervals** 9. Steps vs Skips 10. Hearing 3rds & 5ths

**Module F — Chords** 11. The Major Triad 12. The Minor Triad

**Module G — White + Black Together** 13. The Black-Key Safety Net (pentatonic) 14. The Leading Tone (Für Elise's D♯)

### Keys, Modes & Color (Intermediate) — 10 lessons

1. The Major Scale Recipe (WWHWWWH)
2. C Major vs G Major (one sharp)
3. When Black Keys Take Over (E major) _(existing)_
4. Major vs Minor — One Note Changes Everything _(existing)_
5. Modes I — Dorian (white keys from D)
6. Modes II — Mixolydian (white keys from G)
7. The Circle of Fifths
8. Triad Inversions
9. 7th Chords — Adding Color
10. Voice Leading — Smooth Connections

### Expression & Color (Advanced) — 8 lessons

1. Blue Notes _(existing)_
2. Modal Interchange _(existing)_
3. Chromatic Approach Notes _(existing)_
4. The Tritone — The Devil's Interval
5. Tritone Substitution (jazz)
6. Sus Chords & Suspended Tension
7. Polychords & Stacking Triads
8. Rubato — Time as Expression

## Data Model

```ts
// src/shared/course.ts

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface CourseLesson {
  id: string
  songId: string
  titleOverride?: string
  teaser: string
}

export interface CourseModule {
  id: string
  title: string
  description: string
  lessons: CourseLesson[]
}

export interface GuitarCourse {
  id: string
  title: string
  subtitle: string
  description: string
  difficulty: CourseDifficulty
  estimatedMinutes: number
  tone: string
  modules: CourseModule[]
}

export interface CourseProgress {
  courseId: string
  completedLessonIds: string[]
  currentLessonId: string | null
  updatedAt: string
}

export interface CourseSummary {
  course: GuitarCourse
  progress: CourseProgress
  totalLessons: number
  completedCount: number
}
```

## Storage

- `data/courses/{course-id}.json` — course definitions (seeded as read-only
  defaults; user can override locally if desired)
- `data/course-progress.json` — `{ [courseId]: CourseProgress }`,
  workspace-scoped

**Seeding rules:** First-install only. Never touches existing
`course-progress.json`. Course definitions are re-seeded if missing but
NEVER overwritten if the user has edited them.

## Server endpoints

```
GET    /api/courses                       → list (definitions + progress summary)
GET    /api/courses/:courseId             → full course + progress
POST   /api/courses/:courseId/complete    → { lessonId }
POST   /api/courses/:courseId/uncomplete  → { lessonId }
POST   /api/courses/:courseId/current     → { lessonId }
POST   /api/courses/:courseId/reset       → clear progress
```

## UX Surfaces

### A. Library — "Courses" row at the top

Horizontal scroll of course cards above folders/songs. Each card:

- Difficulty pill in tone color
- Serif title
- "14 lessons · ~90 min"
- Thin progress bar with "X of Y" text
- `Start` / `Continue` action

### B. Course Detail page

Long-form page like a Microscope worlds view.

- Hero with title, description, difficulty, estimated time, big progress
- Modules as sections with eyebrow headers
- Lesson rows: status dot, title, teaser, hover action
- Kebab menu per lesson: _Mark complete_, _Open standalone_, _Reset_

### C. In-tutorial course header

When a tutorial is opened _from_ a course, the existing right TutorialPanel
gets a small course header on top with:

- Course title + lesson position ("Lesson 3 of 14")
- Prev / Outline / Next buttons
- "Mark complete" + "Next lesson" at the bottom

If opened standalone (from a folder), no course header — panel is unchanged.

### D. Skip / Revisit / Reset

- **Skip**: kebab → Mark complete. Current lesson advances.
- **Revisit**: clicking a completed lesson reopens; status unchanged.
- **Reset**: course detail header overflow → AlertDialog confirm → clears
  progress for that course only.

## Standalone tutorials still work

Nothing about the tutorial schema changes. Courses are additive. If you
never open the Courses row, the app behaves exactly as today.

## Build order

1. Schema + storage + endpoints
2. Default course definitions (3 JSON files seeded into `data/courses/`)
3. Write/repurpose the tutorial songs themselves (~23 new + 9 existing)
4. Library Courses row + Course Detail page
5. In-tutorial course header (additive `TutorialPanel` prop)
6. Mark-complete / next / reset wiring
