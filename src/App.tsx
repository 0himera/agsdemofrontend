import React from 'react'
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import LoginPage from '@/pages/Login'
import ExamsPage from '@/pages/Exams'
import BooksPage from '@/pages/Books'

function HeaderBar() {
  const navigate = useNavigate()
  const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'
  const authed = STUB || Boolean(localStorage.getItem('auth.email') && localStorage.getItem('auth.password'))
  const location = useLocation()
  const path = location.pathname
  const isExams = path.startsWith('/exams')
  const isBooks = path.startsWith('/books')
  return (
    <header className="mb-6 flex items-center justify-between">
      <Link to={authed ? '/exams' : '/login'} className="text-lg font-mono">
        A<span className="text-blue-600 text-xs">uto</span>G<span className="text-blue-600 text-xs">rader</span>S<span className="text-blue-600 text-xs">ystem</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {authed && (
          <nav className="flex items-center gap-2">
            <Link
              to="/exams"
              className={`px-3 py-1 rounded border ${isExams ? 'bg-black text-white border-black' : 'hover:bg-neutral-50'}`}
              aria-current={isExams ? 'page' : undefined}
            >
              Экзамены
            </Link>
            <Link
              to="/books"
              className={`px-3 py-1 rounded border ${isBooks ? 'bg-black text-white border-black' : 'hover:bg-neutral-50'}`}
              aria-current={isBooks ? 'page' : undefined}
            >
              Книги
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'
  const authed = STUB || Boolean(localStorage.getItem('auth.email') && localStorage.getItem('auth.password'))
  const location = useLocation()
  const showHeader = location.pathname !== '/login'
  const ExamStub = () => (
    <div className="max-w-xl mx-auto mt-10 p-4 border rounded bg-neutral-50">
      <h2 className="text-xl font-semibold mb-2">Заглушка: /#exam</h2>
      <p className="text-sm text-neutral-700">
        Страница отдельного экзамена пока не реализована. Перейдите в раздел
        <Link className="ml-1 underline" to="/exams">“Экзамены”</Link>.
      </p>
    </div>
  )
  return (
    <div className="min-h-screen p-6">
      {showHeader && <HeaderBar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/books" element={<BooksPage />} />
        {/* Заглушка для '#/exam' */}
        <Route path="/exam" element={<ExamStub />} />
        <Route path="/" element={<Navigate to={authed ? '/exams' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={authed ? '/exams' : '/login'} replace />} />
      </Routes>
    </div>
  )
}
