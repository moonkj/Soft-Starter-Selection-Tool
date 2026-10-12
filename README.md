# Soft Starter 선정 도구

정적 웹사이트(서버·DB 없음)라서 무료 호스팅에 그대로 올릴 수 있다.

```
npm install
npm run dev      # 개발
npm test         # 선정 로직 테스트 (C1~C7)
npm run build    # dist/ 생성
```

## 무료 배포 (택1)
- Cloudflare Pages: 빌드 명령 `npm run build`, 출력 폴더 `dist`
- GitHub Pages: 저장소에 올리면 `.github/workflows/deploy.yml`이 자동 배포 (Settings > Pages > Source: GitHub Actions)
- Netlify: 빌드 `npm run build`, 게시 폴더 `dist`

주의: 비공개 저장소의 GitHub Pages는 유료 플랜이 필요하다. 사내용 정보(생산처)가 있으므로 공개 전 SPEC.md 8장을 확인한다.

## 생산처(ODM) 정보
공개 저장소와 공개 사이트에는 생산처(ODM) 정보를 넣지 않는다. 생산처 이름은 사내 PC의 `src/admin/makers.local.ts`(.gitignore 대상)에만 두고, 이 파일이 없으면 관리자 화면에는 "생산처 A/B/C"로 표시된다. 웹용 `src/data/catalog.json`에는 odm 필드가 없다.
관리자 모드는 **사내 PC 빌드에서만** 켜진다(`.env.local`의 `VITE_ADMIN=1`). GitHub Actions 등 공개 빌드에는 관리자 코드, 생산처, 비밀번호가 들어가지 않는다.

## 관리자 모드 (모델 노출 설정)
- 켜는 법: `.env.example`을 `.env.local`로 복사해 `VITE_ADMIN=1`과 `VITE_ADMIN_PASSWORD=비밀번호`를 채우고 `미리보기.bat`(또는 `npm run dev`)로 연다. 진입은 화면 오른쪽 위 [관리자] 버튼 또는 주소 뒤 `#/admin`이다. 비밀번호는 소스가 아니라 `.env.local`에서만 읽는다.
- **보안이 아니다.** 비밀번호는 브라우저에서만 확인하는 가벼운 잠금이다. 사내 PC에서만 쓰는 도구라는 전제이고, 공개 사이트에는 관리자 화면 자체가 없다.
- 기능: 전체 모델(217개) 표, 시리즈·생산처 필터, 모델명 검색, 열 머리글 정렬, 회사별 그룹 보기, 개별/일괄/시리즈별 노출·숨김, 숨김 개수 표시.
- 단종 처리 절차
  1. `#/admin`에서 단종 모델을 [숨김]으로 바꾼다. 이 브라우저의 일반 화면에는 바로 반영된다(위에 안내 띠가 뜬다).
  2. [설정 파일 내보내기]로 `model-visibility.json`을 받는다. (이전 설정은 [설정 파일 가져오기]로 불러온다.)
  3. 받은 파일을 `public/config/model-visibility.json`에 덮어쓰고 다시 배포한다. 그때부터 모든 사용자에게 적용된다.
  4. 확인이 끝나면 [임시 저장 지우기]로 이 브라우저의 임시 설정을 지운다.
- 동작: 숨긴 모델은 선정에서 빠지고 같은 시리즈의 다음 큰 노출 모델이 선정된다. "한 단계 위"도 숨긴 모델을 건너뛴다. 시리즈가 모두 숨겨지면 제외 사유가 "현재 판매하지 않는 모델"로 나온다.
- 모델 키: `시리즈ID|catalog.json의 code` (예: `lvss|LS-LVSS-505-1`, `lvss|LS-LVSS-505-2`, `ssce|SSCe-018`, `ssh|SSH-0070`). LVSS는 -1/-2가 각각의 행이고, 나머지 시리즈는 기본 모델 행이다. 전압·제어전원·옵션·주파수는 형명 조합기가 입력 조건으로 붙이므로 행이 아니다. 그래서 "V6만", "C2만" 같은 옵션별 단종은 지금 구조로는 표현할 수 없다.
- 한계
  - 서버가 없어서 설정은 파일 재배포로만 모든 사용자에게 적용된다. 임시 저장(localStorage)은 그 브라우저에서만 보인다.
  - 앱은 시작할 때 `config/model-visibility.json`을 받아 적용한다. 받지 못하면 전부 노출한다.
  - 관리자 표의 모델명은 모델 행 기준이다. 조합기 시리즈(SSC·SSM·SSH·LHVS·LSFS)는 기본 모델만 보이고, 고객 카드에서는 입력한 전압·옵션이 붙은 형명으로 나온다.

## 배포 규칙
- 공개 사이트는 GitHub Actions(.github/workflows/deploy.yml)가 만든 결과물만 쓴다. 이 빌드에는 .env.local이 없어서 관리자 코드·생산처·비밀번호가 들어가지 않는다.
- 사내 PC에서 `npm run build`나 `미리보기.bat`로 만든 dist/에는 .env.local 때문에 관리자 코드가 들어간다. 이 폴더를 다른 곳에 수동으로 올리지 않는다. 수동 공개 빌드가 꼭 필요하면 `VITE_ADMIN=0 VITE_ADMIN_PASSWORD= npx vite build`를 쓴다.
- 단종 설정(public/config/model-visibility.json)을 못 읽으면 화면에 경고가 뜬다. 설정을 고친 뒤에는 다시 배포한다.

## 저작권·상표
카탈로그 PDF, 카탈로그 페이지 이미지, 제품 사진, 상표의 권리는 각 권리자에게 있다. 이 저장소의 코드와 별개로 취급한다.
