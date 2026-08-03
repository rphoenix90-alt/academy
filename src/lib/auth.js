import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  getDoc, setDoc, updateDoc, query, where, getDocs, deleteField,
} from 'firebase/firestore';
import { auth, db, academyId } from '../firebase';
import {
  academyDoc, instructorDoc, instructorsCol, memberDoc,
} from './paths';
import { generateId } from './utils';

/** 원장/직원 가입 중 onAuthStateChanged 가 중간에 로그아웃인시키지 않도록 */
export let authSetupInProgress = false;

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function stripPassword(data) {
  if (!data || typeof data !== 'object') return data;
  const { password, ...rest } = data;
  return rest;
}

export function mapAuthError(err) {
  const code = err?.code || '';
  const map = {
    'auth/operation-not-allowed':
      'Firebase에서 이메일/비밀번호 로그인이 꺼져 있습니다. Console → Authentication → Sign-in method → Email/Password를 켜 주세요.',
    'auth/email-already-in-use':
      '이미 가입된 이메일입니다. 로그인하거나, 직원 계정 연결을 이용해 주세요.',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/user-not-found': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    'auth/network-request-failed': '네트워크 오류입니다. 인터넷 연결을 확인해 주세요.',
    'permission-denied': '데이터 저장 권한이 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.',
  };
  if (map[code]) return map[code];
  if (String(err?.message || '').includes('permission')) return map['permission-denied'];
  return err?.message || '처리 중 오류가 발생했습니다.';
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return cred.user;
}

export async function logoutAuth() {
  if (auth) await signOut(auth);
}

function hasOwner(academy) {
  return !!(academy && academy.ownerUid);
}

/**
 * 최초 원장 계정 생성 (학원에 ownerUid 가 없을 때)
 */
export async function registerOwner({ name, email, password }) {
  const emailNorm = normalizeEmail(email);
  authSetupInProgress = true;
  try {
    const academySnap = await getDoc(academyDoc(db));
    const academy = academySnap.exists() ? academySnap.data() : {};
    if (hasOwner(academy)) {
      throw new Error('이미 원장 계정이 있습니다. 로그인하거나 직원 계정 연결을 이용하세요.');
    }

    const cred = await createUserWithEmailAndPassword(auth, emailNorm, password);
    const uid = cred.user.uid;
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch (_) { /* displayName 실패해도 계속 */ }

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

    // Auth 유저는 생겼으므로 Firestore 기록을 반드시 완료
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

    return {
      user: cred.user,
      instructor,
      profile: {
        id: instructorId,
        role: '원장',
        name: instructor.name,
        authUid: uid,
        email: emailNorm,
      },
    };
  } catch (err) {
    err.friendlyMessage = mapAuthError(err);
    throw err;
  } finally {
    authSetupInProgress = false;
  }
}

/**
 * Auth만 되고 member가 없는 경우(중도 실패) — 원장 셋업 완료
 */
export async function completeOwnerProfileIfNeeded(fbUser, { name } = {}) {
  if (!fbUser || !db) return null;
  const existing = await getDoc(memberDoc(db, fbUser.uid));
  if (existing.exists()) {
    const m = existing.data();
    return {
      id: m.instructorId,
      role: m.role,
      name: m.name || fbUser.displayName || '사용자',
      authUid: fbUser.uid,
      email: m.email || fbUser.email,
    };
  }

  const academySnap = await getDoc(academyDoc(db));
  const academy = academySnap.exists() ? academySnap.data() : {};
  if (hasOwner(academy) && academy.ownerUid !== fbUser.uid) {
    return null;
  }

  authSetupInProgress = true;
  try {
    const emailNorm = normalizeEmail(fbUser.email || '');
    const instructorId = generateId();
    const displayName = (name || fbUser.displayName || '원장').trim();
    const instructor = {
      id: instructorId,
      name: displayName,
      role: '원장',
      email: emailNorm,
      phone: '',
      status: '재직',
      authUid: fbUser.uid,
    };
    await setDoc(instructorDoc(db, instructorId), instructor);
    await setDoc(memberDoc(db, fbUser.uid), {
      role: '원장',
      instructorId,
      name: displayName,
      email: emailNorm,
    });
    await setDoc(academyDoc(db), {
      ...academy,
      name: academy.name || '학원',
      ownerUid: fbUser.uid,
      setupComplete: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return {
      id: instructorId,
      role: '원장',
      name: displayName,
      authUid: fbUser.uid,
      email: emailNorm,
    };
  } finally {
    authSetupInProgress = false;
  }
}

/**
 * 원장이 등록한 이메일로 직원이 비밀번호를 만들어 계정 연결
 */
export async function registerAndLinkStaff({ email, password, name }) {
  const emailNorm = normalizeEmail(email);
  authSetupInProgress = true;
  try {
    const q = query(instructorsCol(db), where('email', '==', emailNorm));
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
    try {
      if (displayName) await updateProfile(cred.user, { displayName });
    } catch (_) { /* ignore */ }

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

    return {
      user: cred.user,
      instructor: { ...instructor, authUid: uid, name: displayName || instructor.name },
      profile: {
        id: instructor.id,
        role: instructor.role || '강사',
        name: displayName || instructor.name,
        authUid: uid,
        email: emailNorm,
      },
    };
  } catch (err) {
    err.friendlyMessage = mapAuthError(err);
    throw err;
  } finally {
    authSetupInProgress = false;
  }
}

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

  // Auth만 있고 프로필이 없으면 미클레임 학원일 때 원장으로 복구
  return completeOwnerProfileIfNeeded(fbUser);
}

export async function academyNeedsOwnerSetup() {
  if (!db) return false;
  try {
    const snap = await getDoc(academyDoc(db));
    if (!snap.exists()) return true;
    return !hasOwner(snap.data());
  } catch {
    return true;
  }
}

export { normalizeEmail, academyId };
