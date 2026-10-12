// 모델 노출(숨김) 설정. 일반 화면과 관리자 화면이 같이 쓴다. 생산처 정보는 여기에 없다.
// 우선순위: 이 브라우저의 관리자 임시 저장(draft) > 배포된 public/config/model-visibility.json
import { asset } from '../components/common'

export interface VisibilityFile { hidden: string[]; updated: string }

const DRAFT_KEY = 'sss.visibility.draft.v1'
export const EMPTY_FILE: VisibilityFile = { hidden: [], updated: '' }

function parse(raw: unknown): VisibilityFile | null {
  if (!raw || typeof raw !== 'object') return null
  const h = (raw as { hidden?: unknown }).hidden
  if (!Array.isArray(h) || !h.every((x) => typeof x === 'string')) return null
  const u = (raw as { updated?: unknown }).updated
  return { hidden: [...new Set(h as string[])], updated: typeof u === 'string' ? u : '' }
}
export const parseVisibility = parse

/** 배포된 설정 파일. 못 읽으면 null (관리자 화면이 실패 경고를 띄울 수 있게 구분한다). */
export async function fetchPublishedOrNull(): Promise<VisibilityFile | null> {
  try {
    const res = await fetch(`${asset('config/model-visibility.json')}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    return parse(await res.json())
  } catch {
    return null
  }
}

/** 고객 화면용: 실패하면 빈 목록(전부 노출). */
export async function fetchPublished(): Promise<VisibilityFile> {
  return (await fetchPublishedOrNull()) ?? EMPTY_FILE
}

export function readDraft(): string[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? parse(JSON.parse(raw))?.hidden ?? null : null
  } catch {
    return null
  }
}
export function writeDraft(hidden: string[]): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ hidden, updated: new Date().toISOString() }))
  } catch { /* 저장 불가 환경이면 무시 */ }
}
export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* 무시 */ }
}
