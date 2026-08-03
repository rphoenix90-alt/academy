import {
  getDoc, getDocs, setDoc, writeBatch,
} from 'firebase/firestore';
import { academyId } from '../firebase';
import {
  academyDoc,
  instructorDoc,
  studentDoc,
  classDoc,
  textbookDoc,
  memosDoc,
  settlementsDoc,
  studentsCol,
  legacyAcademyDoc,
  legacyInstructorsCol,
  legacyStudentsCol,
  legacyClassesCol,
  legacyTextbooksCol,
  legacyMemosDoc,
  legacySettlementsDoc,
} from './paths';
import { stripPassword } from './auth';

const FLAG_KEY = `lw_migrated_to_academies_${academyId}`;

const DEFAULT_MODULES = [
  'timetable',
  'settlement',
  'grades',
  'counseling',
  'textbooks',
  'excel-import',
  'sms',
];

/**
 * 예전 artifacts/... 데이터를 academies/{academyId}/... 로 한 번만 복사합니다.
 */
export async function migrateLegacyDataIfNeeded(db) {
  if (!db) return { migrated: false, reason: 'no-db' };
  if (typeof localStorage !== 'undefined' && localStorage.getItem(FLAG_KEY) === '1') {
    return { migrated: false, reason: 'local-flag' };
  }

  const newAcademy = await getDoc(academyDoc(db));
  const existingStudents = await getDocs(studentsCol(db));
  if (newAcademy.exists() && !existingStudents.empty) {
    localStorage.setItem(FLAG_KEY, '1');
    return { migrated: false, reason: 'already-on-new-path' };
  }

  const oldAcademy = await getDoc(legacyAcademyDoc(db));
  const [instructorsSnap, studentsSnap, classesSnap, textbooksSnap, memosSnap, settlementsSnap] =
    await Promise.all([
      getDocs(legacyInstructorsCol(db)),
      getDocs(legacyStudentsCol(db)),
      getDocs(legacyClassesCol(db)),
      getDocs(legacyTextbooksCol(db)),
      getDoc(legacyMemosDoc(db)),
      getDoc(legacySettlementsDoc(db)),
    ]);

  const hasLegacy =
    oldAcademy.exists() ||
    !instructorsSnap.empty ||
    !studentsSnap.empty ||
    !classesSnap.empty ||
    !textbooksSnap.empty ||
    memosSnap.exists() ||
    settlementsSnap.exists();

  if (!hasLegacy) {
    if (!newAcademy.exists()) {
      await setDoc(academyDoc(db), {
        name: '학원',
        address: '',
        phone: '',
        bizNumber: '',
        ceoName: '',
        enabledModules: DEFAULT_MODULES,
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }
    localStorage.setItem(FLAG_KEY, '1');
    return { migrated: false, reason: 'fresh-academy' };
  }

  const batchWrites = [];
  const queue = (ref, data) => {
    batchWrites.push({ ref, data });
  };

  if (!newAcademy.exists()) {
    const academyData = oldAcademy.exists()
      ? {
          ...stripPassword(oldAcademy.data()),
          enabledModules: DEFAULT_MODULES,
          migratedFrom: 'artifacts',
          migratedAt: new Date().toISOString(),
        }
      : {
          name: '학원',
          enabledModules: DEFAULT_MODULES,
          migratedFrom: 'artifacts',
          migratedAt: new Date().toISOString(),
        };
    queue(academyDoc(db), academyData);
  } else {
    queue(academyDoc(db), {
      ...newAcademy.data(),
      enabledModules: newAcademy.data().enabledModules || DEFAULT_MODULES,
      migratedFrom: 'artifacts',
      migratedAt: new Date().toISOString(),
    });
  }

  instructorsSnap.forEach((d) => {
    queue(instructorDoc(db, d.id), stripPassword({ id: d.id, ...d.data() }));
  });
  studentsSnap.forEach((d) => queue(studentDoc(db, d.id), { id: d.id, ...d.data() }));
  classesSnap.forEach((d) => queue(classDoc(db, d.id), { id: d.id, ...d.data() }));
  textbooksSnap.forEach((d) => queue(textbookDoc(db, d.id), { id: d.id, ...d.data() }));
  if (memosSnap.exists()) queue(memosDoc(db), memosSnap.data());
  if (settlementsSnap.exists()) queue(settlementsDoc(db), settlementsSnap.data());

  for (let i = 0; i < batchWrites.length; i += 400) {
    const chunk = batchWrites.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
    await batch.commit();
  }

  localStorage.setItem(FLAG_KEY, '1');
  return {
    migrated: true,
    counts: {
      instructors: instructorsSnap.size,
      students: studentsSnap.size,
      classes: classesSnap.size,
      textbooks: textbooksSnap.size,
    },
  };
}
