import type { ReactNode } from 'react'
import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { hasDelta, marginText } from './common'

export default function CompareTable({ sel, hiddenCount = 0, onRemove }: {
  sel: Recommendation[]; hiddenCount?: number; onRemove?: (r: Recommendation) => void
}) {
  const note = hiddenCount > 0 && (
    <p className="hint">조건이 달라져서 숨겨진 비교 {hiddenCount}개가 있어요. 조건을 되돌리면 다시 보여요.</p>
  )
  if (!sel.length) return <><div className="empty">카드에서 '비교에 담기'를 눌러 보세요.</div>{note}</>
  const rows: [string, (r: Recommendation) => ReactNode][] = [
    ['형명', (r) => <span className="num">{r.model}</span>],
    ['제품 정격 전류', (r) => <><span className="num">{r.ratedA} A</span> <span className="hint">{r.cond}</span></>],
    ['정격 여유', (r) => <span className="num">{marginText(r.marginPct)}</span>],
    ['전압', (r) => r.spec['전압']],
    ['바이패스', (r) => r.spec['바이패스']],
    ['모터 보호', (r) => r.spec['모터 보호']],
    ['인증', (r) => r.spec['인증']],
    ['In-delta', (r) => (hasDelta(r) ? '지원' : '미지원')],
    ['표시·조작', (r) => r.spec['조작']],
    ['통신', (r) => r.spec['통신']],
    ['주의', (r) => (r.warn.length ? r.warn.map((w, i) => <span key={i}>{i > 0 && <br />}{w}</span>) : '—')],
  ]
  const key = (r: Recommendation) => r.seriesId + '|' + r.model
  return (
    <>
      <div className="tbl-wrap cmp" role="region" aria-label="모델 비교표" tabIndex={0}>
        <table>
          <caption className="sr-only">선택한 모델 비교</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">항목</span></th>
              {sel.map((r) => (
                <th scope="col" key={key(r)}>
                  {r.seriesName}
                  <div className="hint" style={{ fontWeight: 400 }}>{r.line}</div>
                  {onRemove && <button type="button" className="linkbtn" onClick={() => onRemove(r)} aria-label={`${r.model} 비교에서 빼기`}>빼기</button>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, f]) => (
              <tr key={k}><th scope="row">{k}</th>{sel.map((r) => <td key={key(r)}>{f(r)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {note}
    </>
  )
}
