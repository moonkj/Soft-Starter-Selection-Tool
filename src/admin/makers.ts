// 생산처 표시명. 공개 저장소에는 가칭(A/B/C)만 있다.
// 실제 이름은 사내 PC의 src/admin/makers.local.ts(.gitignore 대상)에 두면 그것이 우선한다.
// 주의: 이 파일과 odm.json은 관리자 화면 청크에만 들어간다. 일반 화면 코드에서 import 하지 않는다.
import odm from './odm.json'

const local = import.meta.glob<{ LOCAL_MAKER_LABEL: Record<string, string> }>('./makers.local.ts', { eager: true })
const localLabels = Object.values(local)[0]?.LOCAL_MAKER_LABEL

export const MAKER_LABEL: Record<string, string> = localLabels ?? {
  A: '생산처 A',
  B: '생산처 B',
  C: '생산처 C',
}

/** 시리즈 ID -> 생산처 키 */
export const MAKER_OF_SERIES = odm as Record<string, string>

export const makerLabel = (key: string) => MAKER_LABEL[key] ?? key
