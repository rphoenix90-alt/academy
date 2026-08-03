import { CalendarDays, CreditCard, BookOpen } from './components/Icons';

/** 기본으로 켜 둘 선택 모듈 (신규 학원 / 마이그레이션) */
export const DEFAULT_ENABLED_MODULES = [
  'timetable',
  'settlement',
  'grades',
  'counseling',
  'textbooks',
  'excel-import',
  'sms',
];

/**
 * 선택 모듈 정의
 * - nav: 사이드바 메뉴 (없으면 메뉴 없음)
 * - studentTabs: 학생 상세 탭 id
 * - flags: 화면 곳곳 기능 스위치
 */
export const MODULE_CATALOG = [
  {
    id: 'timetable',
    name: '종합 시간표',
    description: '주간/과목별 시간표 조회와 인쇄',
    nav: { id: 'timetable', name: 'Timetable', icon: CalendarDays, roles: ['원장', '관리자', '강사'] },
  },
  {
    id: 'settlement',
    name: '강사 정산',
    description: '강사별 강의료 정산 및 명세서',
    nav: { id: 'tuition', name: 'Settlement', icon: CreditCard, roles: ['원장', '관리자', '강사'] },
  },
  {
    id: 'grades',
    name: '성적 관리',
    description: '학생 상세의 성적 기록·그래프',
    studentTabs: ['grades'],
  },
  {
    id: 'counseling',
    name: '상담 이력',
    description: '학생 상세의 상담 기록',
    studentTabs: ['counseling'],
  },
  {
    id: 'textbooks',
    name: '교재 관리',
    description: '클래스 화면의 교재 등록·관리',
    flags: ['textbooks'],
  },
  {
    id: 'excel-import',
    name: '엑셀 일괄등록',
    description: '학생 목록 엑셀 업로드·양식 다운로드',
    flags: ['excelImport'],
  },
  {
    id: 'sms',
    name: '단체 문자',
    description: '학생/학부모 대상 SMS 작성 화면',
    flags: ['sms'],
  },
];

export function getEnabledModules(academyInfo) {
  const list = academyInfo?.enabledModules;
  if (!Array.isArray(list)) return [...DEFAULT_ENABLED_MODULES];
  return list;
}

export function isModuleEnabled(academyInfo, moduleId) {
  return getEnabledModules(academyInfo).includes(moduleId);
}

export function buildNavItems(academyInfo, coreNavItems) {
  const enabled = getEnabledModules(academyInfo);
  const moduleNav = MODULE_CATALOG
    .filter((m) => m.nav && enabled.includes(m.id))
    .map((m) => m.nav);
  return [...coreNavItems, ...moduleNav];
}

export function getEnabledStudentTabs(academyInfo) {
  const enabled = getEnabledModules(academyInfo);
  const tabs = [];
  MODULE_CATALOG.forEach((m) => {
    if (m.studentTabs && enabled.includes(m.id)) {
      tabs.push(...m.studentTabs);
    }
  });
  return tabs;
}

export function getModuleFlags(academyInfo) {
  const enabled = getEnabledModules(academyInfo);
  return {
    textbooks: enabled.includes('textbooks'),
    excelImport: enabled.includes('excel-import'),
    sms: enabled.includes('sms'),
    grades: enabled.includes('grades'),
    counseling: enabled.includes('counseling'),
    timetable: enabled.includes('timetable'),
    settlement: enabled.includes('settlement'),
  };
}
