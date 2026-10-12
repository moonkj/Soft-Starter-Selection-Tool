// 엔진(순수 함수)과 UI 사이의 계약. 양쪽 모두 이 파일만 기준으로 한다.
/** 조작전원: AC110V / AC220V / AC380~440V(SSC만) / DC24V. 시리즈마다 형명 코드가 다르다(SSC·SSM C1/C2, LSFS 1/2, LVSS -1/-2 또는 공통). */
export type ControlPower = 'AC110' | 'AC220' | 'AC380' | 'DC24'
export type Unit = 'kW' | 'A'
export type LoadKey = 'pump' | 'fan' | 'comp' | 'conv' | 'mixer' | 'crusher'

/** 화면에서 넘기는 조건. 입력이 바뀔 때마다 select()를 다시 부른다. */
export interface Conditions {
  volt: number            // V (고압도 V 단위, 예: 6600)
  hz: 50 | 60
  cap: number            // 입력값 (unit 기준)
  unit: Unit
  cls?: 10 | 20 | 30      // Trip Class (우선)
  load?: LoadKey          // cls가 없을 때만 사용 (부하→Class 환산, 테스트용)
  amb: number            // 주위 온도 °C (40/45/50/55)
  starts: number         // 시간당 기동 횟수 대표값 (3 / 5 / 10)
  control?: ControlPower | ''  // 조작전원 (SSC·SSM·LSFS·LVSS 공통 입력). '' = 선택 안 함(형명에 ?로 표시), undefined = 지정 없음(기존 동작)
  panel?: 'L' | 'M' | 'P' | ''  // SSH 판넬 타입 (''= 선택 안 함, undefined = L)
  lsfs?: LsfsOptions       // LSFS 형명 조합 옵션
  lhvs?: LhvsOptions       // LHVS 형명 조합 옵션
  ssh?: SshOptions         // SSH 형명 조합 옵션 (없으면 옵션 없는 짧은 형명)
  conn: 'line' | 'delta'
  na: boolean            // UL/cETL 필수
  bp: boolean            // 바이패스 내장 필수
  pr: boolean            // 모터 보호 내장 필수
}

export interface CatalogPage { page: number; label: string }

export interface Recommendation {
  seriesId: string       // 'ssce' | 'ssci' | 'ssme' | 'ssmi' | 'lvss' | 'lsfs-s' | 'lsfs-b' | 'lhvs' | 'ssh'
  seriesName: string
  line: string
  positioning: string
  img: string            // 'img/ssce.jpg' (public 기준 상대경로)
  model: string          // 모델 코드
  ratedA: number
  marginPct: number      // (정격-기준)/기준 *100
  need: number           // 이 시리즈에서 쓴 기준 전류 (In-delta면 모터 정격전류/√3)
  cond: string           // 정격 조건 문구
  next: { model: string; ratedA: number } | null
  warn: string[]
  info: string[]
  spec: Record<string, string>   // 주요 사양 줄
  catalog: 'lsfs' | 'lvss' | 'ssx'
  pages: CatalogPage[]   // 카탈로그 모달 목록 (LVSS는 Frame별로 달라짐)
}

export interface Excluded { seriesId: string; seriesName: string; reason: string }

export interface SelectResult {
  amp: number            // 계산된 기준 전류 (모터 정격전류, A)
  kw: number | null
  formula: string
  ok: Recommendation[]   // 여유율 오름차순
  excluded: Excluded[]
}

export interface SelectOptions {
  /** 판매하지 않는(숨긴) 모델 키 집합. 키 규칙은 model-key.ts */
  hidden?: ReadonlySet<string>
}

/** SSH 형명 ⑤~⑩ 옵션 코드. 고르지 않은 칸은 ''(형명에 ?로 표시) */
export interface SshOptions { sc: string; e: string; f: string; l: string; b: string; pf: string }
export const SSH_DEFAULTS: SshOptions = { sc: '', e: '', f: '', l: '', b: '', pf: '' }

/** LSFS 형명 옵션 (카탈로그 6쪽): 통신 C/0, 디스플레이 0(기본형)/1(분리형), Cable 0~3m(분리형만) */
export interface LsfsOptions { comm: 'C' | '0' | ''; disp: '0' | '1' | ''; cable: '0' | '1' | '2' | '3' | '' }
export const LSFS_DEFAULTS: LsfsOptions = { comm: '', disp: '', cable: '' }
/** LHVS 형명 옵션 (카탈로그 7쪽): VCB 1(12.5kA)/2(25kA)/4(40kA), VCS 4(4kA), 계측기 D(사용)/N(미사용) */
export interface LhvsOptions { vcb: '1' | '2' | '4' | ''; vcs: '4' | ''; meter: 'D' | 'N' | '' }
export const LHVS_DEFAULTS: LhvsOptions = { vcb: '', vcs: '', meter: '' }
