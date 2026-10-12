// catalog.json에 없는 표시용 메타(카탈로그 페이지, 사진, 주요 사양 줄 등). 정격 숫자는 여기에 두지 않는다.
import type { CatalogPage } from './types'

export type CatalogKey = 'lsfs' | 'lvss' | 'ssx'

export interface SeriesMeta {
  id: string
  line: string
  img: string
  cat: CatalogKey
  /** catalog.json의 positioning 대신 쓸 문구 (프로토타입과 표기가 다른 경우) */
  pos?: string
  spec: Record<string, string>
  /** null이면 LVSS처럼 선정 결과에 따라 달라짐 */
  pages: CatalogPage[] | null
}

const P = (pairs: [number, string][]): CatalogPage[] => pairs.map(([page, label]) => ({ page, label }))

export const SERIES_ORDER = ['ssce', 'ssci', 'ssme', 'ssmi', 'lvss', 'lsfs-s', 'lsfs-b', 'lhvs', 'ssh'] as const

export const SERIES_META: Record<string, SeriesMeta> = {
  ssce: {
    id: 'ssce', line: 'SSC 시리즈', img: 'img/ssce.jpg', cat: 'ssx',
    spec: { '전압': '200~575 V', '바이패스': '내장', '모터 보호': '없음 (기동·정지만)', '인증': 'IEC · UL · KC', '조작': 'LED + 로터리 스위치 3개', '통신': '옵션 (Modbus, Profibus 등)' },
    pages: P([[18, '제품 선정표'], [6, '형명체계·전류 정격'], [8, '정격 사양'], [7, '외형치수'], [16, '기능 비교']]),
  },
  ssci: {
    id: 'ssci', line: 'SSC 시리즈', img: 'img/ssci.jpg', cat: 'ssx',
    spec: { '전압': '200~575 V', '바이패스': '내장', '모터 보호': '과부하·결상·상불평형·써미스터 등', '인증': 'IEC · UL · KC', '조작': 'LED + 로터리 스위치 8개', '통신': '옵션 (Modbus, Profibus 등)' },
    pages: P([[18, '제품 선정표'], [6, '형명체계·전류 정격'], [8, '정격 사양'], [7, '외형치수'], [16, '기능 비교']]),
  },
  ssme: {
    id: 'ssme', line: 'SSM 시리즈', img: 'img/ssm.jpg', cat: 'ssx',
    spec: { '전압': '200~525 V', '바이패스': '내장', '모터 보호': '표준 모터 보호', '인증': 'IEC · UL · KC', '조작': '그래픽 디스플레이 (8개 언어)', '통신': 'Modbus RTU/TCP, Profibus, Profinet, EtherNet/IP 등 (옵션)' },
    pages: P([[19, '제품 선정표'], [12, '형명체계·전류 정격'], [14, '정격 사양'], [13, '외형치수'], [17, '기능 비교']]),
  },
  ssmi: {
    id: 'ssmi', line: 'SSM 시리즈', img: 'img/ssm.jpg', cat: 'ssx',
    spec: { '전압': '200~690 V', '바이패스': '내장', '모터 보호': '완전 모터 보호 (저전력·과전압 포함)', '인증': 'IEC · UL · KC', '조작': '그래픽 디스플레이 · 모터 2세트', '통신': 'Modbus RTU/TCP, Profibus, Profinet, EtherNet/IP 등 (옵션)' },
    pages: P([[19, '제품 선정표'], [12, '형명체계·전류 정격'], [14, '정격 사양'], [13, '외형치수'], [17, '기능 비교']]),
  },
  lvss: {
    id: 'lvss', line: 'Beyond X', img: 'img/lvss.jpg', cat: 'lvss',
    spec: { '전압': '200~480 V', '바이패스': '내장 (Frame 1~3) · 없음 (Frame 4~5)', '모터 보호': 'I²t 과부하·PTC 등', '인증': 'CE · cETL · KC', '조작': '3.5" 컬러 터치스크린 (17개 언어)', '통신': 'Modbus RTU 기본, EtherNet/IP·Modbus TCP·Profibus 옵션' },
    pages: null, // Frame별로 select()가 계산
  },
  'lsfs-s': {
    id: 'lsfs-s', line: 'Motorsol', img: 'img/lsfs.jpg', cat: 'lsfs',
    spec: { '전압': '220 / 380 / 440 V', '바이패스': '없음 (단방향)', '모터 보호': '과전류·결상·상불평형·지락·저전류 등', '인증': 'EN 61131-2 · EN 50178', '조작': 'LCD 4×20 (분리형 옵션)', '통신': 'RS-485 (옵션)' },
    pages: P([[8, '기종일람표 ①'], [9, '기종일람표 ②'], [6, '형명체계·주문방법'], [16, '외형치수']]),
  },
  'lsfs-b': {
    id: 'lsfs-b', line: 'Motorsol', img: 'img/lsfs.jpg', cat: 'lsfs',
    spec: { '전압': '220 / 380 / 440 V', '바이패스': 'MC 내장', '모터 보호': '과전류·결상·상불평형·지락·저전류 등', '인증': 'EN 61131-2 · EN 50178', '조작': 'LCD 4×20 (분리형 옵션)', '통신': 'RS-485 (옵션)' },
    pages: P([[10, '기종일람표 ①'], [11, '기종일람표 ②'], [6, '형명체계·주문방법'], [17, '외형치수']]),
  },
  lhvs: {
    id: 'lhvs', line: 'HV-Motorsol', img: 'img/lhvs.jpg', cat: 'lsfs', pos: '고압 판넬형 · 3.3 / 6.6kV',
    spec: { '전압': '3.3 / 6.6 kV', '바이패스': 'VCS 내장 (By-Pass형)', '모터 보호': '과전류·지락·결상·저전압 등', '인증': '카탈로그 표기 없음', '조작': '터치 모니터', '통신': 'RS-422/485' },
    pages: P([[12, '기종일람표 ①'], [13, '기종일람표 ②'], [7, '형명체계'], [18, '외형치수']]),
  },
  ssh: {
    id: 'ssh', line: 'SSH 시리즈', img: 'img/ssh.jpg', cat: 'ssx',
    spec: { '전압': '2.3~13.8 kV', '바이패스': '옵션 (VC / VCB)', '모터 보호': '완전 모터 보호 · 열 모델링', '인증': 'IEC 62271-200 Type Test · NEMA(P 시리즈)', '조작': '그래픽 디스플레이', '통신': 'Modbus, Profibus, Profinet, EtherNet/IP, IEC 61850' },
    pages: P([[22, '형명체계·판넬 정격'], [23, '옵션·기술 데이터']]),
  },
}

/** 부하 → Trip Class (프로토타입 LOADS) */
export const LOAD_CLASS: Record<string, 10 | 20 | 30> = {
  pump: 10, fan: 10, comp: 10, conv: 20, mixer: 20, crusher: 30,
}
