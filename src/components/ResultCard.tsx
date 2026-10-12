import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { Icon, asset, fmtA, hasNA, marginText } from './common'

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
    <article className={'card' + (best ? ' best' : '')} aria-labelledby={`m-${r.seriesId}`}>
      <div className="card-top">
        <div className="thumb"><img src={asset(r.img)} alt={`${r.seriesName} 제품 사진`} loading="lazy" /></div>
        <div style={{ minWidth: 0 }}>
          <div className="tags">
            {best && <span className="tag best">정격 여유 최소</span>}
            {hasNA(r) && <span className="tag na">북미 인증</span>}
          </div>
          <div className="series">{r.line} · {r.seriesName}</div>
          <h3 className={'model' + (r.model.length > 18 ? ' long' : '')} id={`m-${r.seriesId}`}>{r.model}</h3>
          {(r.model.includes('?') || r.pending.length > 0) && (
            <div className="qhint">
              {r.model.includes('?') ? <><b>?</b> 형명(주문 코드)에 아직 고르지 않은 옵션이 있어요.</> : <>형명(주문 코드)에 붙일 옵션이 아직 정해지지 않았어요.</>}
              {r.pending.length > 0 ? <> 상세 조건에서 <b className="qlist">{r.pending.join(', ')}</b>{eulReul(r.pending[r.pending.length - 1])} 고르면 형명이 완성돼요.</> : ' 상세 조건에서 선택하면 형명이 완성돼요.'}
            </div>
          )}
          <div className="pos">{r.positioning}</div>
        </div>
      </div>
      <div className="meter">
        <div className="nums">
          <span>필요 <b>{fmtA(r.need)} A</b> / 정격 <b>{r.ratedA} A</b></span>
          <span>정격 여유 <span className={'margin ' + (pct > 40 ? 'hi' : 'ok')}>{marginText(r.marginPct)}</span></span>
        </div>
        <div className="bar" title="필요 전류 ÷ 제품 정격 (막대가 길수록 여유가 작아요)"><i style={{ width: fill + '%' }} /></div>
        <div className="hint" style={{ marginTop: 5 }}>{r.cond}</div>
      </div>
      {r.step > 0 && <div className="stepbar">한 단계 위 모델을 보고 있어요.<button type="button" className="linkbtn" onClick={() => onStep(-1)}>원래 모델로</button></div>}
      {r.next && (
        <div className="alt">
          <span>한 단계 위: <b>{r.next.model}</b> ({r.next.ratedA} A)</span>
          <button type="button" className="linkbtn" onClick={() => onStep(1)}>한 단계 위로 바꿔 보기</button>
        </div>
      )}
      <div className="notes">
        {pct < 5 && <div className="note">정격 여유가 5% 미만이에요. {r.next ? <>위의 한 단계 위 모델(<b>{r.next.model}</b>)도 같이 확인해 보세요. 바꿔 보거나 비교에 담을 수 있어요.</> : '더 큰 모델이 없어요. 기술상담으로 확인해 주세요.'}</div>}
        {pct > 100 && <div className="note info">필요 전류보다 정격이 훨씬 커요({marginText(r.marginPct)}). 이 용량대에 더 작은 모델이 없거나 판매하지 않아서예요. 기술상담으로 확인해 주세요.</div>}
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
        <button type="button" className="btn" aria-pressed={inCmp} aria-label={`${r.model} 비교에 담기`} onClick={onCmp}>
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
