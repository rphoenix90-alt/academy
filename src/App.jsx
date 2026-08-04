import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { auth, db, isCloudActive } from './firebase';
import {
  academyDoc, instructorsCol, instructorDoc, studentsCol, studentDoc,
  classesCol, classDoc, textbooksCol, textbookDoc, memosDoc, settlementsDoc,
} from './lib/paths';
import { migrateLegacyDataIfNeeded } from './lib/migrateLegacy';
import {
  resolveCurrentUser, authSetupInProgress, mapAuthError, ensureBootstrapAdmin,
  BOOTSTRAP_ADMIN,
} from './lib/auth';
import {
  triggerNotification, generateId, formatDate, useLocalStorage,
} from './lib/utils';
import {
  Icon, LayoutDashboard, Users, BookOpen, Building, UserIcon,
} from './components/Icons';
import { DashboardView } from './views/DashboardView';
import { AcademyView } from './views/AcademyView';
import { StudentsView } from './views/StudentsView';
import { ClassesView } from './views/ClassesView';
import { TimetableView } from './modules/timetable';
import { TuitionView } from './modules/settlement';
import { buildNavItems, getModuleFlags, isModuleEnabled } from './registry';
import { StudentDetailModal } from './components/StudentDetailModal';
import { GeneralModal } from './components/GeneralModal';

/** 로그인 페이지 제거 기간용 — 클라우드 부트스트랩 실패 시에도 화면 작업 가능 */
const LOCAL_ADMIN = {
  id: 'local-admin',
  role: '원장',
  name: BOOTSTRAP_ADMIN.name,
  email: BOOTSTRAP_ADMIN.email,
  authUid: 'local-admin',
  mustChangePassword: false,
};

export default function App() {
    const [fbUser, setFbUser] = useState(null);
    const [isSyncing, setIsSyncing] = useState(true);

    const [academyInfo, setAcademyInfo] = useLocalStorage('lw_academy', { name: '학원', address: '', phone: '', bizNumber: '', ceoName: '' });
    const [instructors, setInstructors] = useLocalStorage('lw_instructors', []);
    const [students, setStudents] = useLocalStorage('lw_students', []);
    const [classes, setClasses] = useLocalStorage('lw_classes', []);
    const [textbooks, setTextbooks] = useLocalStorage('lw_textbooks', []);
    const [dashboardMemos, setDashboardMemos] = useLocalStorage('lw_memos', {});
    const [settlements, setSettlements] = useLocalStorage('lw_settlements', {});

    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [authReady, setAuthReady] = useState(false);
    const [bootError, setBootError] = useState('');
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [detailTab, setDetailTab] = useState('basic'); 
    const [adminMemoMode, setAdminMemoMode] = useState('private');
    const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
    
    const [classSchedules, setClassSchedules] = useState([{ id: generateId(), days: [], start: '18:00', end: '20:00' }]);
    const [modalEnrolledStudents, setModalEnrolledStudents] = useState([]);
    const [modalStudentSearchTerm, setModalStudentSearchTerm] = useState('');
    const [isWithdrawnStatus, setIsWithdrawnStatus] = useState(false);
    const [smsSelectedIds, setSmsSelectedIds] = useState([]);
    const [smsContent, setSmsContent] = useState('');

    const fileInputRef = useRef(null);
    const backupInputRef = useRef(null);
    const bootstrappingRef = useRef(false);

    const isInstructor = currentUser?.role === '강사';

    useEffect(() => {
        if (!auth) {
            setCurrentUser(LOCAL_ADMIN);
            setIsSyncing(false);
            setAuthReady(true);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFbUser(user);

            if (!user) {
                if (bootstrappingRef.current) {
                    setAuthReady(true);
                    return;
                }
                bootstrappingRef.current = true;
                setBootError('');
                try {
                    const { profile } = await ensureBootstrapAdmin();
                    if (profile) setCurrentUser({ ...profile, mustChangePassword: false });
                } catch (e) {
                    console.error(e);
                    setBootError(e?.friendlyMessage || mapAuthError(e));
                    setCurrentUser(LOCAL_ADMIN);
                } finally {
                    bootstrappingRef.current = false;
                    setIsSyncing(false);
                    setAuthReady(true);
                }
                return;
            }

            if (authSetupInProgress) {
                setAuthReady(true);
                return;
            }

            try {
                let profile = await resolveCurrentUser(user);
                if (!profile) {
                    const ensured = await ensureBootstrapAdmin();
                    profile = ensured.profile;
                }
                setCurrentUser(profile
                  ? { ...profile, mustChangePassword: false }
                  : LOCAL_ADMIN);
                if (profile?.role === '강사') setActiveTab((t) => (t === 'academy' ? 'dashboard' : t));
                setBootError('');
            } catch (e) {
                console.error(e);
                setBootError(e?.friendlyMessage || mapAuthError(e));
                setCurrentUser(LOCAL_ADMIN);
            } finally {
                setAuthReady(true);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!db || !fbUser || !currentUser || currentUser.id === 'local-admin') {
            if (!fbUser) setIsSyncing(false);
            return;
        }

        let cancelled = false;
        let unsubscribers = [];

        const start = async () => {
            setIsSyncing(true);
            try {
                const result = await migrateLegacyDataIfNeeded(db);
                if (result.migrated) {
                    triggerNotification(`데이터 이전 완료 (학생 ${result.counts.students}명 등)`);
                }
            } catch (e) {
                console.error('Legacy migration failed:', e);
            }
            if (cancelled) return;

            unsubscribers = [
                onSnapshot(academyDoc(db), (snap) => { if (snap.exists()) setAcademyInfo(snap.data()); }, console.error),
                onSnapshot(instructorsCol(db), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setInstructors(arr); }, console.error),
                onSnapshot(studentsCol(db), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setStudents(arr); }, console.error),
                onSnapshot(classesCol(db), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setClasses(arr); }, console.error),
                onSnapshot(textbooksCol(db), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setTextbooks(arr); }, console.error),
                onSnapshot(memosDoc(db), (snap) => { if (snap.exists()) setDashboardMemos(snap.data()); }, console.error),
                onSnapshot(settlementsDoc(db), (snap) => { if (snap.exists()) setSettlements(snap.data()); }, console.error),
            ];
            setIsSyncing(false);
        };

        start();
        return () => {
            cancelled = true;
            unsubscribers.forEach((u) => u && u());
        };
    }, [db, fbUser, currentUser]);

    useEffect(() => {
        if (!currentUser || students.length === 0 || !academyInfo) return;
        if (currentUser.role !== '원장' && currentUser.role !== '관리자') return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const promotionTime = new Date(currentYear, 0, 1, 10, 0, 0); 
        const lastPromotionYear = academyInfo.lastPromotionYear || 0;

        if (now >= promotionTime && lastPromotionYear < currentYear) {
            const runPromotion = async () => {
                const updatedStudents = students.map(s => {
                    let newGrade = s.grade;
                    if (newGrade === '초1') newGrade = '초2';
                    else if (newGrade === '초2') newGrade = '초3';
                    else if (newGrade === '초3') newGrade = '초4';
                    else if (newGrade === '초4') newGrade = '초5';
                    else if (newGrade === '초5') newGrade = '초6';
                    else if (newGrade === '초6') newGrade = '중1';
                    else if (newGrade === '중1') newGrade = '중2';
                    else if (newGrade === '중2') newGrade = '중3';
                    else if (newGrade === '중3') newGrade = '고1';
                    else if (newGrade === '고1') newGrade = '고2';
                    else if (newGrade === '고2') newGrade = '고3';
                    else if (newGrade === '고3') newGrade = '졸업';
                    return { ...s, grade: newGrade };
                });

                const updatedAcademy = { ...academyInfo, lastPromotionYear: currentYear };
                if (isCloudActive) {
                    try {
                        await setDoc(academyDoc(db), updatedAcademy);
                        for (const s of updatedStudents) {
                            await setDoc(studentDoc(db, s.id), s);
                        }
                        triggerNotification(`전체 원생 학년 자동 진급 완료`);
                    } catch(e) { console.error(e); }
                } else {
                    setAcademyInfo(updatedAcademy);
                    setStudents(updatedStudents);
                    triggerNotification(`전체 원생 학년 자동 진급 완료`);
                }
            };
            runPromotion();
        }
    }, [currentUser, students, academyInfo, isCloudActive, db]);

    const getMyClasses = () => isInstructor ? classes.filter(c => c.teacherId === currentUser.id) : classes;
    const getMyStudents = () => {
        if (!isInstructor) return students;
        const myClassIds = getMyClasses().map(c => c.id);
        return students.filter(s => s.classIds && s.classIds.some(id => myClassIds.includes(id)));
    };

    const handlePrint = () => { setIsPrintMode(true); setTimeout(() => { window.print(); setIsPrintMode(false); }, 300); };

    const openModal = (type, data = null) => { 
        setModalState({ isOpen: true, type, data }); 
        if (type === 'student') setIsWithdrawnStatus(data?.status === '퇴원');
        if (type === 'class') {
            if (data && data.schedules && data.schedules.length > 0) setClassSchedules(data.schedules);
            else setClassSchedules([{ id: generateId(), days: [], start: '18:00', end: '20:00' }]);
            
            if (data && data.id) {
                const enrolled = students.filter(s => (s.classIds || []).includes(data.id)).map(s => s.id);
                setModalEnrolledStudents(enrolled);
            } else setModalEnrolledStudents([]);
            setModalStudentSearchTerm('');
        }
    };
    const closeModal = () => { setModalState({ isOpen: false, type: null, data: null }); };

    const deleteItem = async (type, id) => {
        if(!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            if(type === 'instructor') {
                if(isCloudActive) await deleteDoc(instructorDoc(db, id));
                else setInstructors(prev => prev.filter(i => i.id !== id));
                classes.forEach(async c => {
                    if (c.teacherId === id) {
                        if(isCloudActive) await setDoc(classDoc(db, c.id), {...c, teacherId: null, teacherName: '미정'});
                        else setClasses(prev => prev.map(cl => cl.id === c.id ? {...cl, teacherId: null, teacherName: '미정'} : cl));
                    }
                });
            }
            else if(type === 'student') {
                if(isCloudActive) await deleteDoc(studentDoc(db, id));
                else setStudents(prev => prev.filter(i => i.id !== id));
            }
            else if(type === 'class') {
                if(isCloudActive) await deleteDoc(classDoc(db, id));
                else setClasses(prev => prev.filter(i => i.id !== id));
                students.forEach(async s => {
                    if (s.classIds && s.classIds.includes(id)) {
                        const newClassIds = s.classIds.filter(cId => cId !== id);
                        if(isCloudActive) await setDoc(studentDoc(db, s.id), {...s, classIds: newClassIds});
                        else setStudents(prev => prev.map(st => st.id === s.id ? {...st, classIds: newClassIds} : st));
                    }
                });
            }
            else if(type === 'textbook') {
                if(isCloudActive) await deleteDoc(textbookDoc(db, id));
                else setTextbooks(prev => prev.filter(i => i.id !== id));
            }
            triggerNotification('삭제했습니다.');
        } catch(e) { triggerNotification('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.', true); }
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, {type:'binary'});
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const newStudents = data.map(row => ({
                    id: generateId(), name: row['이름'] || '이름없음', gender: row['성별'] || '남', grade: row['학년'] || '',
                    school: row['학교'] || '', phone: row['학생연락처'] || '', parentPhone: row['학부모연락처'] || '', status: '재원',
                    enrollDate: formatDate(new Date()), classIds: [], grades: [], counseling: [], tuitionHistory: [], memo: '', classHistory: [], cashReceipt: ''
                }));
                if(isCloudActive) { for(const ns of newStudents) await setDoc(studentDoc(db, ns.id), ns); } 
                else setStudents(prev => [...prev, ...newStudents]);
                triggerNotification(`학생 ${newStudents.length}명을 등록했습니다.`);
            } catch(err) { triggerNotification('엑셀 파일을 읽을 수 없습니다. 양식을 확인해 주세요.', true); }
            e.target.value = null;
        };
        reader.readAsBinaryString(file);
    };

    const downloadSampleExcel = () => {
        const sampleData = [{ '이름': '홍길동', '성별': '남', '학교': '한국고', '학년': '고1', '학생연락처': '010-1234-5678', '학부모연락처': '010-9876-5432' }];
        const ws = XLSX.utils.json_to_sheet(sampleData); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "양식"); XLSX.writeFile(wb, "학생등록_양식.xlsx");
    };

    const handleBackupData = () => {
        const backupData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            academyInfo, instructors, students, classes, dashboardMemos, settlements, textbooks,
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `LinkWorks_Backup_${formatDate(new Date())}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        triggerNotification('백업 파일을 다운로드했습니다.');
    };

    const handleRestoreData = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if (!window.confirm('백업 파일로 현재 데이터를 덮어쓸까요?\n복원 전 최신 백업을 받아 두는 것을 권장합니다.')) {
            e.target.value = null;
            return;
        }
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if (!data || (!data.students && !data.classes && !data.academyInfo && !data.instructors)) {
                    triggerNotification('올바른 백업 파일이 아닙니다.', true);
                    e.target.value = null;
                    return;
                }
                if(isCloudActive) {
                    if(data.academyInfo) await setDoc(academyDoc(db), data.academyInfo);
                    if(data.instructors) for(const item of data.instructors) await setDoc(instructorDoc(db, item.id), item);
                    if(data.students) for(const item of data.students) await setDoc(studentDoc(db, item.id), item);
                    if(data.classes) for(const item of data.classes) await setDoc(classDoc(db, item.id), item);
                    if(data.textbooks) for(const item of data.textbooks) await setDoc(textbookDoc(db, item.id), item);
                    if(data.dashboardMemos) await setDoc(memosDoc(db), data.dashboardMemos);
                    if(data.settlements) await setDoc(settlementsDoc(db), data.settlements);
                    triggerNotification('클라우드 데이터를 복원했습니다.');
                } else {
                    if(data.academyInfo) setAcademyInfo(data.academyInfo);
                    if(data.instructors) setInstructors(data.instructors);
                    if(data.students) setStudents(data.students);
                    if(data.classes) setClasses(data.classes);
                    if(data.textbooks) setTextbooks(data.textbooks);
                    if(data.dashboardMemos) setDashboardMemos(data.dashboardMemos);
                    if(data.settlements) setSettlements(data.settlements);
                    triggerNotification('로컬 데이터를 복원했습니다.');
                }
            } catch(err) { triggerNotification('백업 파일을 읽을 수 없습니다.', true); }
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const calcTeacherStats = () => {
        return instructors.map(inst => {
            const instClasses = classes.filter(c => c.teacherId === inst.id).map(c => c.id);
            const studentCount = students.filter(s => s.status !== '퇴원' && s.classIds && s.classIds.some(cId => instClasses.includes(cId))).length;
            return { ...inst, studentsCount: studentCount };
        });
    };

    const calcSettlementDetails = (teacherId, month) => {
        const tClasses = classes.filter(c => c.teacherId === teacherId);
        const tClassIds = tClasses.map(c => c.id);
        let details = [];
        let totalAmount = 0;

        students.forEach(std => {
            if(!std.classIds) return;
            const enrolledMyClasses = std.classIds.filter(id => tClassIds.includes(id));
            if(enrolledMyClasses.length > 0) {
                enrolledMyClasses.forEach(cId => {
                    const cls = tClasses.find(c => c.id === cId);
                    if(cls) {
                        const settlementKey = `${month}_${cId}_${std.id}`;
                        const override = settlements[settlementKey] || {};
                        const baseSessions = (cls.weeklySessions || 2) * 4;
                        const actualSessions = override.actualSessions !== undefined ? override.actualSessions : baseSessions;
                        const originalBasePrice = Number(cls.price || 0);
                        const customPrice = std.customClassTuition?.[cId];
                        const adjustedBasePrice = customPrice !== undefined && customPrice !== '' ? Number(customPrice) : originalBasePrice;
                        const isAdjusted = adjustedBasePrice !== originalBasePrice;
                        const autoPrice = baseSessions > 0 ? Math.floor(adjustedBasePrice * (actualSessions / baseSessions)) : adjustedBasePrice;
                        const finalPrice = override.finalPrice !== undefined ? override.finalPrice : autoPrice;
                        
                        details.push({
                            id: settlementKey, studentId: std.id, classId: cId, studentName: std.name, school: std.school,
                            gender: std.gender, className: cls.name, baseSessions, actualSessions, basePrice: adjustedBasePrice,
                            originalBasePrice, finalPrice, reason: override.reason || '', isAdjusted
                        });
                        totalAmount += Number(finalPrice);
                    }
                });
            }
        });
        return { details, totalAmount };
    };

    const handleSessionChange = async (id, actualSessions) => {
        const newSettlements = {...settlements};
        if (!newSettlements[id]) newSettlements[id] = {};
        newSettlements[id].actualSessions = actualSessions;
        delete newSettlements[id].finalPrice;
        if(isCloudActive) await setDoc(settlementsDoc(db), newSettlements);
        else setSettlements(newSettlements);
    };

    const handleSettlementChange = async (id, field, value) => {
        const newSettlements = {...settlements, [id]: {...(settlements[id]||{}), [field]: value}};
        if(isCloudActive) await setDoc(settlementsDoc(db), newSettlements);
        else setSettlements(newSettlements);
    };

    useEffect(() => {
        if (!currentUser) return;
        const core = ['dashboard', 'academy', 'students', 'classes'];
        const moduleNavIds = [];
        if (isModuleEnabled(academyInfo, 'timetable')) moduleNavIds.push('timetable');
        if (isModuleEnabled(academyInfo, 'settlement')) moduleNavIds.push('tuition');
        const allowedByRole = {
            dashboard: true,
            academy: currentUser.role === '원장' || currentUser.role === '관리자',
            students: true,
            classes: true,
            timetable: true,
            tuition: true,
        };
        const allowed = [...core, ...moduleNavIds].filter((id) => allowedByRole[id]);
        if (!allowed.includes(activeTab)) setActiveTab('dashboard');
    }, [academyInfo?.enabledModules, currentUser, activeTab]);

    if (!authReady || !currentUser) {
        return (
            <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center font-sans p-6">
                <div className="text-center">
                    <div className="w-12 h-12 bg-[#0066cc] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Icon name="link" className="text-white text-lg" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Link Works 불러오는 중…</p>
                    {bootError && (
                        <p className="mt-3 text-[12px] text-[#86868b] max-w-sm mx-auto leading-relaxed">{bootError}</p>
                    )}
                </div>
            </div>
        );
    }

    const coreNavItems = [
        { id: 'dashboard', name: 'Dashboard', nameKo: '대시보드', icon: LayoutDashboard, roles: ['원장', '관리자', '강사'] },
        { id: 'academy', name: 'Academy', nameKo: '학원/직원', icon: Building, roles: ['원장', '관리자'] },
        { id: 'students', name: 'Students', nameKo: '학생', icon: Users, roles: ['원장', '관리자', '강사'] },
        { id: 'classes', name: 'Classes', nameKo: '클래스', icon: BookOpen, roles: ['원장', '관리자', '강사'] },
    ];
    const navItems = buildNavItems(academyInfo, coreNavItems);
    const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser.role));
    const moduleFlags = getModuleFlags(academyInfo);

    return (
        <div className={"flex h-screen font-sans " + (isPrintMode ? 'print-mode bg-white' : 'bg-[#f5f5f7]')}>
            {!isSyncing && !isCloudActive && currentUser && (
                <div className="absolute top-0 left-0 w-full bg-[#1d1d1f] text-[#f5f5f7] text-center py-2 text-[10px] font-bold no-print z-50 flex items-center justify-center gap-2 shadow-sm tracking-widest uppercase">
                    <i className="fas fa-database text-[#86868b]"></i> Running in Local Storage Mode
                </div>
            )}
            {bootError && fbUser && (
                <div className="absolute top-0 left-0 w-full bg-amber-500/90 text-white text-center py-2 text-[11px] font-semibold no-print z-50 px-4">
                    클라우드 동기화 경고: {bootError}
                </div>
            )}
            
            <div className="lg:hidden fixed top-4 left-4 z-50 no-print">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-white/80 backdrop-blur-md border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] p-2.5 rounded-full shadow-sm focus:outline-none transition-all">
                    <Icon name={isSidebarOpen ? "times" : "bars"} size={16} />
                </button>
            </div>
            
            {isSidebarOpen && <div className="lg:hidden fixed inset-0 bg-[#1d1d1f]/20 backdrop-blur-sm z-40 transition-all" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`w-64 bg-[#f5f5f7] border-r border-[rgba(0,0,0,0.05)] flex flex-col z-40 no-print shrink-0 transition-transform duration-500 fixed lg:relative h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className="p-8 pb-6 mt-10 lg:mt-0 cursor-pointer group">
                    <h1 className="text-[22px] font-bold flex items-center gap-3 tracking-tight text-[#1d1d1f] transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-[#0066cc] flex items-center justify-center shadow-sm transition-colors"><Icon name="link" className="text-white text-sm"/></div>
                        Link Works
                    </h1>
                    <p className="text-[#86868b] font-bold text-[10px] mt-2.5 ml-11 tracking-widest uppercase">{academyInfo.name || 'Academy'}</p>
                </div>

                <nav className="flex-1 mt-2 px-5 space-y-1.5 overflow-y-auto custom-scrollbar pb-6">
                    {visibleNavItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`group w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] transition-all duration-300 nav-btn ${activeTab === item.id ? 'active' : 'text-[#86868b] font-medium'}`}>
                            <item.icon />
                            <span className="relative inline-flex min-h-[1.25em] items-center">
                                <span className="transition-opacity duration-200 group-hover:opacity-0">{item.name}</span>
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 whitespace-nowrap">
                                    {item.nameKo || item.name}
                                </span>
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="p-5 border-t border-[rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-white border border-[rgba(0,0,0,0.05)] flex items-center justify-center text-[#86868b] shadow-sm"><UserIcon size={14}/></div>
                        <div>
                            <p className="text-[13px] font-bold text-[#1d1d1f]">{currentUser.name}</p>
                            <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-0.5">{currentUser.role}</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col relative w-full bg-white lg:rounded-l-[2rem] lg:border-l lg:border-y border-[rgba(0,0,0,0.05)] lg:my-2 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                <div className="flex-1 overflow-auto custom-scrollbar w-full print-container px-4 py-20 lg:p-12">
                    {activeTab === 'dashboard' && <DashboardView currentUser={currentUser} isInstructor={isInstructor} getMyStudents={getMyStudents} calcTeacherStats={calcTeacherStats} students={students} dashboardMemos={dashboardMemos} setDashboardMemos={setDashboardMemos} adminMemoMode={adminMemoMode} setAdminMemoMode={setAdminMemoMode} />}
                    {activeTab === 'academy' && <AcademyView academyInfo={academyInfo} setAcademyInfo={setAcademyInfo} instructors={instructors} openModal={openModal} deleteItem={deleteItem} handleBackupData={handleBackupData} handleRestoreData={handleRestoreData} backupInputRef={backupInputRef} />}
                    {activeTab === 'students' && <StudentsView getMyStudents={getMyStudents} isInstructor={isInstructor} openModal={openModal} deleteItem={deleteItem} fileInputRef={fileInputRef} handleExcelUpload={handleExcelUpload} downloadSampleExcel={downloadSampleExcel} classes={classes} setDetailTab={setDetailTab} moduleFlags={moduleFlags} />}
                    {activeTab === 'classes' && <ClassesView getMyClasses={getMyClasses} isInstructor={isInstructor} openModal={openModal} deleteItem={deleteItem} students={students} setDetailTab={setDetailTab} textbooks={textbooks} moduleFlags={moduleFlags} />}
                    {activeTab === 'timetable' && isModuleEnabled(academyInfo, 'timetable') && <TimetableView getMyClasses={getMyClasses} students={students} isInstructor={isInstructor} academyInfo={academyInfo} currentUser={currentUser} openModal={openModal} handlePrint={handlePrint} isPrintMode={isPrintMode} setDetailTab={setDetailTab} />}
                    {activeTab === 'tuition' && isModuleEnabled(academyInfo, 'settlement') && <TuitionView currentUser={currentUser} isInstructor={isInstructor} instructors={instructors} academyInfo={academyInfo} calcSettlementDetails={calcSettlementDetails} calcTeacherStats={calcTeacherStats} handleSessionChange={handleSessionChange} handleSettlementChange={handleSettlementChange} handlePrint={handlePrint} isPrintMode={isPrintMode} settlements={settlements} openModal={openModal} setDetailTab={setDetailTab} />}
                </div>
            </main>

            {modalState.isOpen && modalState.type === 'studentDetail' && (
                <StudentDetailModal stdId={modalState.data} students={students} classes={classes} textbooks={textbooks} currentUser={currentUser} isInstructor={isInstructor} isCloudActive={isCloudActive} db={db} setStudents={setStudents} closeModal={closeModal} openModal={openModal} detailTab={detailTab} setDetailTab={setDetailTab} academyInfo={academyInfo} />
                    )}
                    
                    {modalState.isOpen && modalState.type !== 'studentDetail' && (
                        <GeneralModal 
                            modalState={modalState} closeModal={closeModal} isCloudActive={isCloudActive} db={db} 
                    academyInfo={academyInfo} setAcademyInfo={setAcademyInfo} instructors={instructors} setInstructors={setInstructors} 
                    students={students} setStudents={setStudents} classes={classes} setClasses={setClasses} classSchedules={classSchedules} 
                    setClassSchedules={setClassSchedules} modalEnrolledStudents={modalEnrolledStudents} setModalEnrolledStudents={setModalEnrolledStudents} 
                    modalStudentSearchTerm={modalStudentSearchTerm} setModalStudentSearchTerm={setModalStudentSearchTerm} isWithdrawnStatus={isWithdrawnStatus} 
                    setIsWithdrawnStatus={setIsWithdrawnStatus} smsSelectedIds={smsSelectedIds} setSmsSelectedIds={setSmsSelectedIds} 
                    smsContent={smsContent} setSmsContent={setSmsContent} getMyStudents={getMyStudents} textbooks={textbooks} setTextbooks={setTextbooks}
                    moduleFlags={moduleFlags}
                />
            )}
        </div>
    );
}

