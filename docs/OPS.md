# Link Works 운영 가이드

사이트: https://linkworks-hak.web.app

## 매일 / 자주 쓰는 일

| 할 일 | 어디서 |
|------|--------|
| 학생 등록·수정 | Students |
| 클래스·수강 배정 | Classes |
| 수납 기록 | 학생 상세 → 수납 |
| 오늘 메모 | Dashboard |

## 처음 한 번 설정

1. **최초 관리자** — 앱에서 「최초 관리자 계정 만들기」(이메일) ([AUTH-SETUP.md](AUTH-SETUP.md))
2. **학원 정보** — Academy → 학원 정보 수정
3. **직원** — Academy → 직원 등록(**전화번호** 필수) → 직원이 전화번호 + 뒤 4자리로 최초 로그인 후 PIN 설정
4. **기능 모듈** — Academy → 기능 모듈에서 필요한 것만 켜기 ([MODULES.md](MODULES.md))

## 로그인 요약

| 역할 | 방법 |
|------|------|
| 최초/최고 관리자 | 이메일 + 비밀번호 (학원당 1회 생성) |
| 원장·관리자·강사 | 전화번호 + 숫자 4자리 (최초: 전화번호 뒤 4자리) |

## 권한 요약

| 역할 | 할 수 있는 것 |
|------|----------------|
| 원장·관리자 | 전체 + Academy(직원·백업·모듈) |
| 강사 | 대시보드·본인 관련 학생/클래스·켜진 모듈 |

## 백업

- Academy → **전체 백업 다운로드** (JSON)
- 복원 시 현재 데이터를 덮어씁니다. 복원 전에 한 번 더 백업하세요.

## 사이트 업데이트 (개발자)

코드 변경 후:

```bash
cd "/Users/kdw/Desktop/학원웹"
git add -A && git commit -m "메시지" && git push
```

`main`에 push하면 GitHub Actions가 Firebase Hosting에 자동 배포합니다.  
약 1~2분 뒤 사이트를 `Cmd+Shift+R`로 새로고침하세요.

## 문제 해결

| 증상 | 확인 |
|------|------|
| 로그인 안 됨 | Firebase Auth Email/Password 사용 설정 ([AUTH-SETUP.md](AUTH-SETUP.md)) |
| 흰 화면 | 강제 새로고침 (`Cmd+Shift+R`). 계속이면 Actions 배포 실패 여부 확인 |
| 메뉴가 없음 | Academy → 기능 모듈에서 해당 기능이 켜져 있는지 |
| 직원이 로그인 안 됨 | 직원 카드에 「연결됨」인지, 등록한 **전화번호**와 같은지 |

## 관련 문서

- [AUTH-SETUP.md](AUTH-SETUP.md) — 로그인·계정
- [MODULES.md](MODULES.md) — 모듈 ON/OFF
- [DATA-MODEL.md](DATA-MODEL.md) — 데이터 구조
- [SETUP-GITHUB-FIREBASE.md](SETUP-GITHUB-FIREBASE.md) — GitHub·배포 최초 세팅
