import { catalog, modelsOf as allModelsOf, type CatalogModel } from './catalog'
import { modelKey } from './model-key'
import { calcCurrent, fmtA, isMV, pad, SQ3 } from './current'
import { LOAD_CLASS, SERIES_META, SERIES_ORDER } from './series-meta'
import type { CatalogPage, Conditions, SelectOptions, Excluded, Recommendation, SelectResult } from './types'

interface Item { code: string; a: number; kw?: number; model?: CatalogModel }
type Eval =
  | { x: string }
  | { item: Item; next: Item | null; cond: string; warn: string[]; info: string[]; need: number; pages?: CatalogPage[] }

function pickFrom(list: Item[], need: number, step = 0) {
  const base = list.findIndex((m) => m.a >= need)
  const i = base < 0 ? -1 : base + step
  return i < 0 || i >= list.length ? null : { m: list[i], next: list[i + 1] ?? null }
}

const rated = (m: CatalogModel, key: string): number | null => m.ratings[key] ?? null

const SOLD_OUT = '현재 판매하지 않는 모델'

interface Ctx { hidden: ReadonlySet<string>; I: number; v: number; cls: 10 | 20 | 30; amb: number; starts: number; delta: boolean; c: Conditions }

function evaluate(id: string, ctx: Ctx): Eval {
  const { I, v, cls, amb, starts, delta, c, hidden } = ctx
  const step = c.steps?.[id] ?? 0
  // 숨김(단종) 모델은 목록에서 빠지므로 pickFrom이 자연스럽게 다음 노출 모델을 고르고, next도 노출 모델만 가리킨다.
  const modelsOf = (sid: string): CatalogModel[] => allModelsOf(sid).filter((m) => !hidden.has(modelKey(m)))
  if (hidden.size && modelsOf(id).length === 0) return { x: SOLD_OUT }
  const s = catalog.series[id]
  const bypass = !s.bypass.startsWith('없음')
  const warn: string[] = []
  const info: string[] = []

  if (s.mv && !isMV(v)) return { x: '고압 전용 제품' }
  if (!s.mv && isMV(v)) return { x: '저압 전용 제품' }
  if (c.na && !s.na_cert) return { x: 'UL/cETL 인증 정보 없음' }
  if (c.pr && !s.motor_protection) return { x: '모터 보호 기능 없음' }
  if (c.bp && !bypass) return { x: '바이패스 없음 (단방향 연속 SCR)' }
  if (delta && !s.in_delta) return { x: 'In-delta 결선 미지원' }
  const need = delta ? I / SQ3 : I
  if (delta) info.push(`In-delta: 기동기 통과 전류 = 모터 정격전류 ÷ √3 = ${fmtA(need)} A 기준`)

  // 입력전압 코드(V4/V6, V5/V7)로 나뉜 행: 입력 전압이 범위에 드는 것만 남기고, 같은 크기는 앞선 변형(V4, V5)부터 쓴다. 앞선 변형을 숨기면 다음 변형(V6, V7)이 대신 쓰인다.
  const byVoltage = (rows: CatalogModel[], vcode: RegExp): CatalogModel[] => {
    const seen = new Set<string>()
    return rows.filter((m) => {
      if (v < m.v_min || v > m.v_max) return false
      const k = m.code.replace(vcode, '')
      if (seen.has(k)) return false
      seen.add(k); return true
    })
  }
  // 제어전원(공통 입력)을 시리즈별 형명 코드로 옮긴다.
  //  ''(선택 안 함)이면 고르지 않은 칸을 ?로 두고, undefined(지정 없음)이면 SSC/SSM은 C1, LSFS는 2, LVSS는 -1/-2 둘 다.
  const control = c.control
  const unsel = control === ''
  const ctrl = unsel ? 'C?' : control === 'DC24' ? 'C2' : 'C1'                 // SSC·SSM: C1 = AC(110~240V, SSC는 380~440V도), C2 = 24V
  const lsfsCtrl = unsel ? '?' : control === 'AC110' ? '1' : '2'              // LSFS: 1 = 110V, 2 = 220V (DC24V·AC380V 없음)
  const q = (v: string, ph: string) => v || ph
  const allEmpty = (o: object) => Object.values(o).every((v) => v === '')
  const NO_STARTS = '시간당 기동 횟수 정격이 표로 나와 있지 않아서 반영하지 못했어요. 기동이 잦으면 기술상담으로 확인해 주세요.'
  const DESIGN_CHECK = '옵션 조합이 많아요. 가능한 조합인지 설계팀 확인이 필요해요.'
  // LSFS 형명: LSFS {전압}{용량} {S|BPS} {통신 C|0}{제어전원 1|2}{디스플레이 0|1}{Cable 0~3} {주파수}Hz (카탈로그 6쪽, 하이픈 없음). Cable은 분리형일 때만 쓴다.
  const lsfsCode = (base: string) => {
    const o = c.lsfs
    if (!o || (allEmpty(o) && unsel)) return base
    const cable = o.disp === '1' ? q(o.cable, '?') : o.disp === '0' ? '0' : '?'
    return `${base} ${q(o.comm, '?')}${lsfsCtrl}${q(o.disp, '?')}${cable} ${c.hz}Hz`
  }
  // LHVS 형명: LHVS {전압} {용량} {주파수}Hz[ {VCB}{VCS}{계측기}] (카탈로그 7쪽, 하이픈 없음)
  const lhvsCode = (base: string) => {
    const o = c.lhvs
    return `${base} ${c.hz}Hz${o && !allEmpty(o) ? ` ${q(o.vcb, '?')}${q(o.vcs, '?')}${q(o.meter, '?')}` : ''}`
  }
  const panel = c.panel ?? 'L'
  const maxMsg = (list: Item[], extra = '') => !list.length ? SOLD_OUT : `정격 초과 (최대 ${list[list.length - 1].a} A${extra})`

  if (id === 'lsfs-s' || id === 'lsfs-b') {
    let d: '2' | '3' | '4' | null = null
    if (v >= 200 && v <= 240) d = '2'
    else if (v >= 380 && v <= 415) d = '3'
    else if (v >= 440 && v <= 480) d = '4'
    if (!d) return { x: `${v}V 미지원 (220/380/440V급)` }
    if (control === 'DC24' || control === 'AC380') return { x: `제어전원 ${control === 'DC24' ? 'DC24V' : 'AC380V'} 미지원 (110/220V만)` }
    if (amb > 50) return { x: '사용 온도 50°C 초과' }
    const list: Item[] = modelsOf(id)
      .filter((m) => m.code.startsWith(`LSFS ${d}`))
      .sort((a, b) => a.motor_kw! - b.motor_kw!)
      .map((m) => ({ code: lsfsCode(m.code), a: m.ratings.rated_A as number, kw: m.motor_kw }))
    const res = pickFrom(list, need, step)
    if (!res) return { x: maxMsg(list) }
    info.push(DESIGN_CHECK)
    const cond = `${d === '2' ? '220V' : d === '3' ? '380V' : '440V'}급 · 카탈로그 적용 ${res.m.kw}kW`
    if (d === '4' && v > 440) warn.push(`카탈로그 정격은 440V예요. ${v}V 적용은 기술상담으로 확인해 주세요.`)
    if (cls > 10) warn.push(`카탈로그에 Class ${cls} 정격이 따로 없어요. 비교에 담아 한 단계 큰 모델도 같이 검토해 주세요.`)
    if (starts > 3) info.push(NO_STARTS)
    if (c.hz === 50) info.push('50Hz 제품은 주문 시 따로 문의해 주세요.')
    if (res.m.kw === 600) warn.push('600kW는 외부 By-pass 회로 구성이 필수예요.')
    return { item: res.m, next: res.next, cond, warn, info, need }
  }

  if (id === 'lhvs') {
    let d: '3' | '6' | null = null
    if (v >= 3000 && v <= 3600) d = '3'
    else if (v >= 6000 && v <= 7200) d = '6'
    if (!d) return { x: `${v / 1000}kV 미지원 (3.3/6.6kV만)` }
    const list: Item[] = modelsOf(id)
      .filter((m) => m.code.startsWith(`LHVS ${d} `))
      .map((m) => ({ code: lhvsCode(m.code), a: m.ratings.rated_A as number, kw: m.motor_kw }))
    const res = pickFrom(list, need, step)
    if (!res) return { x: maxMsg(list) }
    if (amb > 50) warn.push('LHVS 사용 주위온도는 -10~+50°C예요. 그보다 높으면 기술상담으로 확인해 주세요.')
    info.push(DESIGN_CHECK)
    if (starts > 3) info.push(NO_STARTS)
    if (d === '3') info.push('3.3kV는 350 / 750 / 1500kW 용량만 있어요. (카탈로그 7쪽)')
    if (c.lhvs && !allEmpty(c.lhvs)) info.push('옵션 사양 주문 시에는 반드시 당사에 문의해 주세요. (1차 Incoming VCB 사용 여부, 2차 By-Pass 차단기 기종, 보호계전기 추가 등)')
    return { item: res.m, next: res.next, cond: `${d === '3' ? '3.3' : '6.6'}kV · 카탈로그 적용 ${res.m.kw}kW`, warn, info, need }
  }

  if (id === 'ssh') {
    const STD: [number, string][] = [[2300, 'V02'], [3300, 'V03'], [4160, 'V04'], [6600, 'V06'], [11000, 'V11'], [13800, 'V13']]
    // 카탈로그 22쪽: 입력전압은 V02~V13 여섯 가지(2300/3300/4160/6600/11000/13800V)만 있고, 용량(70~1700A)은 전압과 무관하게 고른다.
    const vv = STD.find(([nv]) => v === nv)
    if (!vv) return { x: 'SSH는 2.3 / 3.3 / 4.16 / 6.6 / 11 / 13.8kV만 지원해요' }
    const o = c.ssh
    const picked = !!o && !allEmpty(o)
    const sfx = picked ? `-${q(o.sc, 'SC??')}-${q(o.e, 'E?')}-${q(o.f, 'F?')}-${q(o.l, 'L?')}-${q(o.b, 'B?')}-${q(o.pf, 'PF?')}` : ''
    // 형명: SSH-{판넬}-{용량}-{전압}[-SC-E-F-L-B-PF]. 모델 행은 용량 단위, 나머지는 조건으로 조합한다.
    const list: Item[] = modelsOf(id)
      .map((m) => ({ a: m.ratings.scr_A as number, code: `SSH-${panel === '' ? '?' : panel}-${m.code.slice(4)}-${vv[1]}${sfx}`, model: m }))
    const res = pickFrom(list, need, step)
    if (!res) return { x: maxMsg(list) }
    if (amb >= 50) warn.push('SSH는 주위온도가 50°C 이상이면 용량을 줄여야 해요(카탈로그 23쪽). 저감 비율은 기술상담으로 확인해 주세요.')
    info.push(DESIGN_CHECK)
    if (starts > 3) info.push(NO_STARTS)
    if (c.na) {
      if (panel !== 'P') warn.push('북미(UL) 요구라면 판넬 타입 P(NEMA 표준)를 골라 주세요. SSH의 UL 인증 여부는 기술상담으로 확인해 주세요.')
      else info.push('P 시리즈는 NEMA 표준 판넬이에요. UL 인증 여부는 카탈로그에 없어서 기술상담으로 확인해 주세요.')
    }
    if (c.bp) {
      if (o && (o.e === 'E0' || o.b === 'B0')) warn.push('바이패스가 필요한데 판넬 구성 E0 또는 Bypass 장치 B0을 골랐어요. E1~E3 또는 B1~B4가 필요해요.')
      else info.push('바이패스가 필요하면 판넬 구성 E1~E3 또는 Bypass 장치 B1~B4를 골라 주세요.')
    }
    if (!picked) info.push('단락용량(SC), 판넬 구성(E), 퓨즈·입력측 보호·바이패스·PFC는 옵션 코드로 따로 정해요.')
    return { item: res.m, next: res.next, cond: 'SCR 용량 · AC53b 4-30:1770', warn, info, need }
  }

  if (id === 'lvss') {
    if (v < 200 || v > 480) return { x: `${v}V 미지원 (200~480V)` }
    if (control === 'AC380') return { x: '제어전원 AC380V 미지원 (DC24V·AC110V·AC220V만)' }
    const key = `class${cls}_A`
    let list: Item[] = modelsOf(id)
      .filter((m) => rated(m, key) != null)
      .map((m) => ({ code: m.code, a: rated(m, key)!, model: m }))
    // 제어전원: 101~305는 DC24V/AC110V/AC220V 공통(접미 없음), 307 이후는 -1 = AC110V, -2 = AC220V만(DC24V 없음).
    if (control) list = list.filter((m) => !/-\d$/.test(m.code) || (control === 'AC110' && m.code.endsWith('-1')) || (control === 'AC220' && m.code.endsWith('-2')))
    // 같은 크기의 -1(AC110V) / -2(AC220V) 모델은 한 항목으로 묶는다. 숨긴(공급 불가) 쪽은 이미 빠져 있다.
    list = list.reduce<Item[]>((acc, it) => {
      const base = it.code.replace(/-\d$/, '')
      const sfx = it.code.slice(base.length + 1)
      const last = acc[acc.length - 1]
      if (last && last.code.startsWith(base + '-') && last.a === it.a) last.code += ` / -${sfx}`
      else acc.push({ ...it })
      return acc
    }, [])
    if (c.bp) list = list.filter((m) => m.model!.bypass)
    const res = pickFrom(list, need, step)
    if (!res) return { x: maxMsg(list, (c.bp ? ', 바이패스 내장 기준' : '') + (control === 'DC24' ? ', DC24V 제어전원은 LVSS 101~305(공통 제어전원) 모델만 가능해요' : '')) }
    const m = res.m.model!
    const f = m.frame!
    const ratedAmb = m.rated_ambient_C!
    const ratedStarts = m.rated_starts_per_hour!
    const hasSuffix = /-1 \/ -2$/.test(res.m.code)
    if (amb > ratedAmb) warn.push(`이 크기(Frame ${f})는 ${ratedAmb}°C 기준 정격이에요. 주위 ${amb}°C면 용량을 낮춰야(derating) 할 수 있어요. 기술상담으로 확인해 주세요.`)
    if (starts > ratedStarts) warn.push(`정격 기동 횟수는 시간당 ${ratedStarts}회예요. ${starts === 10 ? '6~10' : '4~5'}회는 기술상담으로 확인해 주세요.`)
    if (f >= 4) info.push('Frame 4~5는 바이패스가 없어 운전 중 발열을 고려해야 해요.')
    if (!/-\d( \/ -\d)?$/.test(res.m.code)) info.push('제어전원은 DC24V / AC110V / AC220V 모두 쓸 수 있어요.')
    if (control === 'AC110') {
      const skipped = allModelsOf(id).filter((m) => m.code.endsWith('-1') && hidden.has(modelKey(m)) && (rated(m, key) ?? 0) >= need && (rated(m, key) ?? 0) < res.m.a).map((m) => m.code)
      if (skipped.length) info.push(`AC110V(-1) 모델 ${skipped.join(', ')}은 판매하지 않아서 한 단계 큰 모델로 올라갔어요. AC220V(-2)로 바꾸면 더 작은 모델을 쓸 수 있어요.`)
    }
    if (hasSuffix) info.push('-1 = AC110V, -2 = AC220V 제어전원')
    else if (/-2$/.test(res.m.code)) info.push('-2 = AC220V 제어전원 (-1 AC110V는 공급 불가)')
    else if (/-1$/.test(res.m.code)) info.push('-1 = AC110V 제어전원')
    const raw = +m.code.replace('LS-LVSS-', '').slice(0, 3)
    // 카탈로그 페이지 매핑 (프로토타입 evaluate()의 pg)
    const sp = ({ 1: 7, 2: 8, 3: 9, 4: 10, 5: 11 } as Record<number, number>)[f]
    const dm = f === 1 ? 15 : f === 2 ? 16 : f === 3 ? (raw >= 307 ? 17 : 16) : f === 4 ? 17 : 18
    const pages: CatalogPage[] = [
      { page: 6, label: '선택 가이드' },
      { page: sp, label: `사양 (Frame ${f})` },
      { page: dm, label: '외형치수' },
    ]
    // 프로토타입은 next 코드에 -1 / -2 접미를 붙이지 않는다(선택 모델에만 붙음) -> 그대로 유지
    const next = res.next ? { ...res.next, code: res.next.code.replace(/-1 \/ -2$/, '') } : null
    return { item: res.m, next, cond: `Trip Class ${cls} · 시간당 ${ratedStarts}회 · ${ratedAmb}°C 기준`, warn, info, need, pages }
  }

  if (id === 'ssce' || id === 'ssci') {
    if (v < 200 || v > 575) return { x: `${v}V 미지원 (200~575V)` }
    if (amb > 50) return { x: '50°C 초과 정격 없음 (기술상담 필요)' }
    const heavy = cls > 10
    const hot = amb > 40
    const key = `${heavy ? 'heavy' : 'normal'}_${hot ? 50 : 40}C_A`
    // 형명 조합: {시리즈}-{용량}-{입력전압 V4/V6}-{제어전원 C1/C2}. 440V 이하는 V4(200~440V), 넘으면 V6(~575V). V6도 200~575V 전체에 쓸 수 있다.
    const list: Item[] = modelsOf(id).map((m) => ({
      code: `${m.code}-${v <= 440 ? 'V4' : 'V6'}-${ctrl}`,
      a: m.ratings[key] as number,
    }))
    const res = pickFrom(list, need, step)
    if (!res) return { x: maxMsg(list) }
    if (cls === 30) warn.push('Class 30(크러셔·밀 같은 무거운 부하)은 Heavy Duty 정격으로 골랐어요. 기동 시간·횟수는 기술상담으로 확인해 주세요.')
    if (starts > 3) info.push(NO_STARTS)
    info.push('C1 = AC110~240V/380~440V 제어전원, C2 = 24V')
    return { item: res.m, next: res.next, cond: `${heavy ? 'Heavy Duty (4×FLC, 20s)' : 'Normal Duty (4×FLC, 6s)'} · ${hot ? '50' : '40'}°C`, warn, info, need }
  }

  if (id === 'ssme' || id === 'ssmi') {
    if (control === 'AC380') return { x: '제어전원 AC380~440V는 SSC만 지원' }
    const vmax = id === 'ssme' ? 525 : 690
    if (v < 200 || v > vmax) return { x: `${v}V 미지원 (200~${vmax}V)` }
    if (amb > 60) return { x: '사용 온도 60°C 초과' }
    const heavy = cls > 10
    const key = heavy ? 'heavy_40C_A' : 'normal_40C_A'
    // 형명 조합: {시리즈}-{용량}B-{입력전압 V5/V7}-{제어전원 C1/C2}. 525V 이하는 V5(200~525V), 넘으면 V7(380~690V).
    const list: Item[] = modelsOf(id).map((m) => ({
      code: `${m.code}-${v <= 525 ? 'V5' : 'V7'}-${ctrl}`,
      a: m.ratings[key] as number,
    }))
    const res = pickFrom(list, need, step)
    if (!res) return { x: maxMsg(list) }
    if (amb > 40) warn.push(`정격은 40°C 기준이에요. 주위 ${amb}°C면 용량을 낮춰야(derating) 할 수 있어요. 기술상담으로 확인해 주세요.`)
    if (cls === 30) warn.push('Class 30(크러셔·밀 같은 무거운 부하)은 Heavy Duty 정격으로 골랐어요. 기동 시간·횟수는 기술상담으로 확인해 주세요.')
    if (starts > 3) info.push(NO_STARTS)
    info.push('C1 = AC110~120V 또는 220~240V 제어전원, C2 = 24V')
    return { item: res.m, next: res.next, cond: `${heavy ? 'Heavy Duty (4×FLC, 20s)' : 'Normal Duty (3.5×FLC, 15s)'} · 40°C`, warn, info, need }
  }

  return { x: '데이터 없음' }
}

/** 형명에 ?로 남은 옵션이 무엇인지: 상세 조건에서 고를 항목 이름 */
function pendingOf(id: string, code: string, c: Conditions): string[] {
  const out: string[] = []
  if (id === 'ssce' || id === 'ssci' || id === 'ssme' || id === 'ssmi') {
    if (c.control === '') out.push('제어전원')
  } else if (id === 'lsfs-s' || id === 'lsfs-b') {
    const o = c.lsfs
    if (c.control === '') out.push('제어전원')
    if (o) {
      if (o.comm === '') out.push('통신기능')
      if (o.disp === '') out.push('디스플레이')
      if (o.disp === '1' && o.cable === '') out.push('Cable 길이')
    }
  } else if (id === 'lhvs') {
    const o = c.lhvs
    if (o) {
      if (o.vcb === '') out.push('VCB 차단용량')
      if (o.vcs === '') out.push('VCS 차단용량')
      if (o.meter === '') out.push('계측기')
    }
  } else if (id === 'ssh') {
    const o = c.ssh
    if (c.panel === '') out.push('판넬 타입')
    if (o) {
      if (o.sc === '') out.push('단락 용량')
      if (o.e === '') out.push('판넬 구성')
      if (o.f === '') out.push('고압 퓨즈')
      if (o.l === '') out.push('입력측 보호')
      if (o.b === '') out.push('Bypass 장치')
      if (o.pf === '') out.push('역률보상(PFC)')
    }
  }
  return out
}

const NO_HIDDEN: ReadonlySet<string> = new Set()

/** opts.hidden: 숨길 모델 키 집합 (modelKey 규칙: `시리즈|카탈로그 코드`) */
export function select(c: Conditions, opts?: SelectOptions): SelectResult {
  const { I, kw, formula } = calcCurrent(c.volt, c.cap, c.unit)
  if (!(I > 0)) return { amp: I, kw, formula, ok: [], excluded: [] }

  const cls = c.cls ?? LOAD_CLASS[c.load ?? 'pump']
  const ctx: Ctx = { hidden: opts?.hidden ?? NO_HIDDEN, I, v: c.volt, cls, amb: c.amb, starts: c.starts, delta: c.conn === 'delta', c }
  const ok: Recommendation[] = []
  const excluded: Excluded[] = []

  for (const id of SERIES_ORDER) {
    const s = catalog.series[id]
    const meta = SERIES_META[id]
    const r = evaluate(id, ctx)
    if ('x' in r) {
      excluded.push({ seriesId: id, seriesName: s.name, reason: r.x })
      continue
    }
    ok.push({
      step: c.steps?.[id] ?? 0,
      pending: pendingOf(id, r.item.code, c),
      seriesId: id,
      seriesName: s.name,
      line: meta.line,
      positioning: meta.pos ?? s.positioning,
      img: meta.img,
      model: r.item.code,
      ratedA: r.item.a,
      marginPct: ((r.item.a - r.need) / r.need) * 100,
      need: r.need,
      cond: r.cond,
      next: r.next ? { model: r.next.code, ratedA: r.next.a } : null,
      warn: r.warn,
      info: r.info,
      spec: meta.spec,
      catalog: meta.cat,
      pages: r.pages ?? meta.pages ?? [{ page: 6, label: '선택 가이드' }],
    })
  }
  ok.sort((a, b) => a.marginPct - b.marginPct) // 안정 정렬: 동률은 SERIES 순서 유지
  return { amp: I, kw, formula, ok, excluded }
}

export { calcCurrent, fmtA } from './current'
