# 오늘의 안건은 생존입니다 (Backend)

멀티플레이 **의사결정(투표) 기반 스토리 게임** 백엔드입니다.  
방 생성/참가 → 챕터 진행 → 투표 집계 → 결과 반영(다음 챕터/엔딩) 흐름을 API로 제공합니다.



https://github.com/user-attachments/assets/2a3eb4e3-e1ef-45bc-b8b7-259fa80acd3d


---

## Tech Stack

- **Node.js** (TypeScript)
- **Supabase** (PostgreSQL)
- **GitHub Actions** (CI/CD)
- **AWS EC2** (배포/런타임)

---

## System Architecture

<p align="center">
  <img width="1406" height="770" alt="image" src="https://github.com/user-attachments/assets/5177003e-7806-477f-959e-c57f13c3da94" />

</p>

---

## Features

- Google OAuth 로그인 / 토큰 발급(JWT)
- Room 생성 / 참가 / 플레이어 관리
- 게임 시작(챕터 시드/현재 상태 초기화)
- 챕터 투표 제출 및 집계
- 최종 투표/엔딩 처리
- (선택) Swagger 문서 제공

---

## Getting Started (Local)

### 1) Requirements
- Node.js 18+ (권장 20+)
- npm
- Supabase 프로젝트 (DB)

### 2) Install
```bash
npm install
```


## 3) Environment Variables

.env 파일을 생성하고 아래 값을 채워주세요.
```
#### Server
NODE_ENV=development
PORT=4000

#### JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

#### Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback

#### Front URL (redirect/cookie)
FRONT_URL=http://localhost:3000

#### Supabase (Admin)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

```
✅ 팁: 배포 환경에서는 NODE_ENV=production, FRONT_URL=https://<도메인> 처럼 분기되도록 구성하세요.

## 4) Run
npm run dev

Scripts
npm run dev       # 개발 실행
npm run build     # 빌드
npm run start     # 빌드 결과 실행(dist)
npm run lint      # (있다면) 린트
