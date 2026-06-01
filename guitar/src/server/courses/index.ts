import type { GuitarCourse } from '../../shared/course'
import { expressionAndColorCourse } from './expression-and-color'
import { guitarBeginningsCourse } from './guitar-beginnings'
import { keysModesColorCourse } from './keys-modes-color'

export const defaultCourses: GuitarCourse[] = [
  guitarBeginningsCourse,
  keysModesColorCourse,
  expressionAndColorCourse,
]

export const defaultCourseIds = defaultCourses.map((course) => course.id)
