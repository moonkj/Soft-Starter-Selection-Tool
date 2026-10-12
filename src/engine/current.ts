import type { Unit } from './types'

export const SQ3 = Math.sqrt(3)
export const isMV = (v: number) => v >= 2000
export const pad = (n: number, w: number) => String(n).padStart(w, '0')
export const fmtA = (a: number) => (a >= 100 ? a.toFixed(0) : a.toFixed(1))

/** 효율×역률 근사값 k (SPEC 4.1) */
export function kFactor(kw: number, v: number): number {
  if (isMV(v)) return 0.85
  if (kw <= 4) return 0.68
  if (kw <= 15) return 0.75
  if (kw <= 55) return 0.8
  return 0.83
}

/** 기준 전류(FLC) 계산. 프로토타입 calc()와 동일. */
export function calcCurrent(volt: number, capInput: number, unit: Unit) {
  const c = +capInput || 0
  let kw: number | null = null
  let I: number
  let formula: string
  if (unit === 'A') {
    I = c
    formula = '모터 정격전류 직접 입력'
  } else {
    kw = c
    const k = kFactor(kw, volt)
    I = (kw * 1000) / (SQ3 * volt * k)
    formula =
      `I = P / (√3 · V · η·cosφ) = ${+kw.toFixed(2)}kW / (√3 · ${volt}V · ${k.toFixed(2)}) ≈ ${fmtA(I)} A (근사값이에요. 명판 전류를 확인하면 더 정확해요)`
  }
  return { I, kw, formula }
}
