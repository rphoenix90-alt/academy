# 로그인(Auth) 설정

## Firebase Console에서 한 번만

1. [Firebase Console](https://console.firebase.google.com/project/linkworks-hak/authentication) 열기  
2. **Authentication** → **Sign-in method**  
3. **Email/Password** → 사용 설정 → 저장  

이 설정이 꺼져 있으면 앱에서 회원가입/로그인이 실패합니다.

## 사용 방법

### 최초 1회 (원장)
1. 로그인 화면 → **최초 원장 계정 만들기**
2. 이름 / 이메일 / 비밀번호(6자 이상) 입력

### 직원 추가
1. 원장/관리자로 로그인 → Academy → 직원 등록  
2. **이메일** 필수 입력 (비밀번호는 넣지 않음)  
3. 직원이 앱에서 **직원 계정 처음 연결하기** → 같은 이메일 + 새 비밀번호

### 이후
- 이메일 + 비밀번호로 로그인
- 예전 연락처/평문 비밀번호 로그인은 제거됨

## 보안
- 비밀번호는 Firebase Auth에만 저장 (Firestore에 저장하지 않음)
- Firestore는 `members/{uid}`가 있는 학원 멤버만 접근
