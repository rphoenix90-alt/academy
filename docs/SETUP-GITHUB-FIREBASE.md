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

### 4-1. Firebase 서비스 계정 JSON 받기

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 **linkworks-hak**
2. ⚙️ 프로젝트 설정 → **서비스 계정** 탭
3. **새 비공개 키 생성** → JSON 파일 다운로드
4. 다운로드한 파일은 안전한 곳에만 두고, GitHub/폴더에 커밋하지 마세요

### 4-2. GitHub Secret 추가

저장소가 생긴 뒤, 터미널에서 (JSON 경로를 본인 파일로 바꾸세요):

```bash
export PATH="$HOME/.local/bin:$PATH"
cd "/Users/kdw/Desktop/학원웹"
gh secret set FIREBASE_SERVICE_ACCOUNT < ~/Downloads/linkworks-hak-firebase-adminsdk-xxxxx.json
```

또는 GitHub 웹: 저장소 → Settings → Secrets and variables → Actions → New repository secret  
- Name: `FIREBASE_SERVICE_ACCOUNT`  
- Value: JSON 파일 내용 전체 붙여넣기

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
