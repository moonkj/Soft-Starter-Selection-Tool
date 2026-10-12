import { describe, it, expect } from 'vitest'
import cases from './selection-cases.json'
import { select } from '../src/engine/select'
import { fmtA } from '../src/engine/current'
import type { Conditions } from '../src/engine/types'

const base: Conditions = {
  volt: 380, hz: 60, cap: 55, unit: 'kW', load: 'pump',
  amb: 40, starts: 3, conn: 'line', na: false, bp: false, pr: false,
}

function toConditions(input: Record<string, unknown>): Conditions {
  const c: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(input)) {
    c[k] = ['volt', 'cap', 'amb', 'starts', 'hz'].includes(k) ? Number(v) : v
  }
  return c as unknown as Conditions
}

describe.each(cases)('$id $desc', (tc) => {
  const r = select(toConditions(tc.input))

  it('기준 전류', () => {
    expect(fmtA(r.amp)).toBe(tc.expected.amp)
  })
  it('추천 모델 순서·정격·여유율·경고', () => {
    expect(r.ok.map((o) => o.model)).toEqual(tc.expected.ok.map((o) => o.model))
    r.ok.forEach((o, i) => {
      const e = tc.expected.ok[i]
      expect(`${o.ratedA} A`).toBe(e.rated)
      expect(`+${Math.round(o.marginPct)}%`).toBe(e.margin)
      expect(o.warn).toEqual(e.warn)
    })
  })
  it('제외 사유', () => {
    expect(r.excluded.map((x) => `${x.seriesName} — ${x.reason}`)).toEqual(tc.expected.excluded)
  })
})

describe('기타', () => {
  it('용량 0이면 빈 결과', () => {
    const r = select({ ...base, cap: 0 })
    expect(r.ok).toEqual([])
    expect(r.excluded).toEqual([])
  })
  it('LVSS는 Frame별 카탈로그 페이지', () => {
    const r = select({ ...base, volt: 440, cap: 500, unit: 'A' })
    const lvss = r.ok.find((o) => o.seriesId === 'lvss')!
    expect(lvss.pages.map((p) => p.page)).toEqual([6, 9, 17])
  })
})

describe('모델 숨김(단종) 처리', () => {
  const c: Conditions = { ...base, cap: 40, unit: 'A' } // 기준 40 A, 380V, Normal 40°C
  const k = (code: string) => `ssce|SSCe-${code}`
  const ssce = (r: ReturnType<typeof select>) => r.ok.find((o) => o.seriesId === 'ssce')!

  it('숨김 없으면 기존 결과와 같다', () => {
    expect(select(c, { hidden: new Set() })).toEqual(select(c))
    expect(ssce(select(c)).model).toBe('SSCe-042-V4-C1')
  })
  it('선정 모델을 숨기면 같은 시리즈의 다음 노출 모델이 선정된다', () => {
    const r = select(c, { hidden: new Set([k('042')]) })
    expect(ssce(r).model).toBe('SSCe-048-V4-C1')
    expect(ssce(r).next?.model).toBe('SSCe-060-V4-C1')
  })
  it('한 단계 위(next)도 숨김 모델을 건너뛴다', () => {
    const r = select(c, { hidden: new Set([k('048')]) })
    expect(ssce(r).model).toBe('SSCe-042-V4-C1')
    expect(ssce(r).next?.model).toBe('SSCe-060-V4-C1')
  })
  it('입력 전압이 V4 범위(440V)를 넘으면 V6만 해당한다', () => {
    const r = select({ ...c, volt: 480 })
    expect(ssce(r).model).toBe('SSCe-042-V6-C1')
  })
  it('시리즈 전체를 숨기면 제외 사유가 붙는다', () => {
    const all = new Set(
      ['018', '034', '042', '048', '060', '075', '085', '100', '140', '170', '200'].map(k),
    )
    const r = select(c, { hidden: all })
    expect(r.ok.some((o) => o.seriesId === 'ssce')).toBe(false)
    expect(r.excluded.find((e) => e.seriesId === 'ssce')?.reason).toBe('현재 판매하지 않는 모델')
  })
  it('숨기고 남은 모델이 전부 모자라면 사유는 판매 중지가 아니라 정격 초과', () => {
    const r = select({ ...c, cap: 190 }, { hidden: new Set([k('200')]) })
    expect(r.excluded.find((e) => e.seriesId === 'ssce')?.reason).toMatch(/^정격 초과/)
  })
  it('모델 키는 시리즈 안에서 유일하다', async () => {
    const { catalog } = await import('../src/engine/catalog')
    const { modelKey } = await import('../src/engine/model-key')
    const keys = catalog.models.map(modelKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('SSH 형명 조합기', () => {
  const mv: Conditions = { ...base, volt: 6600, cap: 100, unit: 'A' }
  const ssh = (r: ReturnType<typeof select>) => r.ok.find((o) => o.seriesId === 'ssh')!
  it('옵션 없이 부르면 짧은 형명(용량·전압까지)', () => {
    expect(ssh(select(mv)).model).toBe('SSH-L-0110-V06')
  })
  it('옵션을 주면 형명 ⑤~⑩이 그대로 붙는다', () => {
    const o = { sc: 'SC25', e: 'E2', f: 'F1', l: 'L3', b: 'B1', pf: 'PF0' }
    expect(ssh(select({ ...mv, panel: 'P', ssh: o })).model).toBe('SSH-P-0110-V06-SC25-E2-F1-L3-B1-PF0')
  })
  it('4.4kV 이하는 1000A까지만', () => {
    const r = select({ ...mv, volt: 4160, cap: 1100 })
    expect(r.excluded.find((e) => e.seriesId === 'ssh')?.reason).toMatch(/^정격 초과 \(최대 1000 A\)/)
  })
  it('용량 행을 숨기면 다음 용량이 선정된다', () => {
    expect(ssh(select(mv, { hidden: new Set(['ssh|SSH-0110']) })).model).toBe('SSH-L-0200-V06')
  })
})

describe('형명 조합기 (LSFS · LHVS · SSC/SSM)', () => {
  it('옵션 없이 부르면 기본 모델 코드 그대로(기존 결과)', () => {
    const r = select(base)
    expect(r.ok.find((o) => o.seriesId === 'lsfs-s')!.model).toBe('LSFS 3056 S')
  })
  it('LSFS 옵션이 형명 뒤에 붙고, Cable은 분리형일 때만 쓴다', () => {
    const a = select({ ...base, control: 'AC110', lsfs: { comm: 'C', disp: '1', cable: '2' } }).ok.find((o) => o.seriesId === 'lsfs-s')!
    expect(a.model).toBe('LSFS 3056 S C112 60Hz')
    const b = select({ ...base, control: 'AC220', lsfs: { comm: '0', disp: '0', cable: '3' } }).ok.find((o) => o.seriesId === 'lsfs-s')!
    expect(b.model).toBe('LSFS 3056 S 0200 60Hz')
    expect(a.info.some((s) => s.includes('설계팀 확인'))).toBe(true)
  })
  it('LHVS는 주파수가 형명에 들어가고 옵션이 이어진다', () => {
    const mv: Conditions = { ...base, volt: 6600, cap: 100, unit: 'A', hz: 50 }
    const l = (r: ReturnType<typeof select>) => r.ok.find((o) => o.seriesId === 'lhvs')!
    expect(l(select(mv)).model).toBe('LHVS 6 1200 50Hz')
    const o = l(select({ ...mv, lhvs: { vcb: '2', vcs: '4', meter: 'N' } }))
    expect(o.model).toBe('LHVS 6 1200 50Hz 24N')
    expect(o.info.some((s) => s.includes('설계팀 확인'))).toBe(true)
  })
  it('SSC·SSM 입력전압 코드는 입력 전압으로 정해진다', () => {
    const m = (v: number, id: string) => select({ ...base, volt: v }).ok.find((o) => o.seriesId === id)!.model
    expect(m(380, 'ssce')).toBe('SSCe-140-V4-C1')
    expect(m(480, 'ssce')).toMatch(/-V6-C1$/)
    expect(m(380, 'ssmi')).toMatch(/-V5-C1$/)
    expect(m(690, 'ssmi')).toMatch(/-V7-C1$/)
  })
})

describe('조작전원 공통 입력', () => {
  const m = (c: Conditions, id: string) => select(c).ok.find((o) => o.seriesId === id)?.model
  it('SSC·SSM: AC는 C1, DC24V는 C2', () => {
    expect(m({ ...base, control: 'AC110' }, 'ssce')).toMatch(/-C1$/)
    expect(m({ ...base, control: 'DC24' }, 'ssce')).toMatch(/-C2$/)
    expect(m({ ...base, control: 'DC24' }, 'ssmi')).toMatch(/-C2$/)
  })
  it('LSFS: DC24V는 지원하지 않는다', () => {
    const r = select({ ...base, control: 'DC24' })
    expect(r.excluded.find((e) => e.seriesId === 'lsfs-s')?.reason).toMatch(/DC24V/)
  })
  it('LVSS: 307 이후는 AC110 → -1, AC220 → -2, DC24V는 제외하고 101~305는 공통', () => {
    const big: Conditions = { ...base, cap: 430, unit: 'A' }
    expect(m({ ...big, control: 'AC110' }, 'lvss')).toBe('LS-LVSS-307-1 / -2'.replace(' / -2', ''))
    expect(m({ ...big, control: 'AC220' }, 'lvss')).toBe('LS-LVSS-307-2')
    expect(m({ ...big, control: 'DC24' }, 'lvss')).toBeUndefined()
    const small = select({ ...base, control: 'DC24' }).ok.find((o) => o.seriesId === 'lvss')!
    expect(small.model).toBe('LS-LVSS-201')
    expect(small.info.some((s) => s.includes('공통'))).toBe(true)
  })
})

describe('옵션 선택 안 함 / AC380', () => {
  const m = (c: Conditions, id: string) => select(c).ok.find((o) => o.seriesId === id)?.model
  const none = { comm: '', disp: '', cable: '' } as const
  it("조작전원 ''이면 SSC·SSM은 C?, LSFS·LVSS는 코드를 임의로 정하지 않는다", () => {
    expect(m({ ...base, control: '' }, 'ssce')).toBe('SSCe-140-V4-C?')
    expect(m({ ...base, control: '' }, 'ssmi')).toMatch(/-V5-C\?$/)
    expect(m({ ...base, control: '', lsfs: none }, 'lsfs-s')).toBe('LSFS 3056 S')
    expect(m({ ...base, control: '' }, 'lvss')).toBe('LS-LVSS-201')
  })
  it('LSFS 옵션을 일부만 고르면 나머지는 ?로 남는다', () => {
    expect(m({ ...base, control: 'AC220', lsfs: { comm: 'C', disp: '', cable: '' } }, 'lsfs-s')).toBe('LSFS 3056 S C2?? 60Hz')
  })
  it('SSH·LHVS 옵션을 안 고르면 형명은 기본까지만, 일부만 고르면 ?', () => {
    const mv: Conditions = { ...base, volt: 6600, cap: 100, unit: 'A', panel: '' }
    const empty = { sc: '', e: '', f: '', l: '', b: '', pf: '' }
    expect(m({ ...mv, ssh: empty }, 'ssh')).toBe('SSH-?-0110-V06')
    expect(m({ ...mv, panel: 'L', ssh: { ...empty, sc: 'SC25' } }, 'ssh')).toBe('SSH-L-0110-V06-SC25-E?-F?-L?-B?-PF?')
    expect(m({ ...mv, lhvs: { vcb: '', vcs: '', meter: '' } }, 'lhvs')).toBe('LHVS 6 1200 60Hz')
  })
  it('AC380~440V는 SSC만 지원한다', () => {
    const r = select({ ...base, control: 'AC380' })
    expect(r.ok.some((o) => o.seriesId === 'ssce')).toBe(true)
    expect(r.ok.some((o) => ['ssme', 'ssmi', 'lvss', 'lsfs-s'].includes(o.seriesId))).toBe(false)
  })
})
