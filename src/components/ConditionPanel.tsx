import type { ControlPower, LhvsOptions, LsfsOptions, SshOptions, Unit } from '../engine/types'
import { CLASSES } from './common'
import '../styles/input.css'

export interface FormState {
  volt: number; hz: 50 | 60; cap: string; unit: Unit; cls: 10 | 20 | 30
  control: ControlPower | ''; panel: 'L' | 'M' | 'P' | ''; ssh: SshOptions; lsfs: LsfsOptions; lhvs: LhvsOptions; amb: number | ''; starts: number | ''; conn: 'line' | 'delta' | ''; na: boolean; bp: boolean; pr: boolean
}

const LSFS_OPTS: [keyof LsfsOptions, string, [string, string][]][] = [
  ['comm', '통신기능', [['0', '0 · 없음'], ['C', 'C · 포함']]],
  ['disp', '디스플레이', [['0', '0 · 기본형'], ['1', '1 · 분리형']]],
  ['cable', 'Cable 길이 (분리형만)', [['0', '0m'], ['1', '1m'], ['2', '2m'], ['3', '3m']]],
]
const LHVS_OPTS: [keyof LhvsOptions, string, [string, string][]][] = [
  ['vcb', 'VCB 차단용량', [['1', '1 · 12.5kA'], ['2', '2 · 25kA'], ['4', '4 · 40kA']]],
  ['vcs', 'VCS 차단용량', [['4', '4 · 4kA']]],
  ['meter', '계측기 (GIMAC-V)', [['D', 'D · 사용'], ['N', 'N · 미사용']]],
]
type OptRow = [string, string, [string, string][], (v: string) => void, boolean?]

/** 형명 옵션 묶음. 조합이 많아 설계팀 확인이 필요하다는 안내를 같이 보여준다. */
function OptGroup({ title, show, rows, check }: { title: string; show: boolean; rows: OptRow[]; check?: boolean }) {
  if (!show) return null
  return (
    <div className="field optgroup" role="group" aria-label={title}>
      <span className="lab">{title}</span>
      {rows.map(([label, value, opts, onChange, off]) => (
        <label key={label} className="optrow">
          <span>{label}</span>
          <select value={value} disabled={off} onChange={(e) => onChange(e.target.value)}>
            <option value="">선택 안 함</option>
            {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
      ))}
      <span className="hint">{check ? '고르지 않은 칸은 형명에 ?로 남아요. 옵션 조합이 많아 설계팀 확인이 필요해요.' : '고르지 않은 칸은 형명에 ?로 남아요.'}</span>
    </div>
  )
}

const SSH_OPTS: [keyof SshOptions, string, [string, string][]][] = [
  ['sc', '단락 용량', [['SC07', 'SC07 · 7kA'], ['SC16', 'SC16 · 16kA'], ['SC20', 'SC20 · 20kA'], ['SC25', 'SC25 · 25kA'], ['SC31', 'SC31 · 31.5kA'], ['SC40', 'SC40 · 40kA'], ['SC50', 'SC50 · 50kA']]],
  ['e', '판넬 구성', [['E0', 'E0 · 소프트스타터만'], ['E1', 'E1 · + Bypass'], ['E2', 'E2 · + 입력측 + Bypass'], ['E3', 'E3 · + 단로기 + 입력측 + Bypass']]],
  ['f', '고압 퓨즈', [['F0', 'F0 · 없음'], ['F1', 'F1 · 설치']]],
  ['l', '입력측 보호', [['L0', 'L0 · 없음'], ['L1', 'L1 · VC 고정형'], ['L2', 'L2 · VC 인출형'], ['L3', 'L3 · VCB 고정형'], ['L4', 'L4 · VCB 인출형']]],
  ['b', 'Bypass 장치', [['B0', 'B0 · 없음'], ['B1', 'B1 · VC 고정형'], ['B2', 'B2 · VC 인출형'], ['B3', 'B3 · VCB 고정형'], ['B4', 'B4 · VCB 인출형']]],
  ['pf', '역률보상(PFC)', [['PF0', 'PF0 · 없음'], ['PF1', 'PF1 · 있음']]],
]

const LOW = [220, 230, 380, 400, 415, 440, 460, 480, 575, 600, 690]
const HIGH: [number, string][] = [[2300, '2.3 kV'], [3300, '3.3 kV'], [4160, '4.16 kV'], [6600, '6.6 kV'], [11000, '11 kV'], [13800, '13.8 kV']]

export default function ConditionPanel({ s, set }: { s: FormState; set: (p: Partial<FormState>) => void }) {
  const desc = CLASSES.find((x) => x.cls === s.cls)?.desc
  return (
    <form className="panel" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
      <h2>사용 조건</h2>
      <p className="sub">전압과 용량만 넣어도 추천이 나와요. 예시로 380V 55kW가 들어 있어요.</p>

      <div className="field">
        <label htmlFor="volt" className="req">전원 전압</label>
        <div className="row">
          <select id="volt" className="grow" value={s.volt} onChange={(e) => set({ volt: +e.target.value })}>
            <optgroup label="저압">{LOW.map((v) => <option key={v} value={v}>{v} V</option>)}</optgroup>
            <optgroup label="고압">{HIGH.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</optgroup>
          </select>
          <div className="seg" role="group" aria-label="주파수">
            {([50, 60] as const).map((h) => (
              <button key={h} type="button" aria-pressed={s.hz === h} onClick={() => set({ hz: h })}>{h}Hz</button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="cap" className="req">모터 용량</label>
        <div className="row">
          <input type="number" id="cap" className="grow num" min="0" step="any" inputMode="decimal"
            value={s.cap} onChange={(e) => set({ cap: e.target.value })} />
          <select id="unit" className="unit" value={s.unit} onChange={(e) => set({ unit: e.target.value as Unit })}>
            <option value="kW">kW</option><option value="A">A (모터 정격전류)</option>
          </select>
        </div>
        <span className="hint">{s.unit === 'A' ? '모터 명판의 정격전류를 그대로 써요.' : '모터 명판의 정격전류(A)를 알면 A로 넣는 게 가장 정확해요. kW는 일반 효율로 환산해서 카탈로그 kW표와 다를 수 있어요.'}</span>
      </div>

      <div className="field">
        <span className="lab">Trip Class</span>
        <div className="chips" role="group" aria-label="Trip Class">
          {CLASSES.map((x) => (
            <button key={x.cls} type="button" className="chip" aria-pressed={s.cls === x.cls} onClick={() => set({ cls: x.cls })}>{x.n}</button>
          ))}
        </div>
        <span className="hint desc">{desc}</span>
      </div>

      <details className="more">
        <summary>상세 조건</summary>
        <div className="inner">
          <p className="hint" style={{ margin: '0 0 12px' }}>고르지 않은 조건(-)은 반영하지 않아요. 계산은 40°C 이하, 시간당 3회 이하, In-line 기준이에요.</p>
          <div className="field">
            <label htmlFor="amb">주위 온도</label>
            <select id="amb" value={s.amb} onChange={(e) => set({ amb: e.target.value === '' ? '' : +e.target.value })}>
              <option value="">-</option><option value={40}>40°C 이하</option><option value={45}>45°C</option><option value={50}>50°C</option><option value={55}>55°C</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="starts">시간당 기동 횟수</label>
            <select id="starts" value={s.starts} onChange={(e) => set({ starts: e.target.value === '' ? '' : +e.target.value })}>
              <option value="">-</option><option value={3}>3회 이하</option><option value={5}>4~5회</option><option value={10}>6~10회</option>
            </select>
          </div>
          {s.volt < 2000 && (
            <div className="field">
              <label htmlFor="control">조작전원</label>
              <select id="control" value={s.control} onChange={(e) => set({ control: e.target.value as ControlPower | '' })}>
                <option value="">선택 안 함</option><option value="AC110">AC110V</option><option value="AC220">AC220V</option><option value="AC380">AC380~440V (SSC만)</option><option value="DC24">DC24V</option>
              </select>
              <span className="hint">고르지 않아도 돼요. SSC·SSM·LSFS·LVSS에 적용돼요. 시리즈마다 형명 코드가 달라요(C1/C2, 1/2, -1/-2). LVSS 101~305는 세 가지 공통이에요.</span>
            </div>
          )}
          <OptGroup title="LSFS 형명 옵션" show={s.volt < 2000} check
            rows={LSFS_OPTS.map(([k, label, opts]) => [label, s.lsfs[k], opts, (v: string) => set({ lsfs: { ...s.lsfs, [k]: v, ...(k === 'disp' && v !== '1' ? { cable: '' } : {}) } }), k === 'cable' && s.lsfs.disp !== '1'] as OptRow)} />
          <OptGroup title="LHVS 형명 옵션" show={s.volt >= 2000} check
            rows={LHVS_OPTS.map(([k, label, opts]) => [label, s.lhvs[k], opts, (v: string) => set({ lhvs: { ...s.lhvs, [k]: v } })] as OptRow)} />
          <OptGroup title="SSH 형명 옵션" show={s.volt >= 2000} check
            rows={[['판넬 타입', s.panel, [['L', 'L · IEC 표준'], ['M', 'M · IEC 표준'], ['P', 'P · NEMA 표준']], (v) => set({ panel: v as 'L' | 'M' | 'P' | '' })] as OptRow,
              ...SSH_OPTS.map(([k, label, opts]) => [label, s.ssh[k], opts, (v: string) => set({ ssh: { ...s.ssh, [k]: v } })] as OptRow)]} />
          <div className="field">
            <label htmlFor="conn">결선 방식</label>
            <select id="conn" value={s.conn} onChange={(e) => set({ conn: e.target.value as 'line' | 'delta' | '' })}>
              <option value="">-</option><option value="line">In-line (일반 3선)</option><option value="delta">In-delta (6선)</option>
            </select>
          </div>
          <div className="field checks">
            <span className="lab">꼭 필요한 조건</span>
            <label className="check"><input type="checkbox" checked={s.na} onChange={(e) => set({ na: e.target.checked })} /> 북미 인증 (UL / cETL)</label>
            <label className="check"><input type="checkbox" checked={s.bp} onChange={(e) => set({ bp: e.target.checked })} /> 바이패스 내장</label>
            <label className="check"><input type="checkbox" checked={s.pr} onChange={(e) => set({ pr: e.target.checked })} /> 모터 보호 기능 내장</label>
          </div>
        </div>
      </details>
    </form>
  )
}
