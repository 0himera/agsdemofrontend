const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'

export interface ListExamsRequest {
  email: string
  password: string
}

export interface StudentForGrading {
  student_id: string
  student_name: string
  team_student_id: number
  team_id: number
  is_leader: boolean
  team_status: string
}

export interface ExamItem {
  exam_id: number
  title: string
  subject_area?: string
  sef_url?: string
  max_score?: number
  deadline?: string
  students_for_grading?: StudentForGrading[]
  // Optional extra fields we may use later
  time_limit?: number
  start_at?: string
  finish_at?: string
  timezone_offset?: number
  group?: { title?: string; id?: number }
  content?: {
    authors_short?: string
    sef_url?: string
    title?: string
    authors?: Array<{ ebs_user_id?: string; full_name: string }>
  }
  material_types?: Array<{ material_type_id: number; max_question_count?: number }>
}

export interface ListExamsResponse {
  success: boolean
  total_exams: number
  total_students_for_grading: number
  exams: ExamItem[]
  error: string | null
}

export async function postListExams(payload: ListExamsRequest): Promise<ListExamsResponse> {
  if (STUB) {
    const demo: ListExamsResponse = {
      success: true,
      total_exams: 2,
      total_students_for_grading: 2,
      exams: [
        {
          exam_id: 101,
          title: 'Демо экзамен: Анализ данных',
          subject_area: 'Информатика',
          sef_url: 'demo_book_1',
          max_score: 10,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          students_for_grading: [
            {
              student_id: 'stu-1',
              student_name: 'Иван Петров',
              team_student_id: 1,
              team_id: 1001,
              is_leader: true,
              team_status: 'active',
            },
          ],
          content: { title: 'Основы анализа данных', authors_short: 'И. Иванов', sef_url: 'demo_book_1' },
          material_types: [
            { material_type_id: 2, max_question_count: 10 },
            { material_type_id: 5, max_question_count: 2 },
          ],
        },
        {
          exam_id: 102,
          title: 'Демо экзамен: МЛ',
          subject_area: 'Математика',
          sef_url: 'demo_book_2',
          max_score: 5,
          deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
          students_for_grading: [
            {
              student_id: 'stu-2',
              student_name: 'Мария Сидорова',
              team_student_id: 2,
              team_id: 1002,
              is_leader: false,
              team_status: 'active',
            },
          ],
          content: { title: 'Введение в машинное обучение', authors_short: 'П. Петров', sef_url: 'demo_book_2' },
          material_types: [
            { material_type_id: 2, max_question_count: 5 },
            { material_type_id: 5, max_question_count: 1 },
          ],
        },
      ],
      error: null,
    }
    return demo
  }
  const base = import.meta.env.VITE_GRADER_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_GRADER_API_URL is not set')

  const res = await fetch(`${base}/list-exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }

  const data = (await res.json()) as ListExamsResponse
  return data
}

// --- Scrape & Grading API ---

// Matches grader_service.s4core.api_v2.StudentDataResponse
export interface StudentDataResponse {
  success: boolean
  student_id: string
  student_name: string
  team_id: number
  team_student_id: number
  self_work_name: string
  subject_area: string
  sef_url?: string | null
  max_score: number
  questions_and_answers: Array<{ question: string; answer: string }>
}

// Aggregated scrape response for multiple teams
export interface ScrapingTeamStudent {
  student_id: string
  student_name: string
  team_student_id: number
  is_leader: boolean
  questions_count: number
  questions_and_answers: Array<{ question: string; answer: string }>
}

export interface ScrapingTeamData {
  team_id: number
  team_number: number
  team_status: string
  self_work_id: number
  self_work_name: string
  self_work_group: string
  subject_area: string
  deadline: string
  total_questions: number
  sef_url?: string
  students: ScrapingTeamStudent[]
}

export interface ScrapingResponse {
  success: boolean
  total_students: number
  teams_count: number
  processing_time: number
  data: ScrapingTeamData[]
  error?: string
}

export interface ScrapeParams {
  credentials: ListExamsRequest
  team_id?: number
  student_id?: string
  sef_url_filter?: string
  max_score?: number
  cookie?: string
}

export async function postScrape(params: ScrapeParams): Promise<StudentDataResponse | ScrapingResponse> {
  if (STUB) {
    const data: StudentDataResponse = {
      success: true,
      student_id: params.student_id || 'stu-demo',
      student_name: 'Демо Студент',
      team_id: 1000,
      team_student_id: params.team_id || 1,
      self_work_name: 'Демо работа',
      subject_area: 'Информатика',
      sef_url: params.sef_url_filter || 'demo_book_1',
      max_score: params.max_score ?? 10,
      questions_and_answers: [
        { question: 'Что такое регрессия?', answer: 'Метод моделирования зависимости.' },
        { question: 'Определение точности', answer: 'Доля верных ответов.' },
      ],
    }
    return data
  }
  const base = import.meta.env.VITE_GRADER_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_GRADER_API_URL is not set')

  const url = new URL(`${base}/scrape`)
  if (params.team_id != null) url.searchParams.set('team_id', String(params.team_id))
  if (params.student_id) url.searchParams.set('student_id', params.student_id)
  if (params.sef_url_filter) url.searchParams.set('sef_url_filter', params.sef_url_filter)
  if (params.max_score != null) url.searchParams.set('max_score', String(params.max_score))
  if (params.cookie) url.searchParams.set('cookie', params.cookie)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(params.credentials),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as StudentDataResponse | ScrapingResponse
}

// Matches grader_service.s4core.api_v2.GradingResponse
export interface GradingResponse {
  student_id: string
  team_id: number
  overall_score: number
  processing_time: number
  question_evaluations: Array<Record<string, any>>
}

export async function postGrade(studentData: StudentDataResponse): Promise<GradingResponse> {
  if (STUB) {
    return {
      student_id: studentData.student_id,
      team_id: studentData.team_id,
      overall_score: Math.min( (studentData.max_score || 10), 8 ),
      processing_time: 1234,
      question_evaluations: [],
    }
  }
  const base = import.meta.env.VITE_GRADER_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_GRADER_API_URL is not set')

  const res = await fetch(`${base}/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(studentData),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as GradingResponse
}

export interface SubmitGradeParams {
  team_id: number
  team_student_id: number
  mark: number
  email: string
  password: string
  feedback?: string
  cookie?: string
}

export async function postSubmitGrade(params: SubmitGradeParams): Promise<any> {
  if (STUB) return { ok: true }
  const base = import.meta.env.VITE_GRADER_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_GRADER_API_URL is not set')

  const url = new URL(`${base}/submit-grade`)
  url.searchParams.set('team_id', String(params.team_id))
  url.searchParams.set('team_student_id', String(params.team_student_id))
  url.searchParams.set('mark', String(params.mark))
  url.searchParams.set('email', params.email)
  url.searchParams.set('password', params.password)
  if (params.feedback) url.searchParams.set('feedback', params.feedback)
  if (params.cookie) url.searchParams.set('cookie', params.cookie)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { accept: 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return await res.json().catch(() => ({}))
}
