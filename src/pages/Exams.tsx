import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExamCard from '@/components/ExamCard'
import { useExamProgress } from '@/hooks/useExamProgress'
import {
  postListExams,
  postScrape,
  postGrade,
  postSubmitGrade,
  type ExamItem,
  type ListExamsResponse,
  type StudentDataResponse,
  type GradingResponse,
} from '@/api/grader'

function formatDateTime(iso?: string, tzOffset?: number): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  // Apply timezone offset (hours) if provided
  if (typeof tzOffset === 'number') d.setHours(d.getHours() + tzOffset)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function extractQuestions(exam: ExamItem): { test?: number; open?: number } {
  const types = exam.material_types || []
  const test = types
    .filter((t) => t.material_type_id === 2)
    .reduce((acc, t) => acc + (t.max_question_count || 0), 0)
  const open = types
    .filter((t) => t.material_type_id === 5)
    .reduce((acc, t) => acc + (t.max_question_count || 0), 0)
  return { test: test || undefined, open: open || undefined }
}

function authorsString(exam: ExamItem): string | undefined {
  if (exam.content?.authors_short) return exam.content.authors_short
  const list = exam.content?.authors?.map((a) => a.full_name) || []
  return list.length ? list.join(', ') : undefined
}

export default function ExamsPage() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExamItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'
  // Local animated progress for stub mode: exam_id -> {progress, running}
  const [anim, setAnim] = useState<Record<string, { p: number; running: boolean }>>({})

  const email = localStorage.getItem('auth.email') || ''
  const password = localStorage.getItem('auth.password') || ''

  useEffect(() => {
    if (!STUB && (!email || !password)) {
      navigate('/login', { replace: true })
      return
    }

    const cached = localStorage.getItem('exams.cache')
    if (cached && !exams) {
      try {
        const parsed = JSON.parse(cached) as ListExamsResponse
        if (parsed.success) setExams(parsed.exams)
      } catch {}
    }

    let ignore = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await postListExams({ email, password })
        if (!ignore) {
          if (resp.success) {
            setExams(resp.exams)
            localStorage.setItem('exams.cache', JSON.stringify(resp))
          } else {
            throw new Error(resp.error || 'Не удалось получить экзамены')
          }
        }
      } catch (e: any) {
        if (!ignore) setError(e.message || 'Ошибка загрузки')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [email, password, navigate, STUB])

  return (
    <div>
      {STUB && (
        <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
          Демо-режим: экзамены и прогресс загружаются из заглушек. Действия выполняются локально.
        </div>
      )}
      {loading && <div className="text-sm text-neutral-600 mb-3">Загрузка…</div>}
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          const list = exams || []
          const subjects = ['История', 'Физика', 'Математика', 'Химия', 'Биология', 'Литература', 'Информатика', 'Экономика', 'Психология', 'Философия', 'География', 'Социология']
          const renderList: ExamItem[] = STUB
            ? Array.from({ length: Math.max(12, list.length || subjects.length) }).map((_, i) => {
                const src = (list[i % Math.max(1, list.length)] || {}) as Partial<ExamItem>
                const title = subjects[i % subjects.length]
                // Force numeric exam_id for type compatibility and override title to natural subjects
                return { ...(src as any), exam_id: i + 1, title } as ExamItem
              })
            : list
          return renderList.map((exam) => {
            const id = String(exam.exam_id)
            const animState = anim[id]
            const onClick = STUB
              ? () => {
                  setAnim((prev) => ({ ...prev, [id]: { p: prev[id]?.p ?? 0, running: true } }))
                  const start = Date.now()
                  const base = animState?.p ?? 0
                  const step = () => {
                    setAnim((prev) => {
                      const cur = prev[id] || { p: base, running: true }
                      if (!cur.running) return prev
                      const elapsed = Date.now() - start
                      const inc = Math.min(100, Math.round(base + elapsed / 30))
                      return { ...prev, [id]: { p: inc, running: inc < 100 } }
                    })
                  }
                  // run animation for ~3s up to 100
                  const int = setInterval(() => {
                    setAnim((prev) => {
                      const cur = prev[id]
                      if (!cur) return prev
                      if (cur.p >= 100 || !cur.running) {
                        clearInterval(int)
                        return { ...prev, [id]: { p: 100, running: false } }
                      }
                      return prev
                    })
                    step()
                  }, 80)
                }
              : undefined
            return <ExamCardRow key={id} exam={exam} animOverride={animState} onClick={onClick} />
          })
        })()}
      </div>
    </div>
  )
}

function ExamCardRow({ exam, animOverride, onClick }: { exam: ExamItem; animOverride?: { p: number; running: boolean } | undefined; onClick?: () => void }) {
  // Reduce polling load and disable automatic embedding probes
  const stage = useExamProgress(exam, { pollMs: 60000, probe: 'off' })
  const q = extractQuestions(exam)
  const start = formatDateTime(exam.start_at, exam.timezone_offset)
  const finish = formatDateTime(exam.finish_at, exam.timezone_offset)
  const schedule = start && finish ? `${start} - ${finish}` : finish || start
  const [actionLoading, setActionLoading] = useState<null | 'scrape' | 'grade' | 'submit'>(null)
  const [lastStudentData, setLastStudentData] = useState<StudentDataResponse | null>(null)
  const [lastGrade, setLastGrade] = useState<GradingResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInfo, setActionInfo] = useState<string | null>(null)

  const email = localStorage.getItem('auth.email') || ''
  const password = localStorage.getItem('auth.password') || ''
  const first = exam.students_for_grading?.[0]
  const sev = exam.content?.sef_url || (exam as any).sef_url

  async function handleScrape(): Promise<StudentDataResponse | null> {
    if (!first || !email || !password) return null
    setActionLoading('scrape')
    setActionError(null)
    setActionInfo(null)
    try {
      const resp = await postScrape({
        credentials: { email, password },
        student_id: first.student_id,
        sef_url_filter: sev,
        max_score: exam.max_score ?? 5,
      })
      if ('success' in resp && resp.success && 'student_id' in resp) {
        const data = resp as StudentDataResponse
        setLastStudentData(data)
        setActionInfo(`Собраны ответы студента ${data.student_name}`)
        return data
      } else {
        setActionError('Не удалось получить данные студента для оценки')
        return null
      }
    } catch (e: any) {
      setActionError(e.message || 'Ошибка при сборе данных')
      return null
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGrade() {
    setActionError(null)
    setActionInfo(null)
    setActionLoading('grade')
    try {
      let data = lastStudentData
      if (!data) data = await handleScrape()
      if (!data) throw new Error('Нет данных студента для оценки')
      const grade = await postGrade(data)
      setLastGrade(grade)
      setActionInfo(`Оценено: ${grade.overall_score}/${data.max_score}`)
    } catch (e: any) {
      setActionError(e.message || 'Ошибка при оценивании')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSubmit() {
    if (!lastStudentData || !lastGrade) {
      setActionError('Сначала выполните оценивание')
      return
    }
    setActionError(null)
    setActionInfo(null)
    setActionLoading('submit')
    try {
      await postSubmitGrade({
        team_id: lastStudentData.team_id,
        team_student_id: lastStudentData.team_student_id,
        mark: lastGrade.overall_score,
        email,
        password,
      })
      setActionInfo('Оценка отправлена')
    } catch (e: any) {
      setActionError(e.message || 'Ошибка при отправке оценки')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <ExamCard
        id={String(exam.exam_id)}
        title={exam.title || exam.content?.title || 'Экзамен'}
        authors={authorsString(exam) || ''}
        bookHref={exam.content?.sef_url ? `/book/${exam.content.sef_url}` : undefined}
        questionsTest={q.test}
        questionsOpen={q.open}
        schedule={schedule}
        durationMinutes={typeof exam.time_limit === 'number' ? exam.time_limit : undefined}
        group={exam.group?.title}
        participants={exam.students_for_grading?.length}
        progress={typeof animOverride?.p === 'number' ? animOverride.p : stage.progress}
        stageLabel={stage.stageLabel}
        running={Boolean(animOverride?.running)}
        onClick={onClick}
      />

      <div className="flex flex-wrap items-center gap-2 pl-1 text-sm">
        <button
          className="btn btn-sm"
          onClick={handleScrape}
          disabled={!first || !email || !password || actionLoading !== null}
        >
          Сбор ответов
        </button>
        <button className="btn btn-sm" onClick={handleGrade} disabled={!first || actionLoading !== null}>
          Оценить
        </button>
        <button
          className="btn btn-sm"
          onClick={handleSubmit}
          disabled={!lastGrade || !lastStudentData || actionLoading !== null}
        >
          Отправить оценку
        </button>
        {actionLoading && <span className="text-neutral-500 ml-2">{actionLoading}…</span>}
        {actionInfo && <span className="text-green-600 ml-2">{actionInfo}</span>}
        {actionError && <span className="text-red-600 ml-2">{actionError}</span>}
      </div>
    </div>
  )
}
