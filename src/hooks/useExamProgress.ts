import { useEffect, useMemo, useRef, useState } from 'react'
import type { Stage } from '@/types'
import { stageLabelRu } from '@/types'
import type { ExamItem } from '@/api/grader'
import { resolveSevUrl, getBookInfo } from '@/api/books'
import { probeEmbeddings } from '@/api/emb'

export interface UseExamProgressOptions {
  weights?: { download: number; convert: number; process: number; embed: number; grade: number }
  // Base polling interval for book status (was 5s). Increased to reduce load.
  pollMs?: number
  // Control probing embeddings: 'auto' (default) or 'off'
  probe?: 'auto' | 'off'
  // Minimum cooldown between embedding probes (ms). Default 120s.
  embProbeCooldownMs?: number
}

export interface ExamProgress {
  progress: number
  stage: Stage
  stageLabel: string
}

const defaultWeights = { download: 15, convert: 15, process: 25, embed: 25, grade: 20 }

// Poll real services: books (download/convert/process) and optionally emb/grader later.
export function useExamProgress(exam: ExamItem, opts: UseExamProgressOptions = {}): ExamProgress {
  const STUB = (import.meta as any).env?.VITE_STUB_MODE === '1'
  if (STUB) {
    // Deterministic staged progress for demo by exam_id
    const idx = Number(exam.exam_id || 0)
    const stages: Stage[] = ['download', 'convert', 'process', 'embed', 'grade', 'done']
    const stage = stages[idx % stages.length]
    const progressMap: Record<Stage, number> = {
      idle: 0,
      download: 10,
      convert: 30,
      process: 55,
      embed: 75,
      grade: 90,
      done: 100,
    }
    const progress = progressMap[stage]
    return { progress, stage, stageLabel: stageLabelRu[stage] }
  }

  const [stage, setStage] = useState<Stage>('idle')
  const [partials, setPartials] = useState<{ [K in keyof typeof defaultWeights]?: number }>({})
  const [downloadId, setDownloadId] = useState<string | null>(null)
  const resolveBackoffMsRef = useRef<number>(0)
  const nextResolveAtRef = useRef<number>(0)
  // Embedding probe state (must be hooks at top-level, not inside effects)
  const lastEmbProbeAtRef = useRef<number>(0)
  const embProbeBackoffMsRef = useRef<number>(0)
  const embProbeOkRef = useRef<boolean>(false)

  const weights = { ...defaultWeights, ...(opts.weights ?? {}) }
  const basePollMs = opts.pollMs ?? 30000
  const embProbeCooldownMs = Math.max(30000, opts.embProbeCooldownMs ?? 120000)
  const probeMode = opts.probe ?? 'auto'

  // Reset downloadId when exam changes
  useEffect(() => {
    setDownloadId(null)
    // reset backoff on exam change
    resolveBackoffMsRef.current = 0
    nextResolveAtRef.current = 0
  }, [exam?.exam_id, exam?.content?.sef_url, (exam as any)?.sef_url])

  useEffect(() => {
    let canceled = false
    const pollMs = basePollMs
    // initialize probe backoff when effect starts
    embProbeBackoffMsRef.current = embProbeCooldownMs

    async function tick() {
      try {
        const sev = exam.content?.sef_url || exam.sef_url
        if (!sev) {
          if (!canceled) {
            setStage('idle')
            setPartials({})
          }
          return
        }

        // Resolve download_id once
        let dl = downloadId
        if (!dl) {
          const now = Date.now()
          // backoff gating for resolve attempts
          if (now < nextResolveAtRef.current) {
            return
          }
          try {
            const r = await resolveSevUrl(sev)
            dl = r.download_id
            if (!canceled) setDownloadId(dl)
            // reset backoff on success
            resolveBackoffMsRef.current = 0
            nextResolveAtRef.current = 0
          } catch {
            // Not downloaded yet or backend unaware — back off progressively
            if (!canceled) {
              setStage('idle')
              setPartials({})
            }
            const base = basePollMs
            const prev = resolveBackoffMsRef.current || base
            const next = Math.min(prev * 2, 60000)
            // schedule next attempt after prev interval; increase backoff for subsequent failures
            nextResolveAtRef.current = now + prev
            resolveBackoffMsRef.current = next
            return
          }
        }

        // Fetch book info and map to stage
        const info = await getBookInfo(dl!)
        const status = (info.status || 'unknown').toLowerCase()

        // Default: no fine-grained partials yet
        let nextStage: Stage = 'idle'
        let nextPartials: typeof partials = {}

        if (status === 'downloading' || status === 'initialized' || status === 'processing') {
          nextStage = 'download'
        } else if (status === 'downloaded') {
          nextStage = 'convert'
        } else if (status === 'converting') {
          nextStage = 'convert'
        } else if (status === 'converted') {
          nextStage = 'process'
        } else if (status === 'processing_rag') {
          nextStage = 'process'
        } else if (status === 'rag_completed') {
          // Processing done; embedding stage is next (not yet tracked server-side)
          nextStage = 'embed'
          nextPartials = {}
        } else if (status === 'completed') {
          nextStage = 'done'
        } else if (status.endsWith('failed') || status === 'error' || status === 'unknown') {
          // Keep at current stage but with 0 to avoid misleading progress
          nextStage = 'idle'
        }

        // If chunks exist, consider process fully done and optionally probe embeddings
        if ((info.chunks_count ?? 0) > 0 && nextStage !== 'done') {
          // Move to embed baseline
          nextStage = nextStage === 'process' ? 'embed' : nextStage

          // Probe only if enabled and with cooldown/backoff
          if (probeMode === 'auto' && !embProbeOkRef.current) {
            const now = Date.now()
            const since = now - (lastEmbProbeAtRef.current || 0)
            if (since >= embProbeBackoffMsRef.current) {
              try {
                lastEmbProbeAtRef.current = now
                const embedded = await probeEmbeddings(dl!)
                if (embedded) {
                  embProbeOkRef.current = true
                  const pending = exam.students_for_grading?.length ?? 0
                  nextStage = pending > 0 ? 'grade' : 'done'
                } else {
                  // no results yet; keep stage and keep cooldown
                }
              } catch {
                // increase backoff on errors, cap at 10 minutes
                embProbeBackoffMsRef.current = Math.min(
                  Math.max(embProbeCooldownMs, embProbeBackoffMsRef.current * 2 || embProbeCooldownMs),
                  10 * 60 * 1000,
                )
              }
            }
          }
        }

        if (!canceled) {
          setStage(nextStage)
          setPartials(nextPartials)
        }
      } catch {
        if (!canceled) {
          setStage('idle')
          setPartials({})
        }
      }
    }

    // initial tick and interval
    tick()
    const t = setInterval(tick, pollMs)
    return () => {
      canceled = true
      clearInterval(t)
    }
  }, [exam, opts.pollMs, opts.probe, opts.embProbeCooldownMs, downloadId])

  const progress = useMemo(() => {
    if (stage === 'idle') return 0
    if (stage === 'done') return 100

    const order: (keyof typeof defaultWeights)[] = ['download', 'convert', 'process', 'embed', 'grade']
    let sum = 0
    for (const k of order) {
      if (k === stage) {
        const inner = typeof partials[k] === 'number' ? Math.max(0, Math.min(100, partials[k]!)) : 0
        sum += (weights[k] * inner) / 100
        break
      } else {
        sum += weights[k]
      }
    }
    return Math.round(sum)
  }, [stage, partials, weights])

  return { progress, stage, stageLabel: stageLabelRu[stage] }
}
