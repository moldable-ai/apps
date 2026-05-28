import type { PianoCourse } from '../../shared/course'
import { expressionAndColorCourse } from './expression-and-color'
import { keysModesColorCourse } from './keys-modes-color'
import { pianoBeginningsCourse } from './piano-beginnings'

export const defaultCourses: PianoCourse[] = [
  pianoBeginningsCourse,
  keysModesColorCourse,
  expressionAndColorCourse,
]

export const defaultCourseIds = defaultCourses.map((course) => course.id)
