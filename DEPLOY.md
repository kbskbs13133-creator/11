# 🚀 초보자용 배포 가이드: GitHub에 올리고 실제 사이트로 운영하기

> 이 문서대로 따라 하면 **코딩 명령어 없이** 마우스 클릭과 복사·붙여넣기만으로
> `https://내프로젝트.vercel.app` 주소의 실제 사이트가 만들어집니다. 소요 시간은 약 30~40분, 비용은 **0원**입니다.

---

## 0. 전체 그림 먼저 이해하기

```
 [내 컴퓨터]  ──업로드──▶  [GitHub]  ──자동 연결──▶  [Vercel]  ◀──연결──▶  [Neon]
  코드 파일              코드 보관소              사이트 실행             데이터베이스
                       (무료, 비공개)            (무료, 자동 배포)        (무료 PostgreSQL)
```

| 서비스 | 하는 일 | 비유 |
|---|---|---|
| **GitHub** | 코드를 보관 | 코드 창고 |
| **Vercel** | GitHub의 코드를 가져와 24시간 사이트를 띄워 줌. 매일 자정 이자 배치(Cron)도 실행 | 가게 건물 |
| **Neon** | 회원·포인트·예치 데이터를 저장하는 PostgreSQL DB | 금고 |

**준비물:** 이메일 주소, 인터넷 브라우저, (2단계용) GitHub Desktop 프로그램

---

## 1단계. 프로젝트 파일 받기

1. 작업 공간에서 **`interest-platform.zip`** 파일을 다운로드합니다.
2. 압축을 풉니다. 예: `바탕화면/interest-platform` 폴더
3. 폴더 안에 아래 항목들이 보이면 정상입니다.

   ```
   interest-platform/
   ├── prisma/          ← DB 설계도 + migrations 폴더 (중요!)
   ├── src/             ← 사이트 코드
   ├── scripts/
   ├── package.json
   ├── package-lock.json
   ├── vercel.json      ← 매일 자정 Cron 설정
   ├── .gitignore       ← (숨김 파일) 올리면 안 되는 파일 목록
   └── .env.example     ← (숨김 파일) 환경변수 예시
   ```

> 💡 `.`으로 시작하는 파일은 숨김 파일이라 안 보일 수 있습니다. 숨김 파일 보는 방법:
> - **Mac**: Finder에서 `Cmd + Shift + .`
> - **Windows**: 탐색기 → 보기 → "숨긴 항목" 체크
>
> 압축 파일에는 **비밀번호가 담긴 `.env` 파일이 들어 있지 않습니다** (의도된 것입니다).

---

## 2단계. GitHub에 코드 올리기

### 2-1. GitHub 가입
1. https://github.com 접속 → **Sign up**
2. 이메일, 비밀번호, 사용자 이름(영문)을 입력하고 이메일 인증까지 마칩니다.

### 2-2. GitHub Desktop으로 업로드 (추천 ⭐ 명령어 불필요)

1. https://desktop.github.com 에서 **GitHub Desktop**을 설치하고 실행합니다.
2. **Sign in to GitHub.com** → 브라우저에서 로그인 → 승인(Authorize)
3. 상단 메뉴 **File → Add local repository...**
4. **Choose...** 를 눌러 1단계에서 압축 푼 `interest-platform` 폴더를 선택합니다.
5. *"This directory does not appear to be a Git repository"* 라는 경고가 뜨면
   파란 글씨 **create a repository** 를 클릭합니다.
6. 설정 창이 나오면:
   - **Name**: `interest-platform`
   - **Git ignore**: `None` (이미 `.gitignore` 파일이 있으므로)
   - **License**: `None`
   - → **Create repository** 클릭
7. 왼쪽 **Changes** 목록을 확인합니다.
   - ✅ `src/...`, `prisma/...`, `package.json` 등이 보이면 정상입니다.
   - ❌ `node_modules`나 `.env`가 보이면 **멈추세요.** `.gitignore`가 빠진 것이니 1단계를 다시 확인하세요.
8. 왼쪽 아래 **Summary** 칸에 `첫 업로드`라고 입력 → **Commit to main** 클릭
9. 위쪽 **Publish repository** 클릭
   - **Keep this code private** ✅ **체크된 상태로 둡니다** (비공개 저장소)
   - → **Publish repository**
10. 브라우저에서 `https://github.com/내아이디/interest-platform` 에 들어가 파일이 보이면 성공입니다 🎉

<details>
<summary>📟 (참고) 명령어를 쓸 줄 안다면, 터미널 방법</summary>

GitHub 웹사이트에서 **New repository** → 이름 `interest-platform`, **Private** 선택, 나머지는 비워둔 채 생성한 뒤:

```bash
cd interest-platform
git init
git add .
git commit -m "첫 업로드"
git branch -M main
git remote add origin https://github.com/내아이디/interest-platform.git
git push -u origin main
```
</details>

> ⚠️ GitHub 웹페이지에 파일을 끌어다 놓는 방식은 **추천하지 않습니다.** 숨김 파일이 빠지거나 한 번에 100개 제한에 걸릴 수 있습니다.

---

## 3단계. Neon에서 데이터베이스 만들기

1. https://neon.tech 접속 → **Sign up** → **Continue with GitHub** (GitHub 계정으로 가입하면 편합니다)
2. 첫 화면에서 프로젝트 생성:
   - **Project name**: `interest-platform`
   - **Postgres version**: 기본값 그대로
   - **Region**: ⭐ **AWS Asia Pacific (Singapore)** 를 꼭 선택하세요
     (`vercel.json`에서 사이트 서버를 싱가포르(`sin1`)로 설정해 두었습니다. DB와 같은 지역이어야 빠릅니다.)
   - → **Create project**
3. 프로젝트 대시보드에서 **Connect** 버튼을 클릭합니다.
4. 연결 문자열(Connection string) **2개**를 복사해 메모장에 저장합니다.

   | 메모장 이름 | 복사 방법 | 생김새 |
   |---|---|---|
   | `DATABASE_URL` | **Connection pooling** 스위치 **켜기(ON)** → 복사 버튼 | 주소 중간에 **`-pooler`** 가 **있음** |
   | `DATABASE_URL_UNPOOLED` | **Connection pooling** 스위치 **끄기(OFF)** → 복사 버튼 | 주소에 `-pooler`가 **없음** |

   예시 (실제 값은 각자 다릅니다):
   ```
   DATABASE_URL          = postgresql://neondb_owner:AbC123@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   DATABASE_URL_UNPOOLED = postgresql://neondb_owner:AbC123@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

> 💡 비밀번호 부분이 `****`로 가려져 있으면 **Show password**를 누르거나 복사 버튼(📋)을 쓰세요. 복사 버튼은 전체 주소를 복사합니다.

---

## 4단계. 비밀값(환경변수) 준비하기

메모장에 아래 **6개**를 완성해 두세요. 5단계에서 그대로 붙여넣습니다.

| 이름 (Key) | 값 (Value) | 만드는 법 |
|---|---|---|
| `DATABASE_URL` | Neon pooled 주소 | 3단계에서 복사 |
| `DATABASE_URL_UNPOOLED` | Neon direct 주소 | 3단계에서 복사 |
| `NEXTAUTH_SECRET` | 긴 랜덤 문자열 | https://generate-secret.vercel.app/32 접속 → 나온 글자 복사 |
| `CRON_SECRET` | 또 다른 랜덤 문자열 | 위 사이트를 **새로고침**해서 다른 값 복사 |
| `SEED_ADMIN_EMAIL` | 관리자 로그인 이메일 | 예: `myname@gmail.com` |
| `SEED_ADMIN_PASSWORD` | 관리자 비밀번호 | **8자 이상**, 나만 아는 값. `admin1234!`는 거부됩니다 |

> 🔐 **관리자 계정은 첫 배포 때 위 이메일·비밀번호로 자동 생성됩니다.**
> 이 값들은 절대 다른 사람에게 보여주거나 GitHub에 올리지 마세요.

메모장에 아래처럼 한 번에 적어 두면 5단계에서 편합니다:
```
DATABASE_URL=postgresql://...-pooler...
DATABASE_URL_UNPOOLED=postgresql://...
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxx
CRON_SECRET=yyyyyyyyyyyyyyyy
SEED_ADMIN_EMAIL=myname@gmail.com
SEED_ADMIN_PASSWORD=나만아는비밀번호123
```

---

## 5단계. Vercel로 사이트 배포하기

1. https://vercel.com 접속 → **Sign Up**
   - 플랜 선택: **Hobby** (무료, 개인용)
   - **Continue with GitHub** → 승인
2. 대시보드에서 **Add New... → Project** 클릭
3. **Import Git Repository** 목록에서 `interest-platform` 옆의 **Import** 클릭
   - 목록에 안 보이면 → **Adjust GitHub App Permissions** 클릭 → `interest-platform` 저장소 접근 허용 → 다시 돌아오기
4. **Configure Project** 화면:
   - **Framework Preset**: `Next.js` (자동 선택됨, 건드리지 않기)
   - **Root Directory**: `./` (그대로)
   - **Build and Output Settings**: 건드리지 않기
5. **Environment Variables** 를 펼치고 4단계의 6개를 입력합니다.
   - 💡 **꿀팁**: 메모장에 적은 6줄을 통째로 복사해 **Key 입력칸에 붙여넣으면** 6개가 한 번에 자동으로 나뉘어 들어갑니다.
   - 하나씩 입력해도 됩니다: Key에 이름, Value에 값 → **Add**
6. **Deploy** 클릭 → 2~4분 기다립니다.
   - 이때 자동으로 처리되는 것: 패키지 설치 → **DB 테이블 생성(마이그레이션)** → **관리자 계정·샘플 상품·VIP 등급 생성(seed)** → 사이트 빌드
7. 🎉 **Congratulations!** 화면이 나오면 성공입니다. **Continue to Dashboard** → **Visit** 를 누르면
   `https://interest-platform-xxxx.vercel.app` 같은 주소로 사이트가 열립니다.

---

## 6단계. 제대로 동작하는지 확인하기 ✅

| # | 할 일 | 기대 결과 |
|---|---|---|
| 1 | 사이트 접속 | 로그인 화면이 나옴 |
| 2 | 4단계의 관리자 이메일·비밀번호로 로그인 | `/admin` 관리자 콘솔로 이동 |
| 3 | 관리자 → **상품** 메뉴 | 샘플 상품 2개가 보임 |
| 4 | 로그아웃 → **회원가입**으로 테스트 계정 생성 → 로그인 | 대시보드가 보임 |
| 5 | 관리자로 다시 로그인 → **회원** → 테스트 계정에 **포인트 충전** | 잔액 반영 |
| 6 | 테스트 계정으로 **상품 → 예치하기** | 내 예치에 "진행중"으로 표시 |
| 7 | 테스트 계정 **지갑 → 포인트 충전 신청** → 관리자 **신청** 메뉴에서 승인 | 유저 화면이 몇 초 안에 "처리되었습니다"로 자동 갱신 |
| 8 | Vercel → 프로젝트 → **Settings → Cron Jobs** | `/api/cron/daily-interest` 가 등록되어 있음 |

> 💡 Cron Jobs 화면의 **Run** 버튼으로 배치를 즉시 실행해 볼 수 있습니다.
> 예치 당일에는 지급 대상이 없어 이자가 0건인 것이 정상입니다 (이자는 다음 날부터 지급).

> ⚠️ 관리자 개요의 "배치 수동 실행"에서 **미래 날짜**를 넣으면 이자가 **실제로 지급**됩니다.
> 실서버에서는 기준일을 비워 두고 실행하세요.

---

## 7단계. 이후 코드를 수정했을 때 반영하는 법

1. 내 컴퓨터에서 파일을 수정합니다.
2. GitHub Desktop을 열면 바뀐 파일이 **Changes**에 보입니다.
3. Summary에 설명(예: `상품 설명 문구 수정`) → **Commit to main** → 위쪽 **Push origin**
4. **끝.** Vercel이 자동으로 감지해서 1~3분 안에 사이트를 새 버전으로 바꿉니다.
   (Vercel → **Deployments** 탭에서 진행 상황 확인)

> DB 구조(`prisma/schema.prisma`)를 바꿨다면, 내 컴퓨터에서 `npx prisma migrate dev --name 변경내용` 으로
> 마이그레이션 파일을 만든 뒤 함께 올리세요. 배포할 때 자동 적용됩니다.

---

## 8단계. 자주 겪는 문제 해결 (FAQ)

> 📌 **환경변수를 추가하거나 고친 뒤에는 반드시 재배포해야 적용됩니다.**
> Vercel → **Deployments** → 맨 위 배포의 **⋯** → **Redeploy**

| 증상 / 에러 메시지 | 원인 | 해결 |
|---|---|---|
| 빌드 실패: `SEED_ADMIN_PASSWORD 를 8자 이상...` | 관리자 비밀번호 환경변수 누락 | Settings → Environment Variables에 추가 → Redeploy |
| `Environment variable not found: DATABASE_URL_UNPOOLED` | 환경변수 이름 오타 또는 누락 | 이름을 정확히 `DATABASE_URL_UNPOOLED`로 |
| `P1001: Can't reach database server` | DB 주소를 잘못 복사함 | Neon에서 다시 복사. 끝에 `?sslmode=require`가 있어야 함 |
| `P1002` / `advisory lock` 타임아웃 | `DATABASE_URL_UNPOOLED`에 `-pooler` 주소를 넣음 | `-pooler`가 **없는** 주소로 교체 |
| 로그인해도 계속 로그인 화면으로 돌아감 | `NEXTAUTH_SECRET` 누락 | 추가 → Redeploy |
| 사이트가 유독 느림 | Neon 지역과 서버 지역이 다름 | Neon 지역이 싱가포르가 아니면 `vercel.json`의 `"regions"` 값을 맞추기 (미국 동부 → `iad1`, 프랑크푸르트 → `fra1`) |
| 한동안 안 쓰다 들어가면 첫 화면이 1~2초 느림 | Neon 무료 DB는 쉬면 자동 절전 | 정상입니다 |
| 관리자 비밀번호를 바꾸고 싶음 | 관리자 계정은 **처음 한 번만** 생성됨. 이후 `SEED_ADMIN_PASSWORD`를 바꿔도 기존 계정은 그대로 | 다른 `SEED_ADMIN_EMAIL`로 바꾸고 재배포하면 새 관리자 계정이 추가됨 |

에러 내용 확인 위치: Vercel → **Deployments** → 실패한 배포 클릭 → **Building** 로그 맨 아래쪽

---

## 9단계. 꼭 알아둘 운영 정보

### ⏰ 이자 배치 실행 시각
- `vercel.json`의 `0 15 * * *`는 UTC 기준 15시, 즉 **한국 시간 00시**입니다.
- Vercel **무료(Hobby) 플랜**은 Cron을 하루 1번만 허용하고, **지정한 시각부터 1시간 안 아무 때나** 실행합니다.
  즉 **매일 00:00~00:59 사이**에 이자가 지급됩니다.
- 하루가 통째로 빠지더라도 다음 실행 때 빠진 날짜만큼 정확히 보정 지급되고, 같은 날 두 번 지급되는 일은 없습니다.

<details>
<summary>정확히 00:00에 실행하고 싶다면 (무료 외부 Cron)</summary>

1. https://cron-job.org 가입 → **Create cronjob**
2. URL: `https://내도메인.vercel.app/api/cron/daily-interest`
3. Schedule: 매일 `00:00`, Timezone: `Asia/Seoul`
4. Advanced → Headers 추가: `Authorization` = `Bearer 내CRON_SECRET값`
5. 저장. Vercel Cron과 동시에 돌아도 중복 지급되지 않으니 그대로 둬도 안전합니다.
</details>

### 🌐 내 도메인 연결 (선택)
Vercel → 프로젝트 → **Settings → Domains** → 구입한 도메인 입력 → 안내대로 DNS 설정

### 💰 비용과 플랜
- GitHub(비공개 저장소), Vercel Hobby, Neon Free는 모두 무료입니다.
- 단, **Vercel Hobby는 비상업적 개인 용도 전용**입니다. 실제 수익 사업에 쓰려면 Pro 플랜(유료)이 필요합니다.

### ⚖️ 실제 서비스 전 법률 확인
실제 돈으로 포인트를 충전·환전하고 예치 이자를 지급하는 구조는 **유사수신행위법, 전자금융거래법** 등의 규제 대상이 될 수 있습니다.
실제 이용자를 받기 전에 반드시 전문가의 법률 검토를 받으세요.

---

## 🪙 코인 입금 설정

포인트 충전은 코인 입금으로만 가능합니다. 지갑 만들기 · API 키 · 환경변수 · 1분 자동 확인 설정은
**[CRYPTO.md](CRYPTO.md)** 를 순서대로 따라 하세요. (설정 전에는 충전 화면에 "코인 입금 준비 중" 이 표시됩니다)

## 📋 전체 요약 체크리스트

- [ ] 1. zip 다운로드 & 압축 해제 (`.gitignore` 있는지 확인)
- [ ] 2. GitHub Desktop으로 **Private** 저장소에 Publish
- [ ] 3. Neon 프로젝트 생성 (**Singapore**), 주소 2개 복사 (pooled / direct)
- [ ] 4. 환경변수 6개 메모장에 준비
- [ ] 5. Vercel에서 Import → 환경변수 붙여넣기 → Deploy
- [ ] 6. 관리자 로그인 & 기능 확인, Cron Jobs 등록 확인
