import React, { useState } from 'react';
import { setDoc } from 'firebase/firestore';
import {
  academyDoc, instructorDoc, studentDoc, classDoc, textbookDoc,
} from '../lib/paths';
import {
  triggerNotification, generateId, formatDate, formatPhoneNumber, timeOptions,
  inputCls, labelCls, primaryBtnCls, secondaryBtnCls,
} from '../lib/utils';
import { normalizePhoneDigits } from '../lib/auth';
import { XIcon, Plus } from './Icons';

export const GeneralModal = ({ 
    modalState, closeModal, isCloudActive, db, academyInfo, setAcademyInfo,
    instructors, setInstructors, students, setStudents, classes, setClasses,
    classSchedules, setClassSchedules, modalEnrolledStudents, setModalEnrolledStudents,
    modalStudentSearchTerm, setModalStudentSearchTerm, isWithdrawnStatus, setIsWithdrawnStatus,
    smsSelectedIds, setSmsSelectedIds, smsContent, setSmsContent, getMyStudents, textbooks, setTextbooks
}) => {
    const { type, data } = modalState;
    const isEdit = !!data;
    const [classEnrollDate, setClassEnrollDate] = useState(() => formatDate(new Date()));

    const handlePhoneInput = (e) => { e.target.value = formatPhoneNumber(e.target.value); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (type === 'sms') {
            if (smsSelectedIds.length === 0) return triggerNotification('수신자를 선택해주세요.', true);
            if (!smsContent.trim()) return triggerNotification('메시지 내용을 입력해주세요.', true);
            triggerNotification(`${smsSelectedIds.length}건 발송 성공`);
            closeModal();
            return;
        }

        const fd = new FormData(e.target);
        const obj = Object.fromEntries(fd.entries());
        
        try {
            if (type === 'instructor') {
                obj.email = (obj.email || '').trim().toLowerCase();
                obj.phoneDigits = normalizePhoneDigits(obj.phone);
                if (!obj.phoneDigits || obj.phoneDigits.length < 10) {
                    return triggerNotification('로그인용 전화번호를 정확히 입력해 주세요.', true);
                }
                obj.loginId = obj.phone || obj.email;
                delete obj.password;
                const targetId = isEdit ? data.id : generateId();
                const payload = { id: targetId, ...(isEdit ? data : {}), ...obj };
                delete payload.password;
                if(isCloudActive) await setDoc(instructorDoc(db, targetId), payload);
                else {
                    if(isEdit) setInstructors(prev => prev.map(i => i.id === data.id ? payload : i));
                    else setInstructors(prev => [...prev, payload]);
                }
            } 
            else if (type === 'student') {
                const targetId = isEdit ? data.id : generateId();
                const baseData = isEdit ? data : { grades:[], counseling:[], tuitionHistory:[], memo:'', classHistory: [], cashReceipt: '', classIds: [] };
                
                if (obj.status !== '퇴원') {
                    obj.withdrawReason = '';
                    obj.withdrawDate = '';
                }
                
                if(isCloudActive) await setDoc(studentDoc(db, targetId), {id: targetId, ...baseData, ...obj});
                else {
                    if(isEdit) setStudents(prev => prev.map(i => i.id === data.id ? {...i, ...obj} : i));
                    else setStudents(prev => [...prev, {id: targetId, ...baseData, ...obj}]);
                }
            } 
            else if (type === 'class') {
                const teacherName = instructors.find(i => i.id === obj.teacherId)?.name || '미정';
                const targetId = isEdit ? data.id : generateId();
                
                obj.schedules = classSchedules;
                obj.time = classSchedules.map(s => `${s.days.join('/')} ${s.start}~${s.end}`).join('\n');
                if (!obj.weeklySessions) obj.weeklySessions = classSchedules.reduce((acc, cur) => acc + cur.days.length, 0) || 1;

                if(isCloudActive) await setDoc(classDoc(db, targetId), {id: targetId, ...data, ...obj, teacherName});
                else {
                    if(isEdit) setClasses(prev => prev.map(i => i.id === data.id ? {...i, ...obj, teacherName} : i));
                    else setClasses(prev => [...prev, {id: targetId, ...obj, teacherName}]);
                }

                const classNameToSave = obj.name;
                const enrollDateToSave = classEnrollDate;
                const prevEnrolled = isEdit ? students.filter(s => (s.classIds || []).includes(targetId)).map(s => s.id) : [];
                const toAdd = modalEnrolledStudents.filter(id => !prevEnrolled.includes(id));
                const toRemove = prevEnrolled.filter(id => !modalEnrolledStudents.includes(id));

                for (const sId of toAdd) {
                    const std = students.find(s => s.id === sId);
                    if (std) {
                        const newClassIds = [...(std.classIds || []), targetId];
                        const history = [...(std.classHistory || [])];
                        history.push({ id: generateId(), classId: targetId, className: classNameToSave, enrollDate: enrollDateToSave, dropDate: null });
                        const finalStd = { ...std, classIds: newClassIds, classHistory: history };
                        if (isCloudActive) await setDoc(studentDoc(db, sId), finalStd);
                        else setStudents(prev => prev.map(s => s.id === sId ? finalStd : s));
                    }
                }

                for (const sId of toRemove) {
                    const std = students.find(s => s.id === sId);
                    if (std) {
                        const newClassIds = (std.classIds || []).filter(id => id !== targetId);
                        const newCustomClassTuition = { ...(std.customClassTuition || {}) };
                        delete newCustomClassTuition[targetId];

                        const history = [...(std.classHistory || [])];
                        const activeRecordIndex = history.findIndex(h => h.classId === targetId && !h.dropDate);
                        if (activeRecordIndex !== -1) history[activeRecordIndex].dropDate = formatDate(new Date());
                        else history.push({ id: generateId(), classId: targetId, className: classNameToSave, enrollDate: '이전', dropDate: formatDate(new Date()) });

                        const finalStd = { ...std, classIds: newClassIds, customClassTuition: newCustomClassTuition, classHistory: history };
                        if (isCloudActive) await setDoc(studentDoc(db, sId), finalStd);
                        else setStudents(prev => prev.map(s => s.id === sId ? finalStd : s));
                    }
                }
            } else if (type === 'academyEdit') {
                const updatedAcademy = { ...academyInfo, ...obj };
                if(isCloudActive) await setDoc(academyDoc(db), updatedAcademy);
                else setAcademyInfo(updatedAcademy);
            } else if (type === 'textbook') {
                const targetId = isEdit ? data.id : generateId();
                if(isCloudActive) await setDoc(textbookDoc(db, targetId), {id: targetId, ...data, ...obj});
                else {
                    if(isEdit) setTextbooks(prev => prev.map(i => i.id === data.id ? {...i, ...obj} : i));
                    else setTextbooks(prev => [...prev, {id: targetId, ...obj}]);
                }
            }
            triggerNotification(isEdit ? '수정됨' : '등록됨');
            closeModal();
        } catch(err) {
            triggerNotification('저장 실패', true);
        }
    };

    const myStudentsForSms = getMyStudents();
    const toggleSmsAll = (e) => {
        if (e.target.checked) setSmsSelectedIds(myStudentsForSms.map(s => s.id));
        else setSmsSelectedIds([]);
    };
    const toggleSmsStudent = (id) => {
        if (smsSelectedIds.includes(id)) setSmsSelectedIds(prev => prev.filter(i => i !== id));
        else setSmsSelectedIds(prev => [...prev, id]);
    };

    const filteredSearchStudents = modalStudentSearchTerm ? students.filter(s => s.status !== '퇴원' && !modalEnrolledStudents.includes(s.id) && (s.name.includes(modalStudentSearchTerm) || (s.phone && s.phone.replace(/-/g,'').includes(modalStudentSearchTerm.replace(/-/g,''))))).slice(0, 5) : [];

    return (
        <div className="fixed inset-0 bg-[#1d1d1f]/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-8 py-5 border-b border-[rgba(0,0,0,0.05)] flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-[17px] font-bold text-[#1d1d1f] tracking-tight">
                        {type === 'instructor' && (isEdit ? 'Staff Edit' : 'New Staff')}
                        {type === 'student' && (isEdit ? 'Student Edit' : 'New Student')}
                        {type === 'class' && (isEdit ? 'Class Edit' : 'New Class')}
                        {type === 'academyEdit' && 'Academy Settings'}
                        {type === 'textbook' && (isEdit ? 'Textbook Edit' : 'New Textbook')}
                        {type === 'sms' && 'Send SMS'}
                    </h3>
                    <button type="button" onClick={closeModal} className="text-[#86868b] hover:text-[#1d1d1f] p-1.5 bg-[#f5f5f7] rounded-full transition-colors"><XIcon size={12}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    <form id="modalForm" onSubmit={handleSubmit} className="space-y-4">
                        {type === 'instructor' && <>
                            <div><label className={labelCls}>이름</label><input required name="name" defaultValue={data?.name} className={inputCls}/></div>
                            <div><label className={labelCls}>권한</label><select required name="role" defaultValue={data?.role || '강사'} className={inputCls}><option value="원장">원장</option><option value="관리자">관리자</option><option value="강사">강사</option></select></div>
                            <div><label className={labelCls}>연락처 (로그인용)</label><input required name="phone" defaultValue={data?.phone} onInput={handlePhoneInput} placeholder="010-0000-0000" className={inputCls}/></div>
                            <div><label className={labelCls}>이메일 (선택)</label><input type="email" name="email" defaultValue={data?.email} placeholder="선택 입력" className={inputCls}/></div>
                            <div><label className={labelCls}>상태</label><select name="status" defaultValue={data?.status || '재직'} className={inputCls}><option>재직</option><option>휴직</option><option>퇴사</option></select></div>
                            <p className="text-[11px] text-[#86868b] font-medium leading-relaxed">
                              원장을 제외한 직원은 전화번호로 로그인합니다. 최초 비밀번호는 전화번호 뒤 4자리이며, 첫 로그인 시 새 비밀번호(4자리)를 설정합니다.
                              {data?.authUid ? ' (계정 연결됨)' : ' (아직 미연결)'}
                            </p>
                        </>}

                        {type === 'academyEdit' && <>
                            <div><label className={labelCls}>학원명</label><input required name="name" defaultValue={data?.name} className={inputCls}/></div>
                            <div><label className={labelCls}>대표자명</label><input required name="ceoName" defaultValue={data?.ceoName} className={inputCls}/></div>
                            <div><label className={labelCls}>사업자번호</label><input name="bizNumber" defaultValue={data?.bizNumber} className={inputCls}/></div>
                            <div><label className={labelCls}>대표 연락처</label><input required name="phone" defaultValue={data?.phone} onInput={handlePhoneInput} className={inputCls}/></div>
                            <div><label className={labelCls}>소재지</label><input required name="address" defaultValue={data?.address} className={inputCls}/></div>
                        </>}

                        {type === 'student' && <>
                            <div className="flex gap-4">
                                <div className="flex-[2]"><label className={labelCls}>이름</label><input required name="name" defaultValue={data?.name} className={inputCls}/></div>
                                <div className="flex-1"><label className={labelCls}>성별</label><select name="gender" defaultValue={data?.gender || '남'} className={inputCls}><option value="남">남</option><option value="여">여</option></select></div>
                            </div>
                            <div><label className={labelCls}>등록일(입학일)</label><input required type="date" name="enrollDate" defaultValue={data?.enrollDate || formatDate(new Date())} className={inputCls} /></div>
                            <div className="flex gap-4">
                                <div className="flex-1"><label className={labelCls}>학교</label><input required name="school" defaultValue={data?.school} className={inputCls}/></div>
                                <div className="w-1/3"><label className={labelCls}>학년</label>
                                    <select name="grade" defaultValue={data?.grade} className={inputCls}>
                                        <option value="">선택</option><option value="초등">초등</option><option value="중등">중등</option>
                                        <option value="중1">중1</option><option value="중2">중2</option><option value="중3">중3</option>
                                        <option value="고1">고1</option><option value="고2">고2</option><option value="고3">고3</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className={labelCls}>학생 연락처</label><input name="phone" defaultValue={data?.phone} onInput={handlePhoneInput} placeholder="010-0000-0000" className={inputCls}/></div>
                            <div><label className={labelCls}>학부모 연락처</label><input name="parentPhone" defaultValue={data?.parentPhone} onInput={handlePhoneInput} placeholder="010-0000-0000" className={inputCls}/></div>
                            <div><label className={labelCls}>상태</label>
                                <select name="status" defaultValue={data?.status || '재원'} onChange={(e) => setIsWithdrawnStatus(e.target.value === '퇴원')} className={inputCls}>
                                    <option value="재원">재원</option><option value="휴원">휴원</option><option value="퇴원">퇴원</option>
                                </select>
                            </div>
                            
                            {isWithdrawnStatus && (
                                <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-[#fff0f0] border border-[#ff3b30]/20 rounded-xl space-y-4 mt-2">
                                    <div><label className="block text-[10px] font-bold text-[#ff3b30] uppercase tracking-widest mb-1.5 ml-1">퇴원일</label><input required type="date" name="withdrawDate" defaultValue={data?.withdrawDate || formatDate(new Date())} className="w-full bg-white border border-[rgba(0,0,0,0.05)] rounded-lg px-3 py-2 text-[13px] outline-none text-[#1d1d1f]" /></div>
                                    <div><label className="block text-[10px] font-bold text-[#ff3b30] uppercase tracking-widest mb-1.5 ml-1">퇴원 사유</label><input required name="withdrawReason" defaultValue={data?.withdrawReason || ''} placeholder="사유 입력" className="w-full bg-white border border-[rgba(0,0,0,0.05)] rounded-lg px-3 py-2 text-[13px] outline-none text-[#1d1d1f]" /></div>
                                </div>
                            )}
                        </>}

                        {type === 'class' && <>
                            <div><label className={labelCls}>클래스명</label><input required name="name" defaultValue={data?.name} className={inputCls}/></div>
                            <div className="flex gap-4">
                                <div className="flex-1"><label className={labelCls}>과목</label>
                                    <select required name="subject" defaultValue={data?.subject || '국어'} className={inputCls}>
                                        <option value="국어">국어</option><option value="수학">수학</option><option value="영어">영어</option>
                                        <option value="과학">과학</option><option value="사회">사회</option><option value="기타">기타</option>
                                    </select>
                                </div>
                                <div className="flex-1"><label className={labelCls}>대상(학년)</label>
                                    <select required name="target" defaultValue={data?.target || '전학년'} className={inputCls}>
                                        <option value="전학년">전학년</option><option value="초등">초등</option><option value="중등">중등</option>
                                        <option value="중1">중1</option><option value="중2">중2</option><option value="중3">중3</option>
                                        <option value="고1">고1</option><option value="고2">고2</option><option value="고3">고3</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className={labelCls}>담당 강사</label>
                                <select required name="teacherId" defaultValue={data?.teacherId} className={inputCls}>
                                    <option value="">강사 선택</option>
                                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.role})</option>)}
                                </select>
                            </div>
                            
                            <div className="border border-[rgba(0,0,0,0.05)] rounded-2xl p-4 bg-[#f5f5f7]/50 space-y-4">
                                <div className="flex justify-between items-center"><label className="block text-[11px] font-bold text-[#86868b] uppercase tracking-wider">수업 일정</label></div>
                                {classSchedules.map((sch) => (
                                    <div key={sch.id} className="flex flex-col gap-4 p-4 bg-white border border-[rgba(0,0,0,0.05)] rounded-xl shadow-sm relative">
                                        {classSchedules.length > 1 && (<button type="button" onClick={() => setClassSchedules(classSchedules.filter(s => s.id !== sch.id))} className="absolute top-2.5 right-2.5 text-[#86868b] hover:text-[#ff3b30] bg-[#f5f5f7] rounded-full p-1"><XIcon size={10}/></button>)}
                                        <div className="flex gap-1.5 justify-start flex-wrap pr-6">
                                            {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                                                <button type="button" key={day} onClick={() => setClassSchedules(classSchedules.map(s => s.id === sch.id ? {...s, days: sch.days.includes(day) ? sch.days.filter(d => d !== day) : [...sch.days, day]} : s))} className={`w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${sch.days.includes(day) ? 'bg-[#1d1d1f] text-white shadow-sm' : 'bg-[#f5f5f7] text-[#86868b]'}`}>
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select value={sch.start} onChange={(e) => setClassSchedules(classSchedules.map(s => s.id === sch.id ? {...s, start: e.target.value} : s))} className="flex-1 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-lg px-3 py-2 outline-none">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                            <span className="text-[#a1a1a6] font-bold">-</span>
                                            <select value={sch.end} onChange={(e) => setClassSchedules(classSchedules.map(s => s.id === sch.id ? {...s, end: e.target.value} : s))} className="flex-1 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-lg px-3 py-2 outline-none">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setClassSchedules([...classSchedules, { id: generateId(), days: [], start: '18:00', end: '20:00' }])} className="w-full bg-transparent border border-dashed border-[rgba(0,0,0,0.15)] text-[#86868b] font-medium py-2.5 rounded-xl text-[12px] flex justify-center items-center gap-1.5"><Plus size={10}/> 일정 추가</button>
                            </div>

                            <div className="border border-[rgba(0,0,0,0.05)] rounded-2xl p-4 bg-[#f5f5f7]/50 space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-[11px] font-bold text-[#86868b] uppercase tracking-wider">수강생 명단</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-[#86868b] uppercase tracking-wider">일괄 수강 시작일</span>
                                        <input type="date" value={classEnrollDate} onChange={(e) => setClassEnrollDate(e.target.value)} className="bg-white border border-[rgba(0,0,0,0.05)] rounded-md px-2 py-1.5 text-[11px] outline-none text-[#1d1d1f] font-medium shadow-sm" />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 min-h-[40px] p-3 bg-white border border-[rgba(0,0,0,0.05)] rounded-xl shadow-inner">
                                    {modalEnrolledStudents.length === 0 ? <span className="text-[11px] text-[#86868b] m-auto">배정된 학생 없음</span> : 
                                     modalEnrolledStudents.map(sId => {
                                         const s = students.find(x => x.id === sId);
                                         if (!s) return null;
                                         return (
                                             <span key={s.id} className={`text-[10px] font-semibold bg-[#f5f5f7] px-2 py-1 rounded-md flex items-center gap-1 border border-[rgba(0,0,0,0.02)] ${s.gender === '여' ? 'text-[#ff3b30]' : 'text-[#0066cc]'}`}>
                                                 {s.name} <span className="font-medium text-[9px] text-[#86868b]">({s.school})</span>
                                                 <button type="button" onClick={() => setModalEnrolledStudents(prev => prev.filter(id => id !== s.id))} className="text-[#a1a1a6] hover:text-[#ff3b30] ml-0.5"><XIcon size={8}/></button>
                                             </span>
                                         );
                                     })
                                    }
                                </div>
                                <div className="relative">
                                    <input type="text" value={modalStudentSearchTerm} onChange={e => setModalStudentSearchTerm(e.target.value)} placeholder="이름으로 검색" className={inputCls}/>
                                    {modalStudentSearchTerm && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[rgba(0,0,0,0.05)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] z-10 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                            {filteredSearchStudents.map(s => (
                                                <div key={s.id} onClick={() => { setModalEnrolledStudents(prev => [...prev, s.id]); setModalStudentSearchTerm(''); }} className="px-4 py-2.5 text-[13px] hover:bg-[#f5f5f7] cursor-pointer flex justify-between items-center rounded-lg transition-colors">
                                                    <span className="font-semibold text-[#1d1d1f]">{s.name} <span className="text-[10px] text-[#86868b] font-medium ml-1">({s.school})</span></span>
                                                    <span className="text-[11px] text-[#86868b] font-medium">{s.phone}</span>
                                                </div>
                                            ))}
                                            {filteredSearchStudents.length === 0 && <div className="px-4 py-3 text-[11px] text-center text-[#86868b]">결과 없음</div>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-1/3"><label className={labelCls}>주간 횟수</label><input required type="number" name="weeklySessions" min="1" defaultValue={data?.weeklySessions || 2} className={inputCls}/></div>
                                <div className="flex-1"><label className={labelCls}>기본 수강료 (원)</label><input required type="number" name="price" defaultValue={data?.price} className={inputCls} placeholder="자유 입력"/></div>
                            </div>
                            <div>
                                <label className={labelCls}>메모 / 비고</label>
                                <div className="border border-[rgba(0,0,0,0.05)] rounded-xl overflow-hidden bg-white shadow-sm focus-within:border-[#0066cc] focus-within:ring-2 focus-within:ring-[#0066cc]/20 transition-all">
                                    <div className="bg-[#f5f5f7] border-b border-[rgba(0,0,0,0.05)] p-1.5 flex items-center gap-1">
                                        <button type="button" onClick={() => document.execCommand('bold', false, null)} className="w-7 h-7 flex items-center justify-center hover:bg-[#e8e8ed] rounded text-[#1d1d1f] font-bold transition-colors" title="B">B</button>
                                        <button type="button" onClick={() => document.execCommand('underline', false, null)} className="w-7 h-7 flex items-center justify-center hover:bg-[#e8e8ed] rounded text-[#1d1d1f] underline transition-colors" title="U">U</button>
                                        <div className="w-[1px] h-4 bg-[#d2d2d7] mx-1"></div>
                                        <input type="color" onChange={(e) => document.execCommand('foreColor', false, e.target.value)} className="w-6 h-6 p-0.5 border-0 bg-transparent cursor-pointer rounded" />
                                    </div>
                                    <div contentEditable="true" className="w-full p-4 text-[13px] outline-none min-h-[100px] custom-scrollbar max-h-40 overflow-y-auto leading-relaxed text-[#1d1d1f] font-medium" onInput={(e) => document.getElementById('hiddenNote').value = e.target.innerHTML} dangerouslySetInnerHTML={{ __html: data?.note || '' }}></div>
                                    <input type="hidden" name="note" id="hiddenNote" defaultValue={data?.note || ''} />
                                </div>
                            </div>
                        </>}

                        {type === 'textbook' && <>
                            <div><label className={labelCls}>교재명</label><input required name="name" defaultValue={data?.name} className={inputCls} placeholder="예: 중등 수학의 완성"/></div>
                            <div><label className={labelCls}>과목</label>
                                <select required name="subject" defaultValue={data?.subject || '국어'} className={inputCls}>
                                    <option value="국어">국어</option><option value="수학">수학</option><option value="영어">영어</option>
                                    <option value="과학">과학</option><option value="사회">사회</option><option value="기타">기타</option>
                                </select>
                            </div>
                            <div><label className={labelCls}>출판사</label><input name="publisher" defaultValue={data?.publisher} className={inputCls} placeholder="예: 좋은책신사고 (선택사항)"/></div>
                            <div><label className={labelCls}>단가(원)</label><input required type="number" name="price" defaultValue={data?.price} className={inputCls} placeholder="자유 입력"/></div>
                        </>}

                        {type === 'sms' && <>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-[11px] font-bold text-[#86868b] uppercase tracking-wider">수신자 선택 <span className="text-[#0066cc]">({smsSelectedIds.length})</span></label>
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#86868b] cursor-pointer uppercase tracking-widest"><input type="checkbox" checked={smsSelectedIds.length === myStudentsForSms.length && myStudentsForSms.length > 0} onChange={toggleSmsAll} className="accent-[#0066cc] w-3 h-3"/> 전체</label>
                                </div>
                                <div className="max-h-48 overflow-y-auto border border-[rgba(0,0,0,0.05)] rounded-xl p-2.5 bg-[#f5f5f7]/50 space-y-1 custom-scrollbar">
                                    {myStudentsForSms.length === 0 ? <p className="text-[11px] text-[#86868b] p-4 text-center font-medium">수신 대상 없음</p> :
                                    myStudentsForSms.map(s => (
                                        <label key={s.id} className="flex items-center gap-3 text-[13px] cursor-pointer p-2 hover:bg-white rounded-lg transition-colors">
                                            <input type="checkbox" checked={smsSelectedIds.includes(s.id)} onChange={() => toggleSmsStudent(s.id)} className="accent-[#0066cc] w-3.5 h-3.5" />
                                            <span className={`font-medium ${s.gender === '여' ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>{s.name}</span> <span className="text-[10px] font-medium text-[#86868b]">{s.parentPhone || s.phone || '번호없음'}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2">
                                <label className={labelCls}>메시지 내용</label>
                                <textarea value={smsContent} onChange={e => setSmsContent(e.target.value)} placeholder="내용 입력" className={`${inputCls} h-32 resize-none`}></textarea>
                                <p className="text-[9px] font-bold text-[#86868b] mt-1.5 text-right tracking-wider">{smsContent.length} / 2000</p>
                            </div>
                        </>}
                    </form>
                </div>
                <div className="p-6 border-t border-[rgba(0,0,0,0.05)] flex gap-3 justify-end bg-[#f5f5f7]/50 shrink-0">
                    <button type="button" onClick={closeModal} className={secondaryBtnCls}>Cancel</button>
                    <button type="submit" form="modalForm" className={primaryBtnCls}>
                        {type === 'sms' ? 'Send' : (isEdit ? 'Save' : 'Add')}
                    </button>
                </div>
            </div>
        </div>
    );
};

