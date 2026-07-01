export type TextReplaceFailureCode =
  | 'old_string_empty'
  | 'old_string_not_found'
  | 'old_string_not_unique'

export class TextReplaceError extends Error {
  code: TextReplaceFailureCode
  occurrences: number

  constructor(code: TextReplaceFailureCode, message: string, occurrences = 0) {
    super(message)
    this.code = code
    this.occurrences = occurrences
  }
}

export function replaceExactText(input: {
  value: string
  oldString: string
  newString: string
  replaceAll?: boolean
}): { value: string; replacements: number } {
  const oldString = input.oldString
  if (!oldString) {
    throw new TextReplaceError('old_string_empty', 'oldString cannot be empty')
  }

  const occurrences = input.value.split(oldString).length - 1
  if (occurrences === 0) {
    throw new TextReplaceError(
      'old_string_not_found',
      'oldString not found',
      occurrences,
    )
  }

  if (!input.replaceAll && occurrences > 1) {
    throw new TextReplaceError(
      'old_string_not_unique',
      `oldString found ${occurrences} times - must be unique or use replaceAll`,
      occurrences,
    )
  }

  return {
    value: input.replaceAll
      ? input.value.replaceAll(oldString, input.newString)
      : input.value.replace(oldString, input.newString),
    replacements: input.replaceAll ? occurrences : 1,
  }
}
