import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import {
  getDoc, setDoc, updateDoc, query, where, getDocs, deleteField, writeBatch,
} from 'firebase/firestore';
import { auth, db, academyId } from '../firebase';
import {
  academyDoc, instructorDoc, instructorsCol, memberDoc,
} from './paths';
import { generateId } from './utils';

/** 원장/직원 가입 중 onAuthStateChanged 가 중간에 로그아웃인시키지 않도록 */
export let authSetupInProgress = false;

/**
 * TEMP: 사이트 수정용 하드코딩 관리자.
 * 작업 완료 후 이 상수·관련 규칙(isBootstrapOwner)·프리필을 반드시 제거할 것.
 */
export const BOOTSTRAP_ADMIN = {
  email: 'rphoenix90@jubilee-p.com',
  password: 'rp105711',
  name: '관리자',
};

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function isBootstrapCredentials(email, password) {
  return normalizeEmail(email) === BOOTSTRAP_ADMIN.email
    && String(password || '') === BOOTSTRAP_ADMIN.password;
}

export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** Firebase Auth용 가상 이메일 (직원 전화번호 로그인) */
export function phoneAuthEmail(phone) {
  const digits = normalizePhoneDigits(phone);
  return `p${digits}@staff.linkworks.local`;
}

/** Auth 이메일이 최고 관리자(실제 이메일)인지 — 전화 로그인용 가상 도메인 제외 */
export function isOwnerAuthEmail(email) {
  const e = normalizeEmail(email);
  return !!e && !e.endsWith('@staff.linkworks.local');
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
      '이미 가입된 이메일입니다. 「최고 관리자 로그인」을 이용해 주세요.',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
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

function friendly(message) {
  const err = new Error(message);
  err.friendlyMessage = message;
  return err;
}

/** 최고 관리자 프로필(강사/멤버/학원 ownerUid)을 한 번에 기록 */
async function writeOwnerProfile(uid, { name, email }) {
  const academySnap = await getDoc(academyDoc(db));
  const academy = academySnap.exists() ? academySnap.data() : {};
  const displayName = (name || '최고 관리자').trim();
  const instructorId = generateId();
  const now = new Date().toISOString();

  const instructor = {
    id: instructorId,
    name: displayName,
    role: '원장',
    email,
    phone: '',
    status: '재직',
    authUid: uid,
    isOwner: true,
  };
  const member = {
    role: '원장',
    instructorId,
    name: displayName,
    email,
    isOwner: true,
    mustChangePassword: false,
  };

  const batch = writeBatch(db);
  batch.set(instructorDoc(db, instructorId), instructor);
  batch.set(memberDoc(db, uid), member);
  batch.set(academyDoc(db), {
    ...academy,
    name: academy.name || '학원',
    ownerUid: uid,
    setupComplete: true,
    updatedAt: now,
  }, { merge: true });
  await batch.commit();

  return {
    instructor,
    profile: {
      id: instructorId,
      role: '원장',
      name: displayName,
      authUid: uid,
      email,
      mustChangePassword: false,
    },
  };
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
  // 로그인 후: phoneDigits 쿼리 (보안 규칙과 일치)
  try {
    const q = query(instructorsCol(db), where('phoneDigits', '==', digits));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }
  } catch (_) { /* fall through */ }

  // 규칙이 허용하는 범위에서만 추가 매칭 (phoneDigits 미설정 직원)
  try {
    const snap = await getDocs(instructorsCol(db));
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list.find((i) => {
      const d = i.phoneDigits || normalizePhoneDigits(i.phone);
      return d === digits;
    }) || null;
  } catch (_) {
    return null;
  }
}

/**
 * 직원(원장·관리자·강사): 전화번호 + 4자리 PIN 로그인
 * 최초: PIN = 전화번호 뒤 4자리 → Auth 생성 후 직원 문서 연결
 *
 * 최고 관리자(ownerUid, 실제 이메일 Auth)는 이메일 로그인만 사용합니다.
 *
 * 순서: Auth 로그인/생성 먼저 → (규칙상) 직원 조회 → members 연결
 * (로그인 전에 instructors를 읽으면 permission-denied 가 납니다)
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

  const email = phoneAuthEmail(digits);
  const password = pinToAuthPassword(pinNorm);
  const initialPin = last4OfPhone(digits);

  authSetupInProgress = true;
  try {
    let isNewAuthUser = false;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (signErr) {
      const code = signErr?.code || '';
      const canTryCreate =
        code === 'auth/user-not-found'
        || code === 'auth/invalid-credential'
        || code === 'auth/wrong-password';

      if (!canTryCreate) {
        signErr.friendlyMessage = mapAuthError(signErr);
        throw signErr;
      }

      // 최초 연결: 비밀번호는 전화번호 뒤 4자리만 허용
      if (pinNorm !== initialPin) {
        const err = new Error('전화번호 또는 비밀번호가 올바르지 않습니다. 최초 로그인 시 비밀번호는 전화번호 뒤 4자리입니다.');
        err.friendlyMessage = err.message;
        throw err;
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        isNewAuthUser = true;
        try {
          await updateProfile(cred.user, { displayName: '직원' });
        } catch (_) { /* ignore */ }
      } catch (createErr) {
        if (createErr?.code === 'auth/email-already-in-use') {
          const err = new Error('비밀번호가 올바르지 않습니다.');
          err.friendlyMessage = err.message;
          throw err;
        }
        createErr.friendlyMessage = mapAuthError(createErr);
        throw createErr;
      }
    }

    const uid = auth.currentUser.uid;

    // 이미 members 가 있으면 바로 프로필 반환
    const existingMember = await getDoc(memberDoc(db, uid));
    if (existingMember.exists()) {
      const profile = await resolveCurrentUser(auth.currentUser);
      return { user: auth.currentUser, profile };
    }

    // members 없음 → 직원 문서와 연결 (Auth 이메일 = p{phoneDigits}@...)
    const instructor = await findInstructorByPhoneDigits(digits);
    if (!instructor) {
      if (isNewAuthUser) {
        try { await auth.currentUser.delete(); } catch (_) { /* ignore */ }
      } else {
        await logoutAuth();
      }
      const err = new Error('등록된 직원이 없습니다. 최고 관리자/관리자에게 직원 등록(전화번호)을 요청하세요. 이미 등록된 직원이라면 Academy에서 직원 정보를 한 번 저장해 phoneDigits를 갱신해 주세요.');
      err.friendlyMessage = err.message;
      throw err;
    }

    const academySnap = await getDoc(academyDoc(db));
    const academy = academySnap.exists() ? academySnap.data() : {};

    // 최고 관리자 직원 문서(이미 이메일 Auth와 연결됨)는 전화 로그인으로 덮어쓰지 않음
    if (academy.ownerUid && instructor.authUid === academy.ownerUid) {
      if (isNewAuthUser) {
        try { await auth.currentUser.delete(); } catch (_) { /* ignore */ }
      } else {
        await logoutAuth();
      }
      const err = new Error('최고 관리자 계정은 「최고 관리자」메뉴에서 이메일로 로그인해 주세요.');
      err.friendlyMessage = err.message;
      throw err;
    }

    if (instructor.authUid && instructor.authUid !== uid) {
      await logoutAuth();
      const err = new Error('이미 다른 계정에 연결된 직원입니다. 최고 관리자에게 문의해 주세요.');
      err.friendlyMessage = err.message;
      throw err;
    }

    try {
      if (instructor.name) await updateProfile(auth.currentUser, { displayName: instructor.name });
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

    const profile = await resolveCurrentUser(auth.currentUser);
    return { user: auth.currentUser, profile };
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
 * 하드코딩 관리자: Auth 로그인/생성 + owner 프로필 강제 확보
 */
export async function ensureBootstrapAdmin() {
  authSetupInProgress = true;
  try {
    const emailNorm = BOOTSTRAP_ADMIN.email;
    const pw = BOOTSTRAP_ADMIN.password;
    let user;

    try {
      const cred = await signInWithEmailAndPassword(auth, emailNorm, pw);
      user = cred.user;
    } catch (signErr) {
      const code = signErr?.code || '';
      if (
        code === 'auth/user-not-found'
        || code === 'auth/invalid-credential'
        || code === 'auth/wrong-password'
        || code === 'auth/invalid-email'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, emailNorm, pw);
          user = cred.user;
        } catch (createErr) {
          if (createErr?.code === 'auth/email-already-in-use') {
            throw friendly(
              '하드코딩 관리자 이메일이 이미 다른 비밀번호로 등록되어 있습니다. Firebase Console → Authentication에서 해당 사용자를 삭제한 뒤 다시 로그인해 주세요.',
            );
          }
          createErr.friendlyMessage = mapAuthError(createErr);
          throw createErr;
        }
      } else {
        signErr.friendlyMessage = mapAuthError(signErr);
        throw signErr;
      }
    }

    try {
      await updateProfile(user, { displayName: BOOTSTRAP_ADMIN.name });
    } catch (_) { /* ignore */ }

    const academySnap = await getDoc(academyDoc(db));
    const academy = academySnap.exists() ? academySnap.data() : {};
    const existingMember = await getDoc(memberDoc(db, user.uid));

    if (existingMember.exists() && academy.ownerUid === user.uid) {
      return {
        user,
        profile: profileFromMember(existingMember.data(), user),
      };
    }

    const { instructor, profile } = await writeOwnerProfile(user.uid, {
      name: BOOTSTRAP_ADMIN.name,
      email: emailNorm,
    });
    return { user, instructor, profile };
  } catch (err) {
    if (!err.friendlyMessage) err.friendlyMessage = mapAuthError(err);
    throw err;
  } finally {
    authSetupInProgress = false;
  }
}

/**
 * 최초 최고 관리자 계정 생성 (학원에 ownerUid 가 없을 때)
 * — 이메일 + 비밀번호로만 가입 (직원 전화 로그인과 분리)
 * — Auth만 있고 프로필이 없는 경우: 같은 이메일/비밀번호로 다시 만들면 자동 복구
 */
export async function registerOwner({ name, email, password }) {
  if (isBootstrapCredentials(email, password)) {
    return ensureBootstrapAdmin();
  }

  const emailNorm = normalizeEmail(email);
  const pw = String(password || '');
  const displayName = String(name || '').trim();

  if (!displayName) throw friendly('이름을 입력해 주세요.');
  if (!emailNorm || !emailNorm.includes('@') || emailNorm.endsWith('@staff.linkworks.local')) {
    throw friendly('최고 관리자용 이메일을 입력해 주세요.');
  }
  if (pw.length < 6) throw friendly('비밀번호는 6자 이상이어야 합니다.');

  authSetupInProgress = true;
  try {
    let academySnap = await getDoc(academyDoc(db));
    let academy = academySnap.exists() ? academySnap.data() : {};
    if (hasOwner(academy)) {
      throw friendly('이미 최고 관리자 계정이 있습니다. 「최고 관리자 로그인」을 이용해 주세요.');
    }

    let user;
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailNorm, pw);
      user = cred.user;
    } catch (createErr) {
      // Auth만 만들어지고 프로필 기록이 실패한 경우 → 로그인 후 복구
      if (createErr?.code === 'auth/email-already-in-use') {
        try {
          const cred = await signInWithEmailAndPassword(auth, emailNorm, pw);
          user = cred.user;
        } catch (signErr) {
          throw friendly('이미 가입된 이메일입니다. 「최고 관리자 로그인」에서 비밀번호를 확인해 주세요.');
        }
      } else {
        createErr.friendlyMessage = mapAuthError(createErr);
        throw createErr;
      }
    }

    // 로그인 후 다시 확인 (동시 가입 방지)
    academySnap = await getDoc(academyDoc(db));
    academy = academySnap.exists() ? academySnap.data() : {};
    if (hasOwner(academy) && academy.ownerUid !== user.uid) {
      await logoutAuth();
      throw friendly('이미 최고 관리자 계정이 있습니다. 「최고 관리자 로그인」을 이용해 주세요.');
    }

    const existingMember = await getDoc(memberDoc(db, user.uid));
    if (existingMember.exists() && hasOwner(academy) && academy.ownerUid === user.uid) {
      return {
        user,
        profile: profileFromMember(existingMember.data(), user),
      };
    }

    try {
      await updateProfile(user, { displayName });
    } catch (_) { /* ignore */ }

    const { instructor, profile } = await writeOwnerProfile(user.uid, {
      name: displayName,
      email: emailNorm,
    });

    return { user, instructor, profile };
  } catch (err) {
    if (!err.friendlyMessage) err.friendlyMessage = mapAuthError(err);
    throw err;
  } finally {
    authSetupInProgress = false;
  }
}

/**
 * 최고 관리자 이메일 로그인 — ownerUid 와 일치해야 함
 * ownerUid 없이 Auth만 있는 경우 프로필을 자동 복구합니다.
 */
export async function loginAsOwner(email, password) {
  if (isBootstrapCredentials(email, password)) {
    return ensureBootstrapAdmin();
  }

  const emailNorm = normalizeEmail(email);
  if (!isOwnerAuthEmail(emailNorm)) {
    throw friendly('최고 관리자 이메일을 입력해 주세요.');
  }

  authSetupInProgress = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, emailNorm, password);
    const uid = cred.user.uid;

    const academySnap = await getDoc(academyDoc(db));
    const academy = academySnap.exists() ? academySnap.data() : {};

    if (hasOwner(academy) && academy.ownerUid !== uid) {
      await logoutAuth();
      throw friendly('최고 관리자 계정이 아닙니다. 직원은 전화번호로 로그인해 주세요.');
    }

    let profile = await resolveCurrentUser(cred.user);
    if (!profile) {
      profile = await completeOwnerProfileIfNeeded(cred.user);
    }
    if (!profile) {
      await logoutAuth();
      throw friendly('최고 관리자 프로필을 찾을 수 없습니다. 「최고 관리자 계정 만들기」로 다시 시도해 주세요.');
    }

    return { user: cred.user, profile };
  } catch (err) {
    if (!err.friendlyMessage) err.friendlyMessage = mapAuthError(err);
    throw err;
  } finally {
    authSetupInProgress = false;
  }
}

/**
 * Auth만 되고 member가 없는 경우(중도 실패) — 최고 관리자 셋업 완료
 */
export async function completeOwnerProfileIfNeeded(fbUser, { name } = {}) {
  if (!fbUser || !db) return null;
  if (!isOwnerAuthEmail(fbUser.email)) return null;

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
    const displayName = (name || fbUser.displayName || '최고 관리자').trim();
    const { profile } = await writeOwnerProfile(fbUser.uid, {
      name: displayName,
      email: emailNorm,
    });
    return profile;
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
