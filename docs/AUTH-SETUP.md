# 로그인(Auth) 설정

## Firebase Console에서 한 번만 (필수)

로그인/가입이 안 되면 **가장 먼저** 이것을 확인하세요.

1. [Authentication → Sign-in method](https://console.firebase.google.com/project/linkworks-hak/authentication/providers) 열기  
2. **Email/Password** 클릭  
3. **사용 설정** 켜기 → **저장**

꺼져 있으면 화면에  
`Firebase에서 이메일/비밀번호 로그인이 꺼져 있습니다...`  
같은 안내가 뜹니다.

## 사용 방법

### 최초 1회 (원장)
1. https://linkworks-hak.web.app  
2. **최초 원장 계정 만들기** 클릭 (일반 로그인이 아님)  
3. 이름 / 이메일 / 비밀번호(6자 이상) 입력

이미 Auth 계정만 만들어지고 중간에 실패한 경우 → 같은 이메일로 **로그인**하면 프로필이 자동 복구됩니다.

### 직원 추가
1. 원장 로그인 → Academy → 직원 등록 (이메일 필수)  
2. 직원이 **직원 계정 처음 연결하기** → 같은 이메일 + 비밀번호

## 보안
- 비밀번호는 Firebase Auth에만 저장됩니다.
- Firestore는 학원 멤버만 접근합니다.
