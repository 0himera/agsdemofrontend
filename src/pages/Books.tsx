import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listBooks,
  type BookInfo,
  downloadBook,
  convertBook,
  processBook,
  getBookInfo,
} from '@/api/books'

export default function BooksPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<BookInfo[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState('')
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(10)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const email = localStorage.getItem('auth.email') || ''
  const password = localStorage.getItem('auth.password') || ''
  const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'

  const booksBase = useMemo(() => {
    return (import.meta.env.VITE_BOOKS_API_URL as string | undefined)?.replace(/\/$/, '') || ''
  }, [])

  useEffect(() => {
    if (!STUB && (!email || !password)) {
      navigate('/login', { replace: true })
      return
    }

    let ignore = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await listBooks()
        if (!ignore) setBooks(data)
      } catch (e: any) {
        if (!ignore) setError(e.message || 'Ошибка загрузки книг')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [email, password, navigate, STUB])

  async function refreshList() {
    try {
      const data = await listBooks()
      setBooks(data)
    } catch (e: any) {
      // keep silent refresh errors
    }
  }

  function isValidUraitLink(url: string) {
    return url.startsWith('https://urait.ru/book/')
  }

  async function waitForPdf(download_id: string, timeoutMs = 600000) {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      try {
        const info = await getBookInfo(download_id)
        if (info.pdf_available) return true
      } catch {
        // Backend might still be initializing the record; wait and retry
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    return false
  }

  async function waitForDownloaded(download_id: string, timeoutMs = 600000) {
    const started = Date.now()
    // Initial grace period to let backend register the download_id
    await new Promise((r) => setTimeout(r, 5000))
    while (Date.now() - started < timeoutMs) {
      try {
        const info = await getBookInfo(download_id)
        const st = (info.status || '').toLowerCase()
        if (st === 'downloaded' || st === 'converted' || st === 'completed' || info.pdf_available) return info
      } catch {
        // Likely 404 immediately after POST; wait and retry
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    return null
  }

  async function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault()
    setSubmitMsg(null)
    setError(null)
    if (!isValidUraitLink(newUrl)) {
      setError('Введите ссылку формата https://urait.ru/book/...')
      return
    }
    setSubmitting(true)
    try {
      setSubmitMsg('Запуск загрузки книги…')
      const dl = await downloadBook(newUrl)
      const download_id = dl.download_id
      if (!download_id) throw new Error('Не удалось получить идентификатор загрузки')

      setSubmitMsg('Ожидание завершения скачивания…')
      const infoAfterDownload = await waitForDownloaded(download_id)
      if (!infoAfterDownload) throw new Error('Превышено время ожидания скачивания')

      // Конвертируем только если PDF еще не готов
      if (!infoAfterDownload.pdf_available) {
        const st = (infoAfterDownload.status || '').toLowerCase()
        if (st === 'downloaded') {
          setSubmitMsg('Конвертация в PDF…')
          await convertBook(download_id)
        }

        setSubmitMsg('Ожидание готовности PDF…')
        await waitForPdf(download_id)
      }

      setSubmitMsg('Обработка для RAG…')
      await processBook(download_id)

      setSubmitMsg('Готово. Обновляем список…')
      await refreshList()
      setNewUrl('')
      setSubmitMsg('')
    } catch (e: any) {
      setError(e.message || 'Ошибка при добавлении книги')
    } finally {
      setSubmitting(false)
    }
  }

  // Reset visible count when the list changes
  useEffect(() => {
    if (books) setVisible(Math.min(10, books.length))
  }, [books])

  // Infinite scroll using IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => {
          const total = books?.length ?? v
          return Math.min(total, v + 10)
        })
      }
    }, { root: null, rootMargin: '0px', threshold: 1 })
    io.observe(el)
    return () => {
      io.disconnect()
    }
  }, [books])

  return (
    <div>
      {STUB && (
        <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
          Демо-режим: данные книг загружаются из заглушек. Кнопки скачивания отключены.
        </div>
      )}
      <h2 className="text-xl font-semibold mb-4">Книги</h2>

      {/* New book form */}
      <form onSubmit={handleSubmitNew} className="glass p-4 rounded mb-4">
        <label className="block text-sm text-neutral-700 mb-2">Добавить книгу по ссылке (https://urait.ru/book/...)</label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://urait.ru/book/..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 px-3 py-2 rounded border outline-none focus:ring-2 focus:ring-black/10"
            required
            pattern="https://urait\.ru/book/.*"
          />
          <button
            type="submit"
            disabled={submitting || STUB}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {submitting ? 'Обработка…' : 'Добавить'}
          </button>
        </div>
        {submitMsg && <div className="text-xs text-neutral-600 mt-2">{submitMsg}</div>}
      </form>

      {loading && <div className="text-sm text-neutral-600 mb-3">Загрузка…</div>}
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(books || []).slice(0, visible).map((b) => (
          <div key={b.download_id} className="glass hover-float p-4 rounded">
            <div className="font-medium mb-1 truncate" title={b.book_title}>
              {b.book_title}
            </div>
            <div className="text-xs text-neutral-700 flex flex-wrap gap-2 mb-3">
              <span className="px-2 py-0.5 rounded border bg-white">стр: {b.pages}</span>
            </div>
            <div className="flex gap-2">
              <a
                href={STUB ? undefined : `${booksBase}/books/${encodeURIComponent(b.download_id)}/pdf`}
                className={`px-3 py-2 rounded border ${b.pdf_available && !STUB ? 'bg-white hover:bg-neutral-50' : 'opacity-50 pointer-events-none'}`}
                onClick={(e) => {
                  if (STUB) e.preventDefault()
                }}
                download
              >
                Скачать PDF
              </a>
              <a
                href={STUB ? undefined : `${booksBase}/books/${encodeURIComponent(b.download_id)}/text`}
                className={`px-3 py-2 rounded border ${b.text_available && !STUB ? 'bg-white hover:bg-neutral-50' : 'opacity-50 pointer-events-none'}`}
                onClick={(e) => {
                  if (STUB) e.preventDefault()
                }}
                download
              >
                Скачать текст
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      {books && visible < books.length && (
        <div ref={sentinelRef} className="h-6" />
      )}

      {books && books.length === 0 && !loading && !error && (
        <div className="text-sm text-neutral-600">Пока нет доступных книг.</div>
      )}
    </div>
  )
}
