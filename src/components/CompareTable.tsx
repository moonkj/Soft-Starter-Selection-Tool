import type { ReactNode } from 'react'
import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { hasDelta } from './common'

export default function CompareTable({ sel }: { sel: Recommendation[] }) {
  if (!sel.length) return <div className="empty">아직 담은 모델이 없어요.</div>
  const rows: [string, (r: Recommendation) => ReactNode][] = [
    ['모델', (r) => <span className="num">{r.model}</span>],
    ['정격 전류', (r) => <><span className="num">{r.ratedA} A</span> <span className="hint">{r.cond}</span></>],
    ['정격 여유', (r) => <span className="num">+{Math.round(r.marginPct)}%</span>],
    ['전압', (r) => r.spec['전압']],
    ['바이패스', (r) => r.spec['바이패스']],
    ['모터 보호', (r) => r.spec['모터 보호']],
    ['인증', (r) => r.spec['인증']],
    ['In-delta', (r) => (hasDelta(r) ? '지원' : '미지원')],
    ['조작부', (r) => r.spec['조작']],
    ['통신', (r) => r.spec['통신']],
    ['주의', (r) => (r.warn.length ? r.warn.map((w, i) => <span key={i}>{i > 0 && <br />}{w}</span>) : '—')],
  ]
  return (
    <div className="tbl-wrap cmp">
      <table>
        <thead>
          <tr>
            <th></th>
            {sel.map((r) => (
              <th key={r.seriesId}>{r.seriesName}<div className="hint" style={{ fontWeight: 400 }}>{r.line}</div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, f]) => (
            <tr key={k}><th>{k}</th>{sel.map((r) => <td key={r.seriesId}>{f(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
