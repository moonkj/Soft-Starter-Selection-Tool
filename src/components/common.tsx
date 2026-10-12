import type { Recommendation } from '../engine/types'

export const BASE = import.meta.env.BASE_URL
export const asset = (p: string) => BASE + p.replace(/^\.?\//, '')

export const fmtA = (a: number) => (a >= 100 ? a.toFixed(0) : a.toFixed(1))
export const isMV = (v: number) => v >= 2000
export const voltText = (v: number, space = true) =>
  isMV(v) ? `${v / 1000}${space ? ' ' : ''}kV` : `${v}${space ? ' ' : ''}V`

export const CLASSES: { cls: 10 | 20 | 30; n: string; desc: string }[] = [
  { cls: 10, n: 'Class 10', desc: '경부하 · 기동 약 10초 이내. 원심 펌프, 소형 팬처럼 가볍게 기동하는 부하' },
  { cls: 20, n: 'Class 20', desc: '중부하 · 기동 약 20초 이내. 컨베이어, 믹서, 대형 팬처럼 기동이 긴 부하' },
  { cls: 30, n: 'Class 30', desc: '고부하 · 기동 약 30초 이내. 크러셔, 밀처럼 관성이 큰 부하' },
]
/** 정격 여유 표시: 100%를 넘으면 '+100% 이상'으로 줄여 보여준다 */
export const marginText = (pct: number) => (Math.round(pct) > 100 ? '+100% 이상' : `+${Math.round(pct)}%`)
export const startsText = (s: number) => (s === 3 ? '3회 이하' : s === 5 ? '4~5회' : '6~10회')


export type CatKey = 'lsfs' | 'lvss' | 'ssx'
export const CAT: Record<CatKey, { file: string; img: string; title: string; sub: string }> = {
  lsfs: { file: 'catalogs/LSFS_Motorsol_KO_2018.pdf', img: 'lsfs', title: 'Motorsol Soft Starter (LSFS·LHVS)', sub: '한국어 · 2018 · 36쪽' },
  lvss: { file: 'catalogs/LVSS_BeyondX_KO.pdf', img: 'lvss', title: 'Beyond X LV Soft Starter (LVSS)', sub: '한국어 · 20쪽' },
  ssx: { file: 'catalogs/SSC_SSM_SSH_KO_2023.pdf', img: 'ssx', title: 'Soft Starter SSC · SSM · SSH', sub: '한국어 · 2023.05 · 28쪽' },
}

// 엔진 계약(Recommendation)에 없는 표시용 속성 (시리즈 ID 기준)
export const hasNA = (r: Recommendation) =>
  r.seriesId === 'ssh' ? r.model.startsWith('SSH-P') : !['lsfs-s', 'lsfs-b', 'lhvs'].includes(r.seriesId)
export const hasDelta = (r: Recommendation) => r.seriesId === 'lvss' || r.seriesId === 'ssmi'

export const Icon = {
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M8 7h7" /></svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
  ),
}

export const CONTROL_TXT: Record<string, string> = { '': '', AC110: 'AC110V', AC220: 'AC220V', AC380: 'AC380~440V', DC24: 'DC24V' }
