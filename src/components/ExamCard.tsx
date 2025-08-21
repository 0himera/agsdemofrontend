import React from 'react'
import type { ExamCardData } from '@/types'
import { CalendarDays, Clock, Users, User2 } from 'lucide-react'

export interface ExamCardProps extends ExamCardData {
  progress: number
  stageLabel: string
  onClick?: () => void
  running?: boolean
}

export default function ExamCard({
  title,
  authors,
  bookHref,
  questionsTest,
  questionsOpen,
  schedule,
  durationMinutes,
  group,
  participants,
  progress,
  stageLabel,
  onClick,
  running,
}: ExamCardProps) {
  return (
    <div className="relative glass hover-float overflow-hidden cursor-pointer" onClick={onClick}>
      <div className="px-5 py-4">
        <h4 className="mt-0 mb-1 text-lg font-semibold">{title}</h4>
        {authors && (
          <a href={bookHref ?? '#'} className="block text-xs text-sky-600 mb-3">
            <div>{authors}</div>
          </a>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-700 mb-3">
          {typeof questionsTest === 'number' && <div>{questionsTest} вопроса тестирования</div>}
          {typeof questionsOpen === 'number' && <div>{questionsOpen} открытых вопросов</div>}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-700">
          {schedule && (
            <div className="px-1 whitespace-nowrap flex items-center gap-1 rounded">
              <CalendarDays size={18} className="text-neutral-800" aria-hidden /> {schedule}
            </div>
          )}
          {typeof durationMinutes === 'number' && (
            <div className="flex items-center gap-1">
              <Clock size={18} className="text-neutral-800" aria-hidden /> {durationMinutes} мин
            </div>
          )}
          {group && (
            <div className="max-w-[430px] flex items-start gap-1 overflow-hidden leading-6">
              <User2 size={18} className="text-neutral-800" aria-hidden /> {group}
            </div>
          )}
          {typeof participants === 'number' && (
            <div className="flex items-center gap-1 leading-6">
              <Users size={18} className="text-neutral-800" aria-hidden /> {participants} чел
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-neutral-600">
          {stageLabel} • {progress}%
        </div>
      </div>

      {/* bottom progress bar */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-neutral-200">
        <div
          className={`relative h-full transition-[width] duration-500 ease-out ${
            progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {running && progress < 100 && <div className="absolute inset-0 progress-shimmer" />}
        </div>
      </div>
    </div>
  )
}
