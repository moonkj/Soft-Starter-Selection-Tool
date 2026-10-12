import { CONTROL_TXT, fmtA, startsText, voltText } from './common'
import type { FormState } from './ConditionPanel'
import '../styles/input.css'

/** 상세 조건 한 칸. 고른 값은 강조색, 안 고른 칸은 '-'로 흐리게 보여준다. */
function Pick({ label, v }: { label: string; v: string }) {
  return <span className={v ? 'pick sel' : 'pick'}>{label} <b>{v || '-'}</b></span>
}

export default function Readout({ s, amp, formula }: { s: FormState; amp: number; formula: string }) {
  const cap = +s.cap || 0
  const count = (o: object) => Object.values(o).filter((x) => x !== '').length
  const picked = (s.volt < 2000 ? count(s.lsfs) : count(s.lhvs) + count(s.ssh) + (s.panel ? 1 : 0))
  return (
    <section className="readout" aria-live="polite">
      <div>
        <div className="lbl">선정 기준 전류</div>
        <div className="amp">{amp > 0 ? <>{fmtA(amp)}<small>A</small></> : '—'}</div>
      </div>
      <div className="ro-body">
        <div className="cond">
          <span className="pick sel"><b>{voltText(s.volt)}</b> · {s.hz}Hz</span>
          <span className="pick sel"><b>{cap} {s.unit}</b></span>
          <span className="pick sel"><b>Trip Class {s.cls}</b></span>
          <Pick label="주위" v={s.amb === '' ? '' : s.amb === 40 ? '40°C 이하' : `${s.amb}°C`} />
          <Pick label="기동" v={s.starts === '' ? '' : `시간당 ${startsText(s.starts)}`} />
          <Pick label="결선" v={s.conn === 'delta' ? 'In-delta' : s.conn === 'line' ? 'In-line' : ''} />
          {s.volt < 2000 && <Pick label="조작전원" v={CONTROL_TXT[s.control]} />}
          <Pick label="형명 옵션" v={picked ? `${picked}개 선택` : ''} />
        </div>
        <div className="formula">{amp > 0 ? formula : ''}</div>
      </div>
    </section>
  )
}
