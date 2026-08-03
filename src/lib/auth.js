import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteField,
} from 'firebase/firestore';
import { auth, db, academyId } from '../firebase';
import {
  academyDoc, instructorDoc, instructorsCol, memberDoc,
} from './paths';
import { generateId } from './utils';

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

/** Firestore에 비밀번호 필드를 남기지 않도록 제거 */
export function stripPassword(data) {
  if (!data || typeof data !== 'object') return data;
  const { password, ...rest } = data;
  return rest;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return cred.user;
}

export async function logoutAuth() {
  if (auth) await signOut(auth);
}

/**
 * 최초 원장 계정 생성 (학원에 ownerUid 가 없을 때)
 */
export async function registerOwner({ name, email, password }) {
  const emailNorm = normalizeEmail(email);
  const academySnap = await getDoc(academyDoc(db));
  const academy = academySnap.exists() ? academySnap.data() : {};
  if (academy.ownerUid) {
    throw new Error('이미 원장 계정이 있습니다. 로그인하거나 직원 계정 연결을 이용하세요.');
  }

  const cred = await createUserWithEmailAndPassword(auth, emailNorm, password);
  const uid = cred.user.uid;
  await updateProfile(cred.user, { displayName: name });

  const instructorId = generateId();
  const instructor = {
    id: instructorId,
    name: name.trim(),
    role: '원장',
    email: emailNorm,
    phone: '',
    status: '재직',
    authUid: uid,
  };

  await setDoc(instructorDoc(db, instructorId), instructor);
  await setDoc(memberDoc(db, uid), {
    role: '원장',
    instructorId,
    name: instructor.name,
    email: emailNorm,
  });
  await setDoc(academyDoc(db), {
    ...academy,
    name: academy.name || '학원',
    ownerUid: uid,
    setupComplete: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return { user: cred.user, instructor };
}

/**
 * 원장이 등록한 이메일로 직원이 비밀번호를 만들어 계정 연결
 */
export async function registerAndLinkStaff({ email, password, name }) {
  const emailNorm = normalizeEmail(email);
  const q = query(
    instructorsCol(db),
    where('email', '==', emailNorm),
  );
  const snap = await getDocs(q);
  const unmatched = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((i) => !i.authUid);

  if (unmatched.length === 0) {
    throw new Error('등록된 직원 이메일이 없습니다. 원장/관리자에게 직원 등록을 요청하세요.');
  }

  const instructor = unmatched[0];
  const cred = await createUserWithEmailAndPassword(auth, emailNorm, password);
  const uid = cred.user.uid;
  const displayName = (name || instructor.name || '').trim();
  if (displayName) await updateProfile(cred.user, { displayName });

  await updateDoc(instructorDoc(db, instructor.id), {
    authUid: uid,
    email: emailNorm,
    name: displayName || instructor.name,
    password: deleteField(),
  });
  await setDoc(memberDoc(db, uid), {
    role: instructor.role || '강사',
    instructorId: instructor.id,
    name: displayName || instructor.name,
    email: emailNorm,
  });

  return { user: cred.user, instructor: { ...instructor, authUid: uid, name: displayName || instructor.name } };
}

/**
 * 로그인된 Auth 사용자 → 앱의 currentUser 로 변환
 */
export async function resolveCurrentUser(fbUser) {
  if (!fbUser || !db) return null;

  const memberSnap = await getDoc(memberDoc(db, fbUser.uid));
  if (memberSnap.exists()) {
    const m = memberSnap.data();
    return {
      id: m.instructorId,
      role: m.role,
      name: m.name || fbUser.displayName || '사용자',
      authUid: fbUser.uid,
      email: m.email || fbUser.email,
    };
  }

  // 멤버 문서 없이 instructor.authUid 만 있는 경우 복구
  const q = query(instructorsCol(db), where('authUid', '==', fbUser.uid));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    const data = d.data();
    await setDoc(memberDoc(db, fbUser.uid), {
      role: data.role || '강사',
      instructorId: d.id,
      name: data.name,
      email: data.email || fbUser.email,
    });
    return {
      id: d.id,
      role: data.role || '강사',
      name: data.name,
      authUid: fbUser.uid,
      email: data.email || fbUser.email,
    };
  }

  return null;
}

export async function academyNeedsOwnerSetup() {
  if (!db) return false;
  const snap = await getDoc(academyDoc(db));
  if (!snap.exists()) return true;
  return !snap.data().ownerUid;
}

export { normalizeEmail, academyId };
