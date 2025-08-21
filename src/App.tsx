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
        {authed ? (
          <button
            className="px-3 py-1 rounded border hover:bg-neutral-50"
            onClick={() => {
              localStorage.removeItem('auth.email')
              localStorage.removeItem('auth.password')
              if (!STUB) navigate('/login', { replace: true })
            }}
          >
            Выйти
          </button>
        ) : (
          <Link to="/login" className="px-3 py-1 rounded border hover:bg-neutral-50">
            Войти
          </Link>
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
  return (
    <div className="min-h-screen p-6">
      {showHeader && <HeaderBar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/" element={<Navigate to={authed ? '/exams' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={authed ? '/exams' : '/login'} replace />} />
      </Routes>
    </div>
  )
}
