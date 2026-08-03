import React, { useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { studentDoc } from '../lib/paths';
import {
  triggerNotification, generateId, formatDate, inputCls, labelCls, subtleBtnCls,
} from '../lib/utils';
import { Icon, UserIcon, XIcon, Edit, Save, Plus, Trash2, Check } from './Icons';

function ScoreGraph({ data, title, color }) {
    if (!data || data.length === 0) return <div className="flex-1 bg-[#f5f5f7] rounded-3xl p-8 flex items-center justify-center text-[#86868b] text-sm font-medium">{title} 데이터가 없습니다.</div>;
    const sortedData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-10);
    const maxScore = 100;
    const width = 400; const height = 160; const padding = 24;

    const points = sortedData.map((d, i) => {
        const x = padding + (i * (width - 2 * padding) / Math.max(1, sortedData.length - 1));
        const scoreNum = Number((String(d.score)).replace(/[^0-9.]/g,'')) || 0;
        const y = height - padding - (Math.min(maxScore, scoreNum) / maxScore) * (height - 2 * padding);
        return {x: isNaN(x) ? width/2 : x, y: isNaN(y) ? height/2 : y, label: d.exam, score: d.score, date: d.date};
    });

    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    return (
        <div className="flex-1 bg-white p-6 rounded-3xl border border-[rgba(0,0,0,0.05)] apple-shadow">
            <h5 className="text-[13px] font-semibold text-[#1d1d1f] mb-6 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: color}}></span> {title} 변동 추이</h5>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                {[0, 25, 50, 75, 100].map(val => {
                    const y = height - padding - (val/100)*(height - 2*padding);
                    return <line key={val} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />;
                })}
                <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, idx) => (
                    <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
                        <text x={p.x} y={p.y - 14} fontSize="12" textAnchor="middle" fill="#1d1d1f" fontWeight="600">{p.score}</text>
                        <text x={p.x} y={height} fontSize="10" textAnchor="middle" fill="#86868b">{p.date.substring(5).replace('-','/')}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};


export const StudentDetailModal = ({ stdId, students, classes, currentUser, isInstructor, isCloudActive, db, setStudents, closeModal, openModal, detailTab, setDetailTab }) => {
    const [isClassManageOpen, setIsClassManageOpen] = useState(false);
    const [expandedTuitionId, setExpandedTuitionId] = useState(null);
    const [editingTuition, setEditingTuition] = useState(null);
    const [editingClassTuitionId, setEditingClassTuitionId] = useState(null);

    const std = students.find(s => s.id === stdId);
    if (!std) return null;
    
    const stdClasses = (std.classIds || []).map(cId => classes.find(c=>c.id===cId)).filter(Boolean);
    const totalExpected = stdClasses.reduce((sum, c) => {
        const customPrice = std.customClassTuition?.[c.id];
        const price = customPrice !== undefined && customPrice !== '' ? Number(customPrice) : Number(c.price || 0);
        return sum + price;
    }, 0);

    const handleAddGrade = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newGrade = { id: generateId(), date: fd.get('date'), examType: fd.get('examType'), exam: fd.get('exam'), score: fd.get('score'), rating: fd.get('rating') };
        const updatedStudent = {...std, grades: [...(std.grades||[]), newGrade]};
        if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
        else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
        e.target.reset();
        triggerNotification('성적이 등록되었습니다.');
    };

    const handleAddCounseling = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newRecord = { id: generateId(), date: fd.get('date'), content: fd.get('content'), author: currentUser.name };
        const updatedStudent = {...std, counseling: [...(std.counseling||[]), newRecord]};
        if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
        else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
        e.target.reset();
        triggerNotification('상담 이력이 등록되었습니다.');
    };

    const handleAddOrEditTuition = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const tData = { month: fd.get('month'), amount: fd.get('amount'), method: fd.get('method'), payDate: fd.get('payDate') };

        let updatedTuitionHistory;
        if (editingTuition) {
            updatedTuitionHistory = (std.tuitionHistory||[]).map(th => th.id === editingTuition.id ? {...th, ...tData} : th);
            setEditingTuition(null);
        } else {
            updatedTuitionHistory = [...(std.tuitionHistory||[]), {id: generateId(), ...tData}];
        }
        const updatedStudent = {...std, tuitionHistory: updatedTuitionHistory};
        if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
        else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
        triggerNotification(editingTuition ? '수납 내역이 수정되었습니다.' : '수납 내역이 추가되었습니다.');
        e.target.reset();
    };

    const handleSaveMemo = async () => {
        const memoVal = document.getElementById('studentMemo').value;
        const cashReceiptVal = document.getElementById('studentCashReceipt').value; 
        const updatedStudent = {...std, memo: memoVal, cashReceipt: cashReceiptVal};
        if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
        else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
        triggerNotification('정보가 저장되었습니다.');
    };

    const deleteRecord = async (recordType, rId) => {
        if(!window.confirm('기록을 삭제하시겠습니까?')) return;
        const updatedStudent = {...std, [recordType]: std[recordType].filter(r => r.id !== rId)};
        if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
        else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
    };
    
    const updateClassEnrollDate = async (classId, newDate) => {
        if (!newDate) return;
        const history = [...(std.classHistory || [])];
        const activeIndex = history.findIndex(h => h.classId === classId && !h.dropDate);
        if (activeIndex !== -1) {
            history[activeIndex].enrollDate = newDate;
            const updatedStudent = { ...std, classHistory: history };
            if (isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
            else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
        }
    };

    const updateHistoryRecord = async (historyId, field, value) => {
        const history = [...(std.classHistory || [])];
        const idx = history.findIndex(h => h.id === historyId);
        if (idx !== -1) {
            history[idx][field] = value;
            const updatedStudent = { ...std, classHistory: history };
            if (isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
            else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
        }
    };

    const toggleClassEnrollment = async (classId, className) => {
        const currentClassIds = std.classIds || [];
        const isEnrolled = currentClassIds.includes(classId);
        const newClassIds = isEnrolled 
            ? currentClassIds.filter(id => id !== classId) 
            : [...currentClassIds, classId];
        
        const newCustomClassTuition = { ...(std.customClassTuition || {}) };
        if (isEnrolled) delete newCustomClassTuition[classId]; 

        const history = [...(std.classHistory || [])];
        const today = formatDate(new Date());

        if (isEnrolled) {
            const activeRecordIndex = history.findIndex(h => h.classId === classId && !h.dropDate);
            if (activeRecordIndex !== -1) history[activeRecordIndex].dropDate = today;
            else history.push({ id: generateId(), classId, className, enrollDate: '이전', dropDate: today });
        } else {
            history.push({ id: generateId(), classId, className, enrollDate: today, dropDate: null });
        }

        const updatedStudent = { ...std, classIds: newClassIds, customClassTuition: newCustomClassTuition, classHistory: history };
        if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
        else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
    };

    return (
        <div className="fixed inset-0 bg-[#1d1d1f]/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
                <div className="px-6 py-4 flex justify-between items-center border-b border-[rgba(0,0,0,0.05)] bg-[#f5f5f7]/80 backdrop-blur-md shrink-0">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b] ml-2">Student Profile</h3>
                    <button type="button" onClick={closeModal} className="text-[#86868b] hover:text-[#1d1d1f] p-1.5 bg-white rounded-full border border-[rgba(0,0,0,0.05)] shadow-sm transition-all hover:scale-105"><XIcon size={12}/></button>
                </div>
                
                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    <div className="w-full lg:w-[260px] bg-[#f5f5f7] border-b lg:border-r border-[rgba(0,0,0,0.05)] flex flex-col custom-scrollbar shrink-0">
                        <div className="p-8 text-center border-b border-[rgba(0,0,0,0.05)] hidden lg:block">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm border-[3px] border-white ${std.gender === '여' ? 'bg-[#fff0f0] text-[#ff3b30]' : 'bg-[#f0f9ff] text-[#0066cc]'}`}><UserIcon size={28}/></div>
                            <h4 className={`text-xl font-bold mb-1 tracking-tight ${std.gender === '여' ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>{std.name}</h4>
                            <p className="text-[11px] font-semibold text-[#86868b] mb-4">{std.school} {std.grade && `(${std.grade})`}</p>
                            <span className={"text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-[rgba(0,0,0,0.02)] " + (std.status==='재원' ? 'bg-[#e5fcf1] text-[#008f5d]' : (std.status === '퇴원' ? 'bg-[#fff0f0] text-[#ff3b30]' : 'bg-white text-[#86868b]'))}>{std.status}</span>
                        </div>
                        <div className="lg:hidden flex justify-between items-center p-4 bg-[#f5f5f7] border-b border-[rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border-2 border-white ${std.gender === '여' ? 'bg-[#fff0f0] text-[#ff3b30]' : 'bg-[#f0f9ff] text-[#0066cc]'}`}><UserIcon size={16}/></div>
                                <div>
                                    <h4 className={`text-base font-bold tracking-tight ${std.gender === '여' ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>{std.name}</h4>
                                    <p className="text-[10px] font-semibold text-[#86868b]">{std.school} {std.grade && `(${std.grade})`}</p>
                                </div>
                            </div>
                            <span className={"text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm border border-[rgba(0,0,0,0.02)] " + (std.status==='재원' ? 'bg-[#e5fcf1] text-[#008f5d]' : (std.status === '퇴원' ? 'bg-[#fff0f0] text-[#ff3b30]' : 'bg-white text-[#86868b]'))}>{std.status}</span>
                        </div>
                        <div className="flex lg:flex-col p-3 overflow-x-auto lg:overflow-y-auto custom-scrollbar gap-1.5">
                            {[
                                { id: 'basic', label: '기본 정보', icon: 'id-card' },
                                { id: 'history', label: '수강 이력', icon: 'history' },
                                { id: 'grades', label: '성적 관리', icon: 'chart-line' },
                                { id: 'counseling', label: '상담 이력', icon: 'comments' }
                            ].concat(!isInstructor ? [{ id: 'tuition', label: '수강료 현황', icon: 'credit-card' }] : []).map(t => (
                                <button key={t.id} onClick={() => setDetailTab(t.id)} className={`flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold rounded-xl transition-all whitespace-nowrap ${detailTab === t.id ? 'bg-white text-[#1d1d1f] shadow-sm border border-[rgba(0,0,0,0.02)]' : 'text-[#86868b] hover:bg-[#e8e8ed] hover:text-[#1d1d1f] border border-transparent'}`}>
                                    <Icon name={t.icon} className={detailTab === t.id ? 'text-[#0066cc]' : 'text-[#a1a1a6]'} /> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="w-full lg:flex-1 bg-white p-6 sm:p-10 overflow-y-auto custom-scrollbar relative">
                        {detailTab === 'basic' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center border-b border-[rgba(0,0,0,0.05)] pb-4">
                                    <h4 className="text-xl font-bold text-[#1d1d1f] tracking-tight">기본 정보</h4>
                                    {!isInstructor && <button onClick={() => { closeModal(); openModal('student', std); }} className={subtleBtnCls}><Edit size={10}/> 수정</button>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-[13px]">
                                    <div className="bg-[#f5f5f7]/50 p-5 rounded-2xl border border-[rgba(0,0,0,0.05)]"><span className="block text-[10px] font-bold text-[#86868b] mb-1.5 uppercase tracking-widest">학생 연락처</span><span className="font-semibold text-[#1d1d1f]">{std.phone || '미입력'}</span></div>
                                    <div className="bg-[#f5f5f7]/50 p-5 rounded-2xl border border-[rgba(0,0,0,0.05)]"><span className="block text-[10px] font-bold text-[#86868b] mb-1.5 uppercase tracking-widest">학부모 연락처</span><span className="font-semibold text-[#1d1d1f]">{std.parentPhone || '미입력'}</span></div>
                                    
                                    {std.status === '퇴원' && (
                                        <div className="bg-[#fff0f0]/50 p-5 rounded-2xl border border-[#ff3b30]/20 sm:col-span-2">
                                            <span className="block text-[10px] font-bold text-[#ff3b30] mb-1.5 uppercase tracking-widest">퇴원 사유 ({std.withdrawDate || '-'})</span>
                                            <span className="font-semibold text-[#1d1d1f]">{std.withdrawReason || '사유 미입력'}</span>
                                        </div>
                                    )}

                                    <div className="bg-[#f5f5f7]/50 p-5 rounded-2xl border border-[rgba(0,0,0,0.05)] sm:col-span-2 relative">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="block text-[10px] font-bold text-[#86868b] uppercase tracking-widest">수강 중인 강좌</span>
                                            {!isInstructor && (
                                                <button 
                                                    onClick={() => setIsClassManageOpen(!isClassManageOpen)} 
                                                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${isClassManageOpen ? 'bg-[#1d1d1f] text-white shadow-sm' : 'bg-white border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] hover:bg-[#f5f5f7] shadow-sm'}`}
                                                >
                                                    <Icon name="tasks" size={10}/> 수강 강좌 관리
                                                </button>
                                            )}
                                        </div>
                                        
                                        {isClassManageOpen && !isInstructor && (
                                            <div className="animate-in fade-in slide-in-from-top-2 bg-white border border-[#0066cc]/20 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                                <div className="text-[10px] font-bold text-[#0066cc] mb-3 border-b border-[#0066cc]/10 pb-2 uppercase tracking-widest">배정 및 시작일 관리</div>
                                                <div className="space-y-2">
                                                    {classes.length === 0 ? <p className="text-xs text-[#86868b]">개설된 클래스가 없습니다.</p> : 
                                                        [...classes].sort((a,b) => a.name.localeCompare(b.name)).map(c => {
                                                            const isEnrolled = (std.classIds || []).includes(c.id);
                                                            const activeHistory = isEnrolled ? (std.classHistory || []).find(h => h.classId === c.id && !h.dropDate) : null;
                                                            return (
                                                            <div key={c.id} className={`flex flex-col gap-1.5 p-2.5 rounded-xl transition-colors ${isEnrolled ? 'bg-[#f0f9ff] border border-[#0066cc]/10' : 'hover:bg-[#f5f5f7] border border-transparent'}`}>
                                                                <label className="flex items-center gap-2.5 text-[13px] cursor-pointer w-max">
                                                                    <input type="checkbox" checked={isEnrolled} onChange={() => toggleClassEnrollment(c.id, c.name)} className="accent-[#0066cc] w-3.5 h-3.5" />
                                                                    <span className={`font-semibold ${isEnrolled ? 'text-[#0066cc]' : 'text-[#1d1d1f]'}`}>{c.name}</span>
                                                                    <span className="text-[10px] text-[#86868b] font-medium">({c.teacherName}) / {c.target}</span>
                                                                </label>
                                                                {isEnrolled && activeHistory && (
                                                                    <div className="ml-6 flex items-center gap-2">
                                                                        <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-widest">수강 시작일:</span>
                                                                        <input 
                                                                            type="date" 
                                                                            value={activeHistory.enrollDate || ''} 
                                                                            onChange={(e) => updateClassEnrollDate(c.id, e.target.value)}
                                                                            className="bg-white border border-[rgba(0,0,0,0.05)] rounded-md px-2 py-1 text-[11px] font-medium focus:border-[#0066cc] outline-none text-[#1d1d1f] shadow-sm transition-all" 
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )})}
                                                </div>
                                            </div>
                                        )}

                                        {stdClasses.length > 0 ? 
                                            <div className="flex flex-wrap gap-2">{stdClasses.map(c => <span key={c.id} className="bg-white border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] font-semibold px-3 py-1.5 rounded-full text-[12px] shadow-sm flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#008f5d]"></span> {c.name} ({c.teacherName})</span>)}</div> 
                                            : <span className="text-[#86868b] font-medium text-xs">배정된 강좌가 없습니다.</span>
                                        }
                                    </div>
                                    <div className="sm:col-span-2 mt-4 pt-6 border-t border-[rgba(0,0,0,0.05)]">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2 mb-2">
                                            <span className="block text-[10px] font-bold text-[#86868b] uppercase tracking-widest ml-1">현금영수증 번호</span>
                                        </div>
                                        <input id="studentCashReceipt" readOnly={isInstructor} defaultValue={std.cashReceipt || ''} placeholder={isInstructor ? "입력된 정보가 없습니다." : "예: 010-1234-5678"} className={`w-full bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl px-4 py-3 text-[13px] focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none mb-6 font-medium transition-all ${isInstructor && 'cursor-not-allowed'}`} />

                                        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-2">
                                            <span className="block text-[10px] font-bold text-[#86868b] uppercase tracking-widest ml-1">관리자 전용 학생 메모</span>
                                            {!isInstructor && <button onClick={handleSaveMemo} className="w-full sm:w-auto text-[11px] font-semibold bg-[#1d1d1f] text-white px-4 py-2 rounded-full shadow-sm hover:bg-black transition-colors flex justify-center items-center gap-1.5"><Save size={10}/> 변경사항 저장</button>}
                                        </div>
                                        <textarea id="studentMemo" readOnly={isInstructor} defaultValue={std.memo || ''} placeholder={isInstructor ? "메모 내용이 없습니다." : "원장/관리자 전용 메모입니다."} className={`w-full bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-2xl p-4 text-[13px] h-32 resize-none custom-scrollbar focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all font-medium leading-relaxed ${isInstructor && 'cursor-not-allowed text-[#86868b]'}`}></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {detailTab === 'history' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="border-b border-[rgba(0,0,0,0.05)] pb-4"><h4 className="text-xl font-bold text-[#1d1d1f] tracking-tight">수강 이력 관리</h4></div>
                                <p className="text-[11px] font-semibold text-[#86868b] bg-[#f5f5f7] px-4 py-3 rounded-xl flex items-center gap-2 border border-[rgba(0,0,0,0.02)]"><Icon name="info-circle" className="text-[#0066cc]"/> 기본 정보 탭의 [수강 강좌 관리]에서 반 배정을 변경하면 시작/종료일이 자동 기록됩니다.</p>
                                
                                <div className="overflow-x-auto custom-scrollbar border border-[rgba(0,0,0,0.05)] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                    <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[500px]">
                                        <thead className="bg-[#f5f5f7]/50 text-[#86868b] text-[10px] font-semibold uppercase tracking-wider border-b border-[rgba(0,0,0,0.05)]">
                                            <tr><th className="px-5 py-3">수강 강좌명</th><th className="px-5 py-3 text-center">시작일</th><th className="px-5 py-3 text-center">종료일</th><th className="px-5 py-3 text-center">상태</th><th className="px-5 py-3 text-right"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[rgba(0,0,0,0.02)]">
                                            {!(std.classHistory?.length) ? <tr><td colSpan="5" className="p-12 text-center text-[#86868b] font-medium text-[12px]">등록된 이력이 없습니다.</td></tr> : 
                                            std.classHistory.sort((a,b) => new Date(b.enrollDate||0) - new Date(a.enrollDate||0)).map(h => (
                                                <tr key={h.id} className="hover:bg-[#f5f5f7]/50 group transition-colors">
                                                    <td className="px-5 py-3 font-semibold text-[#1d1d1f]">{h.className}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        <input type="date" value={h.enrollDate || ''} onChange={(e) => updateHistoryRecord(h.id, 'enrollDate', e.target.value)} className="bg-white border border-[rgba(0,0,0,0.05)] rounded-md px-2 py-1.5 text-[11px] focus:border-[#0066cc] outline-none w-32 font-medium text-[#1d1d1f] text-center transition-all shadow-sm" />
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <input type="date" value={h.dropDate || ''} onChange={(e) => updateHistoryRecord(h.id, 'dropDate', e.target.value)} className="bg-white border border-[rgba(0,0,0,0.05)] rounded-md px-2 py-1.5 text-[11px] focus:border-[#0066cc] outline-none w-32 font-medium text-[#1d1d1f] text-center transition-all shadow-sm" />
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${!h.dropDate ? 'bg-[#e5fcf1] text-[#008f5d]' : 'bg-[#f5f5f7] text-[#86868b]'}`}>{!h.dropDate ? '수강중' : '종료'}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <button onClick={() => deleteRecord('classHistory', h.id)} className="text-[#86868b] hover:text-[#ff3b30] lg:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white border border-[rgba(0,0,0,0.05)] rounded-md shadow-sm lg:border-transparent lg:shadow-none lg:bg-transparent"><Trash2 size={12}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {detailTab === 'grades' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="border-b border-[rgba(0,0,0,0.05)] pb-4"><h4 className="text-xl font-bold text-[#1d1d1f] tracking-tight">성적 관리</h4></div>
                                
                                <div className="flex flex-col xl:flex-row gap-5 mb-6">
                                    <ScoreGraph data={(std.grades||[]).filter(g => g.examType === '내신' || !g.examType)} title="내신 (중간/기말)" color="#f97316" />
                                    <ScoreGraph data={(std.grades||[]).filter(g => g.examType === '모의고사')} title="모의고사" color="#0066cc" />
                                </div>

                                <form onSubmit={handleAddGrade} className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-end bg-[#f5f5f7]/50 p-5 rounded-2xl border border-[rgba(0,0,0,0.05)]">
                                    <div className="w-full sm:w-32"><label className={labelCls}>시험일</label><input type="date" required name="date" defaultValue={formatDate(new Date())} className={inputCls}/></div>
                                    <div className="w-full sm:w-28"><label className={labelCls}>구분</label><select name="examType" className={inputCls}><option value="내신">내신</option><option value="모의고사">모의고사</option></select></div>
                                    <div className="flex-1 min-w-full sm:min-w-[150px]"><label className={labelCls}>시험명</label><input type="text" required name="exam" placeholder="예: 기말고사" className={inputCls}/></div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <div className="flex-1 sm:w-20"><label className={labelCls}>점수</label><input type="text" required name="score" placeholder="95" className={inputCls}/></div>
                                        <div className="flex-1 sm:w-20"><label className={labelCls}>등급</label><input type="text" name="rating" placeholder="1" className={inputCls}/></div>
                                    </div>
                                    <button type="submit" className="w-full sm:w-auto mt-2 sm:mt-0 bg-[#1d1d1f] hover:bg-black text-white font-medium px-5 py-3 rounded-xl transition-all text-[13px] shadow-sm flex justify-center items-center gap-1.5"><Plus size={10}/> 등록</button>
                                </form>
                                <div className="overflow-x-auto custom-scrollbar border border-[rgba(0,0,0,0.05)] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                    <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[600px]">
                                        <thead className="bg-[#f5f5f7]/50 text-[#86868b] text-[10px] font-semibold uppercase tracking-wider border-b border-[rgba(0,0,0,0.05)]"><tr><th className="px-5 py-3">일자</th><th className="px-5 py-3">구분</th><th className="px-5 py-3">시험명</th><th className="px-5 py-3 text-center">점수</th><th className="px-5 py-3 text-center">등급</th><th className="px-5 py-3 text-right"></th></tr></thead>
                                        <tbody className="divide-y divide-[rgba(0,0,0,0.02)]">
                                            {!(std.grades?.length) ? <tr><td colSpan="6" className="p-12 text-center text-[#86868b] font-medium text-[12px]">등록된 성적이 없습니다.</td></tr> : 
                                            std.grades.sort((a,b) => new Date(b.date) - new Date(a.date)).map(g => (
                                                <tr key={g.id} className="hover:bg-[#f5f5f7]/50 group transition-colors">
                                                    <td className="px-5 py-3 font-medium text-[#86868b]">{g.date}</td>
                                                    <td className="px-5 py-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${g.examType === '모의고사' ? 'bg-[#f0f9ff] text-[#0066cc]' : 'bg-[#fff6ed] text-[#f97316]'}`}>{g.examType || '내신'}</span></td>
                                                    <td className="px-5 py-3 font-semibold text-[#1d1d1f]">{g.exam}</td>
                                                    <td className="px-5 py-3 text-center font-bold text-[#1d1d1f] text-[15px]">{g.score}</td>
                                                    <td className="px-5 py-3 text-center font-semibold text-[#86868b] text-[14px]">{g.rating || '-'}</td>
                                                    <td className="px-5 py-3 text-right"><button onClick={() => deleteRecord('grades', g.id)} className="text-[#86868b] hover:text-[#ff3b30] lg:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white border border-[rgba(0,0,0,0.05)] rounded-md shadow-sm lg:border-transparent lg:shadow-none lg:bg-transparent"><Trash2 size={12}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {detailTab === 'counseling' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="border-b border-[rgba(0,0,0,0.05)] pb-4"><h4 className="text-xl font-bold text-[#1d1d1f] tracking-tight">상담 이력</h4></div>
                                <form onSubmit={handleAddCounseling} className="bg-[#f5f5f7]/50 p-5 rounded-2xl border border-[rgba(0,0,0,0.05)] space-y-3">
                                    <div className="w-full sm:w-1/3"><label className={labelCls}>상담일</label><input type="date" required name="date" defaultValue={formatDate(new Date())} className={inputCls}/></div>
                                    <div><label className={labelCls}>상담 내용</label><textarea required name="content" className="w-full text-[13px] bg-white border border-[rgba(0,0,0,0.05)] rounded-xl px-4 py-3 focus:border-[#0066cc] outline-none h-28 resize-none custom-scrollbar transition-all font-medium text-[#1d1d1f] shadow-inner" placeholder="내용을 기록하세요."></textarea></div>
                                    <div className="text-right flex justify-end"><button type="submit" className="bg-[#1d1d1f] hover:bg-black text-white px-5 py-2.5 rounded-full font-medium text-[12px] transition-all shadow-sm flex items-center gap-1.5"><Plus size={10}/> 등록</button></div>
                                </form>
                                <div className="space-y-4">
                                    {!(std.counseling?.length) ? <p className="text-center text-[#86868b] py-12 font-medium text-[12px]">상담 이력이 없습니다.</p> : 
                                    std.counseling.sort((a,b) => new Date(b.date) - new Date(a.date)).map(c => (
                                        <div key={c.id} className="bg-white border border-[rgba(0,0,0,0.05)] rounded-2xl p-5 sm:p-6 group relative apple-shadow transition-shadow">
                                            <button onClick={() => deleteRecord('counseling', c.id)} className="absolute top-5 right-5 text-[#86868b] hover:text-[#ff3b30] lg:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white border border-[rgba(0,0,0,0.05)] rounded-md shadow-sm lg:border-transparent lg:shadow-none lg:bg-transparent"><Trash2 size={12}/></button>
                                            <div className="flex flex-wrap gap-2 items-center mb-3 pr-8">
                                                <span className="text-[10px] font-bold bg-[#f5f5f7] text-[#86868b] px-2.5 py-1 rounded-md">{c.date}</span>
                                                <span className="text-[10px] font-bold text-[#0066cc] flex items-center gap-1 uppercase tracking-wide"><Icon name="user-edit" size={10}/> {c.author || '미상'}</span>
                                            </div>
                                            <p className="text-[13px] text-[#1d1d1f] whitespace-pre-wrap leading-relaxed font-medium">{c.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isInstructor && detailTab === 'tuition' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center border-b border-[rgba(0,0,0,0.05)] pb-4">
                                    <h4 className="text-xl font-bold text-[#1d1d1f] tracking-tight">수강료 현황 및 납부 내역</h4>
                                </div>
                                
                                <div className="bg-white rounded-3xl border border-[rgba(0,0,0,0.05)] p-5 sm:p-6 apple-shadow">
                                    <h5 className="font-semibold text-[13px] text-[#1d1d1f] mb-5 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#0066cc]"></span> 맞춤 수강료 설정
                                    </h5>
                                    <div className="space-y-2">
                                        {stdClasses.length === 0 ? (
                                            <p className="text-[12px] font-medium text-[#86868b] text-center py-6 bg-[#f5f5f7] rounded-xl">수강 중인 강좌가 없습니다.</p>
                                        ) : (
                                            stdClasses.map(c => {
                                                const originalPrice = Number(c.price || 0);
                                                const customPrice = std.customClassTuition?.[c.id];
                                                const currentPrice = customPrice !== undefined && customPrice !== '' ? Number(customPrice) : originalPrice;
                                                const isDiscounted = currentPrice !== originalPrice;
                                                const isEditingThis = editingClassTuitionId === c.id;

                                                return (
                                                    <div key={c.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-[#f5f5f7]/50 rounded-xl border border-[rgba(0,0,0,0.02)] gap-3 sm:gap-0 transition-colors">
                                                        <div>
                                                            <p className="text-[13px] font-semibold text-[#1d1d1f] tracking-tight">{c.name} <span className="text-[10px] font-medium text-[#86868b] ml-1.5 uppercase">{c.teacherName}</span></p>
                                                            <p className="text-[10px] font-medium text-[#86868b] mt-1 tracking-wide">기본: {originalPrice.toLocaleString()}원</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                                            {isEditingThis ? (
                                                                <form 
                                                                    onSubmit={async (e) => {
                                                                        e.preventDefault();
                                                                        const val = e.target.priceInput.value;
                                                                        const newPrice = val === '' ? originalPrice : Number(val);
                                                                        if (newPrice !== currentPrice) {
                                                                            const updatedCustom = { ...(std.customClassTuition || {}), [c.id]: newPrice };
                                                                            const updatedStudent = { ...std, customClassTuition: updatedCustom };
                                                                            if(isCloudActive) await setDoc(studentDoc(db, std.id), updatedStudent);
                                                                            else setStudents(prev => prev.map(s => s.id === std.id ? updatedStudent : s));
                                                                            triggerNotification(`수강료가 변경되었습니다.`);
                                                                        }
                                                                        setEditingClassTuitionId(null);
                                                                    }}
                                                                    className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[rgba(0,0,0,0.05)] shadow-sm"
                                                                >
                                                                    <input 
                                                                        type="number" 
                                                                        name="priceInput"
                                                                        className="w-24 text-right bg-transparent px-2 py-1 focus:outline-none text-[13px] font-semibold text-[#1d1d1f] placeholder-[#a1a1a6]"
                                                                        defaultValue={currentPrice}
                                                                        placeholder={originalPrice.toString()}
                                                                        autoFocus
                                                                    />
                                                                    <span className="text-[11px] font-semibold text-[#86868b] mr-1">원</span>
                                                                    <button type="button" onClick={() => setEditingClassTuitionId(null)} className="text-[10px] text-[#86868b] hover:bg-[#f5f5f7] px-2 py-1 rounded font-semibold transition-colors">취소</button>
                                                                    <button type="submit" className="text-[10px] bg-[#1d1d1f] text-white px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1"><Check size={10}/></button>
                                                                </form>
                                                            ) : (
                                                                <>
                                                                    <div className="text-right">
                                                                        <span className={`text-[15px] font-bold tracking-tight ${isDiscounted ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>
                                                                            {currentPrice.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[11px] font-medium text-[#86868b] ml-0.5">원</span>
                                                                    </div>
                                                                    {isDiscounted && <span className="text-[9px] bg-[#fff0f0] text-[#ff3b30] px-2 py-0.5 rounded uppercase tracking-widest ml-1 font-bold">조정됨</span>}
                                                                    <button onClick={() => setEditingClassTuitionId(c.id)} className="ml-2 text-[10px] bg-white border border-[rgba(0,0,0,0.05)] px-2.5 py-1 rounded-full text-[#86868b] hover:bg-[#f5f5f7] shadow-sm font-semibold transition-colors flex items-center gap-1"><Edit size={10}/> 수정</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="mt-6 pt-5 border-t border-[rgba(0,0,0,0.05)] flex justify-between items-end">
                                        <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">당월 예상 총액</p>
                                        <p className="text-2xl font-bold text-[#1d1d1f] tracking-tight">{totalExpected > 0 ? `${totalExpected.toLocaleString()}원` : '-'}</p>
                                    </div>
                                </div>
                                
                                <form key={editingTuition ? editingTuition.id : 'new'} onSubmit={handleAddOrEditTuition} className="bg-[#f5f5f7]/50 p-5 rounded-2xl border border-[rgba(0,0,0,0.05)] grid grid-cols-2 md:grid-cols-5 gap-3 items-end mt-6">
                                    <div><label className={labelCls}>청구월</label><input type="month" required name="month" defaultValue={editingTuition ? editingTuition.month : formatDate(new Date()).substring(0, 7)} className={inputCls}/></div>
                                    <div><label className={labelCls}>납부일</label><input type="date" required name="payDate" defaultValue={editingTuition ? editingTuition.payDate : formatDate(new Date())} className={inputCls}/></div>
                                    <div><label className={labelCls}>납부액(원)</label><input type="number" required name="amount" defaultValue={editingTuition ? editingTuition.amount : totalExpected} className={inputCls} placeholder="직접 입력"/></div>
                                    <div><label className={labelCls}>방법</label><select name="method" defaultValue={editingTuition ? editingTuition.method : '카드'} className={inputCls}><option>카드</option><option>현금</option><option>계좌이체</option></select></div>
                                    <div className="flex gap-2 md:col-span-1 col-span-2">
                                        <button type="submit" className="flex-1 bg-[#1d1d1f] hover:bg-black text-white font-medium px-3 py-3 rounded-xl transition-all text-[12px] shadow-sm">{editingTuition ? '수정' : '등록'}</button>
                                        {editingTuition && <button type="button" onClick={() => setEditingTuition(null)} className="flex-1 bg-white border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] hover:bg-[#f5f5f7] font-medium px-3 py-3 rounded-xl transition-all text-[12px]">취소</button>}
                                    </div>
                                </form>

                                <div className="border border-[rgba(0,0,0,0.05)] rounded-2xl overflow-hidden mt-6 apple-shadow">
                                    <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[500px]">
                                        <thead className="bg-[#f5f5f7]/50 text-[#86868b] text-[10px] font-semibold uppercase tracking-wider border-b border-[rgba(0,0,0,0.05)]">
                                            <tr><th className="px-5 py-3">청구월</th><th className="px-5 py-3">납부일</th><th className="px-5 py-3 text-right">납부액</th><th className="px-5 py-3 text-center">상태</th><th className="px-5 py-3 text-right"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[rgba(0,0,0,0.02)]">
                                            {!(std.tuitionHistory?.length) ? <tr><td colSpan="5" className="p-12 text-center text-[#86868b] font-medium text-[12px]">납부 내역이 없습니다.</td></tr> : 
                                            std.tuitionHistory.sort((a,b) => new Date(b.payDate) - new Date(a.payDate)).map(t => (
                                                <React.Fragment key={t.id}>
                                                    <tr onClick={() => setExpandedTuitionId(expandedTuitionId === t.id ? null : t.id)} className="hover:bg-[#f5f5f7]/50 cursor-pointer group transition-colors">
                                                        <td className="px-5 py-4 font-semibold text-[#1d1d1f]">{t.month}</td>
                                                        <td className="px-5 py-4 text-[#86868b] font-medium">{t.payDate}</td>
                                                        <td className="px-5 py-4 text-right font-bold text-[#1d1d1f] text-[14px]">{Number(t.amount).toLocaleString()}원</td>
                                                        <td className="px-5 py-4 text-center"><span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-[#e5fcf1] text-[#008f5d] uppercase tracking-widest">완료</span></td>
                                                        <td className="px-5 py-4 text-right flex justify-end gap-1">
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingTuition(t); }} className="text-[#86868b] hover:text-[#0066cc] lg:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white rounded-md border border-[rgba(0,0,0,0.05)] shadow-sm"><Edit size={12}/></button>
                                                            <button onClick={(e) => { e.stopPropagation(); deleteRecord('tuitionHistory', t.id); }} className="text-[#86868b] hover:text-[#ff3b30] lg:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white rounded-md border border-[rgba(0,0,0,0.05)] shadow-sm"><Trash2 size={12}/></button>
                                                        </td>
                                                    </tr>
                                                    {expandedTuitionId === t.id && (
                                                        <tr className="bg-[#f0f9ff]/30">
                                                            <td colSpan="5" className="px-5 py-3 border-t border-[rgba(0,0,0,0.02)]">
                                                                <div className="flex flex-wrap gap-5 text-[11px] text-[#86868b] font-medium">
                                                                    <div><span className="font-semibold uppercase tracking-widest mr-1">수단</span> <span className="text-[#1d1d1f]">{t.method}</span></div>
                                                                    <div><span className="font-semibold uppercase tracking-widest mr-1">일시</span> <span className="text-[#1d1d1f]">{t.payDate}</span></div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

