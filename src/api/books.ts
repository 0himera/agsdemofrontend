export interface BookInfo {
  download_id: string
  book_title: string
  status: string
  pages: number
  pdf_available: boolean
  text_available: boolean
  chunks_count: number
}

export interface ResolveSevUrlResponse {
  download_id: string
}

const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'

function getBooksBase(): string {
  const base = import.meta.env.VITE_BOOKS_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_BOOKS_API_URL is not set')
  return base
}

export async function listBooks(): Promise<BookInfo[]> {
  if (STUB) {
    // Return a small mock list for demo
    return [
      {
        download_id: 'demo_book_1',
        book_title: 'Основы анализа данных',
        status: 'completed',
        pages: 212,
        pdf_available: true,
        text_available: true,
        chunks_count: 128,
      },
      {
        download_id: 'demo_book_2',
        book_title: 'Введение в машинное обучение',
        status: 'converted',
        pages: 156,
        pdf_available: true,
        text_available: false,
        chunks_count: 0,
      },
    ]
  }
  const base = getBooksBase()
  const res = await fetch(`${base}/books/`, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as BookInfo[]
}

export async function resolveSevUrl(sev_url: string): Promise<ResolveSevUrlResponse> {
  if (STUB) {
    // Map SEF to a deterministic demo id
    const id = `demo_${sev_url.split('/').pop() || 'book'}`
    return { download_id: id }
  }
  const base = getBooksBase()
  const res = await fetch(`${base}/books/resolve/${encodeURIComponent(sev_url)}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as ResolveSevUrlResponse
}

export async function getBookInfo(download_id: string): Promise<BookInfo> {
  if (STUB) {
    // Return a synthesized status for demo
    const demo: BookInfo = {
      download_id,
      book_title: download_id.includes('2') ? 'Введение в машинное обучение' : 'Основы анализа данных',
      status: download_id.includes('2') ? 'converted' : 'completed',
      pages: download_id.includes('2') ? 156 : 212,
      pdf_available: true,
      text_available: !download_id.includes('2'),
      chunks_count: download_id.includes('2') ? 0 : 128,
    }
    return demo
  }
  const base = getBooksBase()
  const res = await fetch(`${base}/books/${encodeURIComponent(download_id)}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as BookInfo
}

export interface BaseBookResponse {
  status: string
  message: string
  download_id?: string
}

export interface BookProcessResponse extends BaseBookResponse {
  text_path?: string
  chunks_count?: number
}

export interface BookDownloadResponse extends BaseBookResponse {
  book_title?: string
  pages?: number
  already_downloaded?: boolean
}

export async function downloadBook(url: string): Promise<BookDownloadResponse> {
  if (STUB) {
    return { status: 'ok', message: 'stubbed', download_id: 'demo_book_3', book_title: 'Новая демо-книга', pages: 100 }
  }
  const base = getBooksBase()
  const res = await fetch(`${base}/books/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as BookDownloadResponse
}

export async function convertBook(download_id: string): Promise<BaseBookResponse> {
  if (STUB) return { status: 'ok', message: 'stubbed', download_id }
  const base = getBooksBase()
  const res = await fetch(`${base}/books/${encodeURIComponent(download_id)}/convert`, {
    method: 'POST',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as BaseBookResponse
}

export async function processBook(
  download_id: string,
  params?: { chunk_size?: number; chunk_overlap?: number }
): Promise<BookProcessResponse> {
  if (STUB) return { status: 'ok', message: 'stubbed', download_id, text_path: '/stub.txt', chunks_count: 64 }
  const base = getBooksBase()
  const url = new URL(`${base}/books/${encodeURIComponent(download_id)}/process`)
  if (params?.chunk_size) url.searchParams.set('chunk_size', String(params.chunk_size))
  if (params?.chunk_overlap) url.searchParams.set('chunk_overlap', String(params.chunk_overlap))

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as BookProcessResponse
}
