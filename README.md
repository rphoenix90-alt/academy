# Link Works — 학원 관리

Firebase + Vite + React 기반 학원 관리 웹앱입니다.

## 로컬 개발

```bash
cp .env.example .env   # 값을 채운 뒤 (또는 .env.production 내용을 복사)
npm install
npm run dev            # http://localhost:5173
npm run build          # → dist/
```

## 배포

- `main`에 push하면 GitHub Actions가 빌드 후 Firebase Hosting에 배포합니다.
- 필요한 Secret: `FIREBASE_TOKEN` (이미 등록됨)
- Firebase 웹 설정은 `.env.production`에서 읽습니다.

## 스택

- **Vite + React** — 프론트엔드
- **Firebase** — Auth, Firestore, Hosting (`linkworks-hak`)
- **GitHub Actions** — 자동 배포

## 폴더 구조 (요지)

```text
src/
  App.jsx              # 앱 전체 상태·화면 연결
  firebase.js          # Firebase 연결
  lib/paths.js         # academies/{id}/... 경로
  lib/migrateLegacy.js # 예전 데이터 자동 이전
  views/               # 대시보드, 학생, 클래스 등 화면
  components/          # 모달·아이콘
legacy/index.html      # 예전 단일 HTML (참고용)
```

## 문서

- [docs/SETUP-GITHUB-FIREBASE.md](docs/SETUP-GITHUB-FIREBASE.md)
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md)
