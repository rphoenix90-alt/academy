# Link Works — GitHub + Firebase 시작 안내

초보자용입니다. **한 번만** 하면 됩니다. 끝나면 `main`에 코드를 올릴 때마다 사이트가 자동 배포됩니다.

## 1. GitHub 로그인 (터미널)

```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth login
```

- GitHub.com → HTTPS → Login with a web browser 선택
- 브라우저에서 코드 입력 후 승인

## 2. Firebase 다시 로그인 (터미널)

```bash
firebase login --reauth
```

브라우저에서 Google 계정(`linkworks-hak` 프로젝트 소유 계정)으로 로그인합니다.

## 3. GitHub에 private 저장소 만들기

에이전트에게 다시 말씀해 주시면 자동으로 만들어 드립니다.  
직접 하시려면:

```bash
cd "/Users/kdw/Desktop/학원웹"
export PATH="$HOME/.local/bin:$PATH"
gh repo create linkworks-hak --private --source=. --remote=origin --push
```

## 4. 자동 배포용 Secret 등록

> **참고:** Firebase 콘솔에서 「이 서비스 계정에서는 키를 만들 수 없습니다」가 보이면  
> 조직 정책 때문에 JSON 키를 쓸 수 없습니다. 아래 **CI 토큰** 방식을 사용하세요.

### 4-1. Firebase CI 토큰 만들기 (터미널)

먼저 Firebase에 로그인한 뒤:

```bash
firebase login --reauth
firebase login:ci
```

브라우저에서 승인하면 터미널에 **긴 토큰 문자열**이 출력됩니다. 복사해 두세요.

### 4-2. GitHub Secret 추가

GitHub 웹: 저장소 → Settings → Secrets and variables → Actions → New repository secret

- Name: `FIREBASE_TOKEN`
- Value: 방금 복사한 토큰 전체

또는 터미널:

```bash
export PATH="$HOME/.local/bin:$PATH"
cd "/Users/kdw/Desktop/학원웹"
gh secret set FIREBASE_TOKEN
```

실행 후 토큰을 붙여넣고 Enter 합니다.

### 4-3. (Vite 전환 후) Firebase 웹 설정 Secrets

앱을 Vite로 바꾼 뒤에는 Actions에 아래도 넣습니다.  
값은 Firebase Console → 프로젝트 설정 → 일반 → 내 앱 → SDK 설정에서 확인합니다.

| Secret 이름 | 내용 |
|-------------|------|
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId (`linkworks-hak`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `VITE_FIREBASE_APP_ID` | appId |

로컬 개발용으로는 프로젝트 루트에 `.env` 파일을 만들고 `.env.example`을 참고해 같은 값을 넣습니다. `.env`는 Git에 올라가지 않습니다.

## 5. 배포 확인

`main` 브랜치에 push하면 GitHub Actions가 Firebase Hosting에 배포합니다.

- Actions 탭에서 초록 체크 = 성공
- 사이트: `https://linkworks-hak.web.app` (또는 Firebase Hosting에 표시된 URL)

## 지금 구조

| 항목 | 상태 |
|------|------|
| Firebase 프로젝트 | `linkworks-hak` |
| Hosting 폴더 | `public/` (다음 단계에서 Vite `dist/`로 전환) |
| 자동 배포 | `.github/workflows/deploy.yml` |
