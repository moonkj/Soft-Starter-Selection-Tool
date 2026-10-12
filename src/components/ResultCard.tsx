import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { Icon, asset, fmtA, hasNA } from './common'

/** 마지막 글자에 받침이 있으면 '을', 없으면 '를' (한글이 아니면 '를') */
function eulReul(w: string) {
  const c = w.charCodeAt(w.length - 1)
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '을' : '를'
}

const SPEC_KEYS = ['바이패스', '모터 보호', '인증', '조작']

export default function ResultCard({ r, best, inCmp, onCat, onCmp, onStep }: {
  r: Recommendation; best: boolean; inCmp: boolean
  onCat: () => void; onCmp: () => void; onStep: (delta: number) => void
}) {
  const pct = Math.round(r.marginPct)
  const fill = Math.min(100, (r.need / r.ratedA) * 100)
  return (
    <article className={'card' + (best ? ' best' : '')}>
      <div className="card-top">
        <div className="thumb"><img src={asset(r.img)} alt={`${r.seriesName} 제품 사진`} loading="lazy" /></div>
        <div style={{ minWidth: 0 }}>
          <div className="tags">
            {best && <span className="tag best">가장 근접</span>}
            {hasNA(r) && <span className="tag na">북미 인증</span>}
          </div>
          <div className="series">{r.line} · {r.seriesName}</div>
          <div className={'model' + (r.model.length > 18 ? ' long' : '')}>{r.model}</div>
          {r.model.includes('?') && <div className="qhint"><b>?</b> 아직 고르지 않은 옵션이에요.{r.pending.length ? <> 상세 조건에서 <b className="qlist">{r.pending.join(', ')}</b>{eulReul(r.pending[r.pending.length - 1])} 고르면 형명이 완성돼요.</> : ' 상세 조건에서 선택하면 형명이 완성돼요.'}</div>}
          <div className="pos">{r.positioning}</div>
        </div>
      </div>
      <div className="meter">
        <div className="nums">
          <span>필요 <b>{fmtA(r.need)} A</b> / 정격 <b>{r.ratedA} A</b></span>
          <span>정격 여유 <span className={'margin ' + (pct > 40 ? 'hi' : 'ok')}>+{pct}%</span></span>
        </div>
        <div className="bar" title="정격 대비 사용률"><i style={{ width: fill + '%' }} /></div>
        <div className="hint" style={{ marginTop: 5 }}>{r.cond}</div>
      </div>
      {r.step > 0 && <div className="stepbar">한 단계 위 모델을 보고 있어요.<button type="button" className="linkbtn" onClick={() => onStep(-1)}>원래 모델로</button></div>}
      {r.next && (
        <div className="alt">
          <span>한 단계 위: <b>{r.next.model}</b> ({r.next.ratedA} A)</span>
          <button type="button" className="linkbtn" onClick={() => onStep(1)}>이 모델로 보기</button>
        </div>
      )}
      <div className="notes">
        {r.marginPct < 5 && <div className="note">정격 여유가 5% 미만이에요. {r.next ? <>한 단계 위 모델(<b>{r.next.model}</b>)로 바꿔 보거나 비교에 담아 확인해 보세요. <button type="button" className="linkbtn" onClick={() => onStep(1)}>한 단계 위로 보기</button></> : '더 큰 모델이 없어서 기술 확인이 필요해요.'}</div>}
        {r.warn.map((w, i) => <div className="note" key={'w' + i}>{w}</div>)}
        {r.info.map((w, i) => <div className="note info" key={'i' + i}>{w}</div>)}
      </div>
      <dl className="specs">
        {SPEC_KEYS.map((k) => (
          <Row key={k} k={k} v={r.spec[k]} />
        ))}
      </dl>
      <div className="card-act">
        <button type="button" className="btn primary" onClick={onCat}>{Icon.book}카탈로그 보기</button>
        <button type="button" className="btn" aria-pressed={inCmp} onClick={onCmp}>
          {inCmp ? <>{Icon.check}비교에 담김</> : <>{Icon.plus}비교에 담기</>}
        </button>
      </div>
    </article>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  )
}
