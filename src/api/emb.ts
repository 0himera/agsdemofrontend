export interface SearchResults {
  results: Array<{ chunk_index: number; chunk_text: string; score: number }>
}

function getEmbBase(): string {
  const base = import.meta.env.VITE_EMB_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_EMB_API_URL is not set')
  return base
}

export async function probeEmbeddings(book_id: string): Promise<boolean> {
  const base = getEmbBase()
  const url = new URL(`${base}/search_in_book`)
  url.searchParams.set('book_id', book_id)
  url.searchParams.set('query', 'probe')
  url.searchParams.set('top_k', '1')

  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
  if (!res.ok) return false
  const data = (await res.json().catch(() => ({ results: [] }))) as SearchResults
  return Array.isArray(data.results) && data.results.length > 0
}
