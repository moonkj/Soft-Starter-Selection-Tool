import { useState } from 'react'
import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { CONTROL_TXT, fmtA, startsText, voltText } from './common'
import type { FormState } from './ConditionPanel'

export default function QuoteBox({ s, amp, pick, toast }: {
  s: FormState; amp: number; pick: Recommendation[]; toast: (m: string) => void
}) {
  const [co, setCo] = useState('')
  const [name, setName] = useState('')
  const [mail, setMail] = useState('')
  const [qty, setQty] = useState('1')
  const [memo, setMemo] = useState('')
  const cap = +s.cap || 0
  const req = [s.na && 'UL/cETL', s.bp && '바이패스 내장', s.pr && '모터 보호'].filter(Boolean).join(', ')
  // 고르지 않은 상세 조건은 문의서에 적지 않는다
  const detail = [
    s.amb !== '' && `주위 ${s.amb}°C`,
    s.starts !== '' && `시간당 기동 ${startsText(s.starts)}`,
    s.conn !== '' && `결선 ${s.conn === 'delta' ? 'In-delta' : 'In-line'}`,
  ].filter(Boolean) as string[]
  const unfinished = pick.some((r) => r.model.includes('?'))
  const empty = !(cap > 0) || !pick.length
  const text = [
    '[Soft Starter 견적 문의]', '',
    `회사명   : ${co || '-'}`, `담당자   : ${name || '-'}`, `이메일   : ${mail || '-'}`, `수량     : ${qty || 1}대`, '',
    '■ 사용 조건',
    `- 전원 : ${voltText(s.volt, false)} / ${s.hz}Hz`,
    `- 모터 : ${cap}${s.unit === 'A' ? 'A (모터 정격전류)' : s.unit}  → 선정 기준 ${amp > 0 ? fmtA(amp) : '-'}A`,
    `- Trip Class : ${s.cls}`,
    ...(detail.length ? [`- ${detail.join(', ')}`] : []),
    ...(s.control ? [`- 조작전원 : ${CONTROL_TXT[s.control]}`] : []),
    ...(req ? [`- 필수 : ${req}`] : []), '',
    '■ 후보 모델',
    ...(pick.length
      ? pick.map((r) => `- ${r.model}  (${r.line} ${r.seriesName}, 정격 ${r.ratedA}A, 정격 여유 +${Math.round(r.marginPct)}%)`)
      : ['- 조건에 맞는 모델 없음 (기술 검토 요청)']), '',
    ...(unfinished ? ['※ 형명의 ?는 아직 정하지 않은 옵션입니다. 확정 후 알려 주세요.', ''] : []),
    '■ 요청 사항', memo || '-',
  ].join('\n')

  const copy = () => {
    const fallback = () => {
      const el = document.getElementById('q-out')
      if (el) {
        const r = document.createRange()
        r.selectNodeContents(el)
        const sel = getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
      }
      toast('내용을 선택해 뒀어요. Ctrl+C로 복사하세요.')
    }
    try {
      navigator.clipboard.writeText(text).then(() => toast('문의 내용을 복사했어요.'), fallback)
    } catch {
      fallback()
    }
  }

  return (
    <div className="two quote">
      <form className="box" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <h3>연락처</h3>
        <div className="field"><label htmlFor="q-co">회사명</label><input type="text" id="q-co" placeholder="예: 한빛수처리" value={co} onChange={(e) => setCo(e.target.value)} /></div>
        <div className="row">
          <div className="field grow"><label htmlFor="q-name">담당자</label><input type="text" id="q-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field" style={{ width: 96 }}><label htmlFor="q-qty">수량</label><input type="number" id="q-qty" min="1" className="num" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="q-mail">이메일</label><input type="email" id="q-mail" value={mail} onChange={(e) => setMail(e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="q-memo">요청 사항</label><textarea id="q-memo" placeholder="납기, 판넬 구성, 통신 옵션 등" value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
      </form>
      <div className="box">
        <h3>문의 내용 미리보기</h3>
        <pre className="quote" id="q-out">{text}</pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={copy} disabled={empty}>문의 내용 복사</button>
          <span className="hint" style={{ alignSelf: 'center' }}>{empty ? '모터 용량을 넣고 추천 모델이 나오면 복사할 수 있어요.' : '비교에 담은 모델이 있으면 그 모델로, 없으면 추천 1순위로 채워져요.'}</span>
        </div>
      </div>
    </div>
  )
}
