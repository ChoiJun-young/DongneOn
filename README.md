# 동네온 — GitHub + Vercel 공개 배포용 MVP

## 지금 완성된 범위

이 프로젝트는 여러 사람이 같은 주소에 접속할 수 있도록 배포하는 정적 웹입니다. Supabase 연결 후 이메일 인증과 키워드별 실제 공유 채팅을 사용합니다. **실제 지역별 실시간 화제 순위 수집은 아직 구현되지 않았습니다.** 성수 예시 100개 구조(상위 10개 상세 예시, 11~100위 구조 확인용 샘플)이며, 순위 변동 역시 예시입니다. 위치를 허용해도 순위 지역이 자동 변경되지는 않습니다.

- 지도: OpenStreetMap + Leaflet, CDN 2곳 순차 시도 → 실패 시 OpenStreetMap iframe 대체 지도
- 길찾기: 위치 허용 후 공개 OSRM 자동차 경로 조회, 카카오맵 길찾기와 네이버지도 검색 연결
- 도보 시간: 실제 보행 경로가 아닌 직선거리 / 시속 4km의 단순 추정
- 대체 지도: 선택 장소 1곳만 표시하며 경로 선 표시 불가
- 관련 콘텐츠: 실제 기사/블로그/영상 원문 목록이 아닌 플랫폼 검색 링크
- 회원: Supabase 이메일 OTP 인증. 닉네임은 고유 아이디가 아니며 중복 가능
- 채팅: Supabase Postgres + Realtime. 연결이 지연되면 15초 주기 조회로 보완
- 서버 설정 전: 로컬 닉네임/동일 브라우저 탭 채팅 체험
- 동네소식 / 정보 / 중고거래: 준비 중 화면

## 왜 이전 파일의 지도가 안 보였을까요?

이전 파일은 외부 Leaflet 파일 하나에 의존했습니다. 외부 CDN 차단이나 HTML 미리보기의 JavaScript 제한, 브라우저 보안 설정이 가능한 원인입니다. 실제 브라우저 오류를 확인한 것은 아니므로 원인을 확정하지는 않았습니다.

이번 버전은 앱 파일을 분리하고 두 CDN을 순차 시도하며 대체 지도를 제공합니다. **인터넷/외부 지도 접속 자체가 차단되면 여전히 표시되지 않을 수 있습니다.** 아래 지도의 외부 링크는 사용할 수 있습니다. Vercel HTTPS 주소에서 일반 브라우저로 여세요. 미리보기 화면은 스크립트/iframe을 제한할 수 있습니다.

## 파일 구성

```text
index.html       화면
styles.css       반응형 디자인
app.js           지도·경로·순위 선택·회원·채팅
config.js        Supabase 공개 주소/키
supabase.sql     테이블·작성자 검증·RLS·Realtime·기본 전송 제한
vercel.json      HTTPS 배포용 헤더 설정
.gitignore
README.md
```

## 1. GitHub에 올리기

1. ZIP을 풀고 GitHub에서 새 저장소를 만듭니다. 예: `dongneon`.
2. 저장소에서 **Add file → Upload files**로 파일들을 올립니다.
3. **저장소 최상위에서 `index.html`이 바로 보여야 합니다.** ZIP 자체나 상위 폴더만 올리지 마세요.
4. Commit changes로 저장합니다. `.gitignore`는 선택 사항이며 빠져도 실행에는 영향 없습니다.

## 2. Vercel에서 웹사이트 먼저 공개하기

1. Vercel 로그인 → **Add New / New Project**.
2. GitHub 계정 연결 → 위 저장소 Import.
3. Framework Preset: **Other**.
4. Root Directory: 저장소 최상위. 하위 폴더에 올렸다면 그 폴더를 지정합니다.
5. Build Command: 비움. 별도 빌드가 없는 정적 HTML입니다.
6. Output Directory: 기본값을 사용하고, 입력이 필요하다면 `.`(프로젝트 루트)로 설정합니다.
7. Deploy.
8. 생성된 Production HTTPS 주소를 브라우저에서 엽니다. 이제 같은 주소를 공유할 수 있습니다.
9. 다른 사람에게 인증 장벽이 나오면 Vercel의 Deployment Protection 설정을 확인하고, 공개할 Production 주소를 공유하세요. Preview 주소는 프로젝트 설정에 따라 접근이 제한될 수 있습니다.

이 단계에서는 **모두가 같은 웹페이지를 보지만 채팅은 아직 공유되지 않습니다.** 다음 단계가 필요합니다.

## 3. Supabase 데이터베이스 만들기

1. Supabase에서 프로젝트를 만듭니다.
2. **SQL Editor → New query**에서 `supabase.sql` 전체를 붙여 넣고 Run.
3. Table Editor에서 `public.messages` 테이블이 생겼는지 확인합니다.
4. SQL은 `messages`를 `supabase_realtime` publication에 추가합니다. 실패한 경우 Publications / Realtime 설정에서 messages 복제를 켭니다.
5. 프로젝트의 Connect / API 설정에서 Project URL과 **Publishable key**(또는 legacy anon public key)를 찾습니다. UI 이름은 바뀔 수 있습니다.

## 4. 이메일 인증 설정 — 중요

1. Authentication에서 Email 로그인 공급자를 활성화합니다.
2. Email Templates의 **Magic Link** 템플릿에 아래 변수를 넣어 링크 대신 코드를 보이게 합니다. 신규 가입용 Confirm signup 템플릿도 함께 점검하고 코드 변수를 넣으면 좋습니다.

```html
<h2>동네온 로그인 코드</h2>
<p>웹페이지에 아래 인증코드를 입력하세요.</p>
<p>{{ .Token }}</p>
```

`signInWithOtp`는 기본 템플릿이 링크라면 링크를 보냅니다. 이 앱은 **코드 입력 방식**이므로 `{{ .Token }}` 설정이 필요합니다.

3. Authentication의 URL Configuration에서 Site URL을 Vercel Production HTTPS 주소로 설정합니다.
4. 일반 사용자들에게 이메일을 보내려면 **Custom SMTP**를 설정합니다. 기본 발송 서비스는 테스트 목적의 발송 대상/횟수 제한이 있을 수 있습니다. 예: 이메일 발송 서비스에 도메인 인증을 완료하고 Supabase SMTP에 연결.
5. 인증 요청 횟수 제한과 재발송 대기 시간도 확인합니다. 코드를 반복 요청하면 제한에 걸릴 수 있습니다.

## 5. 공개 설정 연결 후 재배포

GitHub의 `config.js`를 아래처럼 수정합니다. 실제 프로젝트 값으로 바꿔야 합니다.

```javascript
window.DONGNEON_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublicKey: "YOUR_PUBLISHABLE_OR_ANON_PUBLIC_KEY"
};
```

- **이 키는 브라우저에 공개되어도 되는 종류만 사용합니다.** RLS가 데이터 접근을 제한합니다.
- `service_role`, `sb_secret_...`, 데이터베이스 비밀번호, 이메일 SMTP 비밀번호는 절대 GitHub/프런트엔드에 넣지 마세요.
- 이 버전은 정적 파일이므로 Vercel 환경변수만 추가해도 자동 반영되지 않습니다. `config.js` 공개 설정을 사용합니다.
- Commit하면 GitHub와 연결된 Vercel이 자동 재배포합니다.

화면에서 `이메일로 로그인`과 `공유 채팅` 표시를 확인하세요. 설정 값이 있지만 연결이 실패하면 로컬 채팅으로 조용히 바뀌지 않고 오류를 알립니다.

## 6. 실제로 두 사람이 테스트하기

1. 기기 A와 기기 B에서 같은 Production HTTPS 주소를 엽니다.
2. 각각 다른 이메일로 닉네임을 입력하고 인증코드를 받습니다.
3. 이메일에 도착한 코드를 입력해 로그인합니다.
4. 둘 다 같은 키워드(예: 서울숲 산책)를 선택합니다.
5. 한 사람이 메시지를 보냅니다. 다른 기기에서도 보이는지 확인합니다.
6. 다른 키워드를 선택하면 다른 대화방이 보이는지 확인합니다.
7. 로그아웃 상태에서 열람은 되지만 전송 시 로그인이 요구되는지 확인합니다.
8. 사용자별 메시지는 최소 3초 간격으로 보낼 수 있습니다. 중복 클릭 시 전송이 거부될 수 있습니다.

## 7. 지도 확인하기

- 기본 지도는 성수 예시 위치입니다. 위치 권한 없이도 표시되어야 합니다.
- **내 위치 사용**을 누르고 브라우저의 위치 권한을 허용하세요.
- HTTPS 배포 주소에서 확인하세요. 파일 직접 열기/file URL은 권한과 파일 경로가 제한될 수 있습니다.
- 기기 GPS/네트워크 위치 설정과 브라우저 권한을 확인하세요.
- 자동차 경로는 OSRM 공개 서버에 의존하며 보장된 상용 서비스가 아닙니다. 대규모 공개 운영 전 정식 길찾기 공급자 또는 자체 서버로 교체하세요.
- OSM 타일도 사용 정책을 확인해야 하며 대규모 사용 시 정식 타일 제공업체를 검토하세요.
- 한국 지역 데이터 정확도/진입로/이동수단에 따라 경로가 부정확할 수 있습니다. 실제 이동은 지도 앱에서 다시 확인하세요.
- 내 위치와 성수가 300km 이상 떨어져 있으면 잘못된 장거리 경로를 조회하지 않도록 안내합니다. 위치 지역별 실제 데이터 연동은 별도 구현입니다.

## 8. 보안과 운영 한계

적용됨: 인증 기반 작성 권한, RLS, 서버 측 작성자/닉네임/시각 설정, HTML 문자 안전 출력(textContent), 300자 제한, 사용자별 3초 간격 제한, 기본 보안 헤더. 채팅은 공개 열람이므로 민감정보를 작성하지 않도록 안내해야 합니다.

적용 안 됨: 신고/차단 UI, 관리자 역할 UI, 악성 사용자 차단 목록, 강력한 봇 방지, 삭제 요청 워크플로, 자동 보관 기간 정책, 정식 개인정보처리방침/이용약관. 공개 커뮤니티 운영 전 반드시 추가하세요. 닉네임은 인증된 실명이나 고유 ID가 아닙니다. 운영자는 Supabase 관리 화면에서 메시지를 삭제할 수 있지만, 현재 UI는 삭제 이벤트를 즉시 구독하지 않으므로 다음 주기 조회 때 반영됩니다.

개인정보 흐름: 계정 이메일은 Supabase Auth에 저장, 닉네임/메시지는 messages에 저장, 위치는 앱 DB에 저장하지 않지만 경로 요청 시 OSRM에 전송, 지도 요청은 외부 지도 공급자에 전달됩니다. 이용자 안내와 보관/삭제 정책이 필요합니다.

## 9. 진짜 실시간 순위는 다음 개발 단계

이 패키지에는 데이터 수집 크롤러, 뉴스/블로그/YouTube API 연동, 검색량 계약, 지역 자동 판별, 1~100위 산정 배치가 없습니다. 임의 숫자를 실제 지표처럼 표시하지 않습니다.

권장 개발 구조:
- 허용된 API/라이선스로 뉴스·블로그·영상 원문/시각/지역 수집
- 광고·중복·재게시 제거와 장소 정규화
- 최근 언급량/증가율/출처 다양성을 결합해 **지역 화제성** 지표 산정
- 동시간대 이전 스냅샷과 비교해 ▲▼/NEW/급상승 산정
- 집계 기준/최종 갱신 시각/출처별 실제 건수 표시
- 검색량 데이터를 확보하지 못했다면 '검색 순위'가 아니라 '화제 순위'로 표기
- 서버 작업과 비밀 API 키는 프런트엔드 밖에서 관리

## 검증 범위

제공 전 JavaScript 구문, 내부 파일 경로, ID 중복, 데이터 100개/상위10개 구조, URL 구성과 핵심 로직을 확인했습니다. 사용자의 실제 Vercel/Supabase 계정으로 배포하거나 이메일 발송·원격 채팅·브라우저 지도 표시를 실제 검증한 것은 아닙니다. 이 ZIP 자체에 공개 사이트 URL이 들어 있지는 않습니다.

## 공식 참고 문서

- [Vercel Git 배포](https://vercel.com/docs/deployments/git)
- [Supabase 이메일 OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase Postgres Changes / Realtime](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [OpenStreetMap 타일 정책](https://operations.osmfoundation.org/policies/tiles/)
