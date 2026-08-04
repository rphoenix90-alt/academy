# 데이터 경로 (academies)

## 새 구조

```text
academies/{academyId}                    # 학원 정보 + enabledModules
academies/{academyId}/instructors/{id}
academies/{academyId}/students/{id}
academies/{academyId}/classes/{id}
academies/{academyId}/textbooks/{id}
academies/{academyId}/meta/memos
academies/{academyId}/meta/settlements
```

`academyId`는 `.env`의 `VITE_ACADEMY_ID` (기본값 `default`)입니다.

## 자동 이전

앱을 처음 열면, 예전 경로

`artifacts/my-local-academy-app/public/data/...`

에 데이터가 있고 새 경로가 비어 있으면 **한 번만** 새 경로로 복사합니다.  
성공하면 화면에 “데이터 이전 완료” 알림이 뜹니다.

## Firestore Rules 배포

Hosting만 자동 배포됩니다. **Rules는 별도 배포**가 필요합니다.

```bash
firebase deploy --only firestore:rules --project linkworks-hak
```

전화번호 직원 로그인은 Rules가 최신이어야 동작합니다.
