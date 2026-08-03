import React, { useState } from 'react';
import { formatDate, primaryBtnCls, secondaryBtnCls } from '../lib/utils';
import { BookOpen, Plus, Printer, Clock, CreditCard } from '../components/Icons';
export const TimetableView = ({ getMyClasses, students, isInstructor, academyInfo, currentUser, openModal, handlePrint, isPrintMode, setDetailTab }) => {
    const [timetableTab, setTimetableTab] = useState('전체');
    
    const baseClasses = getMyClasses();
    const grouped = {};
    baseClasses.forEach(c => {
        if (c.subject === '기타') {
            const allTargets = ['고3', '고2', '고1', '중3', '중2', '중1', '중등', '초등', '전학년'];
            allTargets.forEach(groupKey => {
                if(!grouped[groupKey]) grouped[groupKey] = {};
                if(!grouped[groupKey][c.subject]) grouped[groupKey][c.subject] = [];
                if(!grouped[groupKey][c.subject].find(item => item.id === c.id)) grouped[groupKey][c.subject].push(c);
            });
        } else {
            const groupKey = c.target || '미분류';
            if(!grouped[groupKey]) grouped[groupKey] = {};
            if(!grouped[groupKey][c.subject]) grouped[groupKey][c.subject] = [];
            grouped[groupKey][c.subject].push(c);
        }
    });

    const availableTabs = ['고3', '고2', '고1', '중3', '중2', '중1', '중등', '초등', '전학년'].filter(tab => grouped[tab]);
    const displayTab = availableTabs.includes(timetableTab) ? timetableTab : (availableTabs.length > 0 ? availableTabs[0] : null);
    const currentTabClasses = displayTab ? grouped[displayTab] : {};

    if (isPrintMode) {
        return (
            <div className="bg-white p-8 w-full max-w-[210mm] min-h-[297mm] mx-auto text-black font-sans print:m-0 print:shadow-none print:max-w-none flex flex-col justify-between">
                <div>
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-2xl font-bold mb-1 tracking-tight">{academyInfo.name || '학원'} {displayTab} 종합 시간표 {isInstructor && `(${currentUser.name})`}</h1>
                        <p className="text-xs font-semibold text-gray-500">업데이트: {formatDate(new Date())}</p>
                    </div>
                    {Object.entries(currentTabClasses).map(([subject, classesList], idx) => (
                        <div key={idx} className="mb-8 page-break-inside-avoid">
                            <h2 className="text-lg font-bold text-black mb-2 border-l-4 border-black pl-2">{subject}</h2>
                            <table className="w-full text-xs text-left border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100 font-bold border-b border-gray-300">
                                        <th className="p-2 border-r border-gray-300 w-1/4">강좌명</th>
                                        <th className="p-2 border-r border-gray-300 w-1/6 text-center">담당 강사</th>
                                        <th className="p-2 border-r border-gray-300 w-1/4">수업 시간</th>
                                        <th className="p-2 border-r border-gray-300 w-1/6 text-right">수강료</th>
                                        <th className="p-2">비고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classesList.map(cls => (
                                        <tr key={cls.id} className="border-b border-gray-200">
                                            <td className="p-2 border-r border-gray-300 font-bold">{cls.name}</td>
                                            <td className="p-2 border-r border-gray-300 text-center">{cls.teacherName}</td>
                                            <td className="p-2 border-r border-gray-300">
                                                {cls.schedules && cls.schedules.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {cls.schedules.map(sch => (
                                                            <div key={sch.id} className="flex items-center gap-1 flex-wrap">
                                                                <span className="text-[10px] font-bold">{sch.days.join('/')} {sch.start}~{sch.end}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : ( <span className="whitespace-pre-wrap text-[10px]">{cls.time}</span> )}
                                            </td>
                                            <td className="p-2 border-r border-gray-300 text-right">{Number(cls.price).toLocaleString()}원</td>
                                            <td className="p-2 whitespace-pre-wrap text-[10px] leading-tight"><div dangerouslySetInnerHTML={{ __html: cls.note || '' }} className="text-gray-600"></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] tracking-tight">종합 시간표 {isInstructor && <span className="text-lg font-semibold text-[#0066cc] ml-2">({currentUser.name} 전용)</span>}</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    {!isInstructor && <button onClick={() => openModal('class')} className={primaryBtnCls}><Plus size={12}/> 강좌 개설</button>}
                    <button onClick={handlePrint} className={secondaryBtnCls}><Printer size={12}/> 인쇄 / PDF</button>
                </div>
            </div>

            <div className="flex gap-2 p-1 bg-[#f5f5f7] rounded-full w-max max-w-full custom-scrollbar overflow-x-auto">
                {availableTabs.length === 0 ? <p className="text-[13px] font-medium text-[#86868b] px-4 py-2">개설된 클래스가 없습니다.</p> :
                 availableTabs.map(tab => (
                    <button key={tab} onClick={() => setTimetableTab(tab)} className={`px-5 py-2 rounded-full font-semibold text-[13px] transition-all whitespace-nowrap ${displayTab === tab ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>{tab}</button>
                ))}
            </div>

            <div className="space-y-8">
                {Object.keys(currentTabClasses).length > 0 ? Object.entries(currentTabClasses).map(([subject, classesList], groupIdx) => (
                    <div key={groupIdx} className="bg-white rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] overflow-hidden relative">
                        <div className="bg-[#f5f5f7]/50 px-6 sm:px-8 py-5 flex items-center gap-3 border-b border-[rgba(0,0,0,0.05)]"><BookOpen className="text-[#86868b]"/><h3 className="text-[15px] font-bold text-[#1d1d1f] uppercase tracking-widest">{subject}</h3></div>
                        <div className="p-6 sm:p-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                {classesList.map(cls => {
                                    const enrolledStudents = students.filter(s => s.status !== '퇴원' && (s.classIds || []).includes(cls.id));
                                    return (
                                        <div key={cls.id} className="bg-white rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-sm p-5 flex flex-col justify-between hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all group">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-bold text-[#1d1d1f] text-[15px] tracking-tight">{cls.name}</h4>
                                                    <span className="text-[10px] font-semibold bg-[#f5f5f7] text-[#86868b] px-2 py-0.5 rounded uppercase">{cls.teacherName}</span>
                                                </div>
                                                <div className="space-y-2 text-[13px] text-[#86868b] font-medium">
                                                    <div className="flex gap-3 items-start">
                                                        <Clock className="text-[#a1a1a6] mt-0.5" size={14}/>
                                                        {cls.schedules && cls.schedules.length > 0 ? (
                                                            <div className="flex flex-col gap-1 w-full">
                                                                {cls.schedules.map(sch => (
                                                                    <div key={sch.id} className="flex items-center gap-1.5 w-full flex-wrap">
                                                                        <div className="flex gap-0.5">
                                                                            {sch.days.map(d => <span key={d} className="bg-white border border-[rgba(0,0,0,0.05)] shadow-sm text-[#1d1d1f] text-[9px] font-bold px-1 py-0.5 rounded">{d}</span>)}
                                                                        </div>
                                                                        <span className="font-semibold text-[#1d1d1f]">{sch.start} - {sch.end}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : ( <span className="whitespace-pre-wrap">{cls.time}</span> )}
                                                    </div>
                                                    <div className="flex gap-3"><CreditCard className="text-[#a1a1a6] mt-0.5" size={14}/> <span className="font-semibold text-[#1d1d1f]">{Number(cls.price).toLocaleString()}원</span></div>
                                                </div>
                                            </div>
                                            <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.05)] flex flex-col gap-2 min-h-[40px]">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {enrolledStudents.length === 0 ? <span className="text-[11px] text-[#86868b] font-medium">수강생 없음</span> : 
                                                        enrolledStudents.map(std => (
                                                            <button 
                                                                key={std.id} 
                                                                onClick={(e) => { e.stopPropagation(); setDetailTab('basic'); openModal('studentDetail', std.id); }}
                                                                className={`hover:opacity-80 transition-opacity text-[10px] font-semibold bg-[#f5f5f7] px-2 py-1 rounded ${std.gender === '여' ? 'text-[#ff3b30]' : 'text-[#0066cc]'}`}
                                                            >
                                                                {std.name} <span className="text-[#86868b] font-medium ml-0.5">{std.school || ''}</span>
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center text-[#86868b] font-medium text-[13px]">해당 그룹에 배정된 강의가 없습니다.</div>
                )}
            </div>
        </div>
    );
};

