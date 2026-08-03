import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
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

export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** Firebase Auth용 가상 이메일 (강사·관리자 전화번호 로그인) */
export function phoneAuthEmail(phone) {
  const digits = normalizePhoneDigits(phone);
  return `p${digits}@staff.linkworks.local`;
}

/** 4자리 PIN → Auth 비밀번호 (Firebase 최소 6자) */
export function pinToAuthPassword(pin) {
  return `lw${String(pin || '').trim()}`;
}

export function last4OfPhone(phone) {
  const digits = normalizePhoneDigits(phone);
  return digits.slice(-4);
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
      '이미 가입된 계정입니다. 로그인해 주세요.',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
    'auth/weak-password': '비밀번호는 숫자 4자리여야 합니다.',
    'auth/invalid-credential': '로그인 정보 또는 비밀번호가 올바르지 않습니다.',
    'auth/user-not-found': '로그인 정보 또는 비밀번호가 올바르지 않습니다.',
    'auth/wrong-password': '로그인 정보 또는 비밀번호가 올바르지 않습니다.',
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

function profileFromMember(m, fbUser) {
  return {
    id: m.instructorId,
    role: m.role,
    name: m.name || fbUser?.displayName || '사용자',
    authUid: fbUser?.uid || m.authUid,
    email: m.email || fbUser?.email || '',
    phone: m.phone || '',
    mustChangePassword: !!m.mustChangePassword,
  };
}

async function findInstructorByPhoneDigits(digits) {
  const snap = await getDocs(instructorsCol(db));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list.find((i) => {
    const d = i.phoneDigits || normalizePhoneDigits(i.phone);
    return d === digits;
  }) || null;
}

/**
 * 강사·관리자: 전화번호 + 4자리 PIN 로그인
 * 최초: PIN = 전화번호 뒤 4자리 → 계정 생성 후 mustChangePassword
 */
export async function loginWithPhonePin(phone, pin) {
  const digits = normalizePhoneDigits(phone);
  const pinNorm = String(pin || '').trim();

  if (digits.length < 10) {
    const err = new Error('전화번호를 정확히 입력해 주세요.');
    err.friendlyMessage = err.message;
    throw err;
  }
  if (!/^\d{4}$/.test(pinNorm)) {
    const err = new Error('비밀번호는 숫자 4자리입니다.');
    err.friendlyMessage = err.message;
    throw err;
  }

  const instructor = await findInstructorByPhoneDigits(digits);
  if (!instructor) {
    const err = new Error('등록된 직원이 없습니다. 원장/관리자에게 직원 등록(전화번호)을 요청하세요.');
    err.friendlyMessage = err.message;
    throw err;
  }

  const academySnap = await getDoc(academyDoc(db));
  const academy = academySnap.exists() ? academySnap.data() : {};
  if (instructor.authUid && academy.ownerUid && instructor.authUid === academy.ownerUid) {
    const err = new Error('원장은 이메일로 로그인해 주세요.');
    err.friendlyMessage = err.message;
    throw err;
  }
  if (instructor.role === '원장' && academy.ownerUid && instructor.authUid === academy.ownerUid) {
    const err = new Error('원장은 이메일로 로그인해 주세요.');
    err.friendlyMessage = err.message;
    throw err;
  }

  const email = phoneAuthEmail(digits);
  const password = pinToAuthPassword(pinNorm);

  authSetupInProgress = true;
  try {
    if (instructor.authUid) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        // 예전 이메일 계정만 있는 경우 안내
        if (instructor.email && !String(instructor.email).includes('@staff.linkworks.local')) {
          const e = new Error('기존 이메일 계정입니다. 원장에게 직원 정보를 전화번호 로그인용으로 다시 등록·연결해 달라고 요청하세요.');
          e.friendlyMessage = e.message;
          throw e;
        }
        err.friendlyMessage = mapAuthError(err);
        throw err;
      }
    } else {
      const initial = last4OfPhone(digits);
      if (pinNorm !== initial) {
        const err = new Error('최초 비밀번호는 전화번호 뒤 4자리입니다.');
        err.friendlyMessage = err.message;
        throw err;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      try {
        if (instructor.name) await updateProfile(cred.user, { displayName: instructor.name });
      } catch (_) { /* ignore */ }

      await updateDoc(instructorDoc(db, instructor.id), {
        authUid: uid,
        phoneDigits: digits,
        phone: instructor.phone || phone,
        mustChangePassword: true,
        password: deleteField(),
      });
      await setDoc(memberDoc(db, uid), {
        role: instructor.role || '강사',
        instructorId: instructor.id,
        name: instructor.name,
        email,
        phone: instructor.phone || phone,
        phoneDigits: digits,
        mustChangePassword: true,
      });
    }

    const fbUser = auth.currentUser;
    const profile = await resolveCurrentUser(fbUser);
    return { user: fbUser, profile };
  } catch (err) {
    if (!err.friendlyMessage) err.friendlyMessage = mapAuthError(err);
    throw err;
  } finally {
    authSetupInProgress = false;
  }
}

/**
 * 최초 로그인 후 4자리 PIN 변경
 */
export async function changeStaffPin(newPin, confirmPin) {
  const pin = String(newPin || '').trim();
  const confirm = String(confirmPin || '').trim();
  if (!/^\d{4}$/.test(pin)) {
    const err = new Error('새 비밀번호는 숫자 4자리여야 합니다.');
    err.friendlyMessage = err.message;
    throw err;
  }
  if (pin !== confirm) {
    const err = new Error('비밀번호 확인이 일치하지 않습니다.');
    err.friendlyMessage = err.message;
    throw err;
  }

  const user = auth.currentUser;
  if (!user) {
    const err = new Error('로그인이 필요합니다.');
    err.friendlyMessage = err.message;
    throw err;
  }

  await updatePassword(user, pinToAuthPassword(pin));

  const memberSnap = await getDoc(memberDoc(db, user.uid));
  if (memberSnap.exists()) {
    const m = memberSnap.data();
    await updateDoc(memberDoc(db, user.uid), { mustChangePassword: false });
    if (m.instructorId) {
      await updateDoc(instructorDoc(db, m.instructorId), { mustChangePassword: false });
    }
  }

  return true;
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

    await setDoc(instructorDoc(db, instructorId), instructor);
    await setDoc(memberDoc(db, uid), {
      role: '원장',
      instructorId,
      name: instructor.name,
      email: emailNorm,
      mustChangePassword: false,
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
        mustChangePassword: false,
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
    return profileFromMember(existing.data(), fbUser);
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
      mustChangePassword: false,
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
      mustChangePassword: false,
    };
  } finally {
    authSetupInProgress = false;
  }
}

export async function resolveCurrentUser(fbUser) {
  if (!fbUser || !db) return null;

  const memberSnap = await getDoc(memberDoc(db, fbUser.uid));
  if (memberSnap.exists()) {
    return profileFromMember(memberSnap.data(), fbUser);
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
      phone: data.phone || '',
      phoneDigits: data.phoneDigits || normalizePhoneDigits(data.phone),
      mustChangePassword: !!data.mustChangePassword,
    });
    return {
      id: d.id,
      role: data.role || '강사',
      name: data.name,
      authUid: fbUser.uid,
      email: data.email || fbUser.email,
      phone: data.phone || '',
      mustChangePassword: !!data.mustChangePassword,
    };
  }

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
