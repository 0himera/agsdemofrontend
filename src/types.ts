export type Stage = 'idle' | 'download' | 'convert' | 'process' | 'embed' | 'grade' | 'done'

export const stageLabelRu: Record<Stage, string> = {
  idle: 'Ожидание',
  download: 'Скачивание книги',
  convert: 'Конвертация в PDF',
  process: 'Обработка (OCR/разбиение)',
  embed: 'Индексация (эмбеддинги)',
  grade: 'Оценивание ответов',
  done: 'Готово',
}

export interface ExamCardData {
  id: string
  title: string
  authors: string
  bookHref?: string
  questionsTest?: number
  questionsOpen?: number
  schedule?: string
  durationMinutes?: number
  group?: string
  participants?: number
}
