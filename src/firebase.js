import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const isCloudActive = !!db;

/** 학원 테넌트 ID — 데이터는 academies/{academyId}/... 아래에 저장 */
export const academyId = import.meta.env.VITE_ACADEMY_ID || 'default';

/** @deprecated 레거시 경로용. 새 코드는 academyId / paths.js 를 사용하세요. */
export const appId = import.meta.env.VITE_LEGACY_APP_ID || import.meta.env.VITE_APP_ID || 'my-local-academy-app';