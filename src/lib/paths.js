import { collection, doc } from 'firebase/firestore';
import { academyId } from '../firebase';

/** academies/{academyId} — 학원 기본 정보 문서 */
export const academyDoc = (db) => doc(db, 'academies', academyId);

export const instructorsCol = (db) => collection(db, 'academies', academyId, 'instructors');
export const instructorDoc = (db, id) => doc(db, 'academies', academyId, 'instructors', id);

export const studentsCol = (db) => collection(db, 'academies', academyId, 'students');
export const studentDoc = (db, id) => doc(db, 'academies', academyId, 'students', id);

export const classesCol = (db) => collection(db, 'academies', academyId, 'classes');
export const classDoc = (db, id) => doc(db, 'academies', academyId, 'classes', id);

export const textbooksCol = (db) => collection(db, 'academies', academyId, 'textbooks');
export const textbookDoc = (db, id) => doc(db, 'academies', academyId, 'textbooks', id);

export const memosDoc = (db) => doc(db, 'academies', academyId, 'meta', 'memos');
export const settlementsDoc = (db) => doc(db, 'academies', academyId, 'meta', 'settlements');

/** Auth UID → 역할 매핑 (Security Rules용) */
export const membersCol = (db) => collection(db, 'academies', academyId, 'members');
export const memberDoc = (db, uid) => doc(db, 'academies', academyId, 'members', uid);

/** 예전 Gemini/단일 HTML 경로 (마이그레이션 원본) */
export const LEGACY_APP_ID = import.meta.env.VITE_LEGACY_APP_ID || 'my-local-academy-app';

export const legacyAcademyDoc = (db) =>
  doc(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'academyInfo', 'main');
export const legacyInstructorsCol = (db) =>
  collection(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'instructors');
export const legacyStudentsCol = (db) =>
  collection(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'students');
export const legacyClassesCol = (db) =>
  collection(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'classes');
export const legacyTextbooksCol = (db) =>
  collection(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'textbooks');
export const legacyMemosDoc = (db) =>
  doc(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'memos', 'main');
export const legacySettlementsDoc = (db) =>
  doc(db, 'artifacts', LEGACY_APP_ID, 'public', 'data', 'settlements', 'main');
