import React, { useState } from 'react';
import { primaryBtnCls, secondaryBtnCls, getSubjectCardStyle } from '../lib/utils';
import { BookOpen, Plus, Printer, Clock, CreditCard } from '../components/Icons';
import { PrintDocument } from '../components/PrintDocument';

const SUBJECT_ORDER = ['국어', '수학', '영어', '과학', '사회', '기타'];

function sortSubjects(entries) {
  return [...entries].sort((a, b) => {
    const ia = SUBJECT_ORDER.indexOf(a[0]);
    const ib = SUBJECT_ORDER.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

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
    const subjectEntries = sortSubjects(Object.entries(currentTabClasses));

    if (isPrintMode) {
        return (
            <PrintDocument
                academyInfo={academyInfo}
                docLabel="TIMETABLE"
                title={`${displayTab || ''} 종합 시간표`}
                subtitle={isInstructor ? `${currentUser.name} 전용 · ${academyInfo?.name || '학원'}` : (academyInfo?.name || '학원')}
            >
                {subjectEntries.length === 0 ? (
                    <p className="text-center text-[12px] text-[#86868b] py-16">배정된 강의가 없습니다.</p>
                ) : subjectEntries.map(([subject, classesList]) => {
                    const style = getSubjectCardStyle(subject);
                    return (
                        <div key={subject} className="mb-7 page-break-inside-avoid">
                            <div
                                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2.5"
                                style={{
                                    backgroundColor: style.bg,
                                    borderLeft: `4px solid ${style.accent}`,
                                }}
                            >
                                <span className="text-[13px] font-bold tracking-tight" style={{ color: style.accent }}>{subject}</span>
                            </div>
                            <table className="w-full text-[11px] text-left border-collapse print-table">
                                <thead>
                                    <tr>
                                        <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 w-[26%]">강좌명</th>
                                        <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 w-[14%] text-center">담당</th>
                                        <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 w-[28%]">수업 시간</th>
                                        <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 w-[14%] text-right">수강료</th>
                                        <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15">비고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classesList.map((cls, rowIdx) => (
                                        <tr key={cls.id} className={rowIdx % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'}>
                                            <td className="py-2.5 px-3 font-bold text-[#1d1d1f] border-b border-[#1d1d1f]/06">{cls.name}</td>
                                            <td className="py-2.5 px-3 text-center text-[#1d1d1f] border-b border-[#1d1d1f]/06">{cls.teacherName}</td>
                                            <td className="py-2.5 px-3 border-b border-[#1d1d1f]/06">
                                                {cls.schedules && cls.schedules.length > 0 ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        {cls.schedules.map(sch => (
                                                            <span key={sch.id} className="font-semibold text-[#1d1d1f]">
                                                                {sch.days.join('/')} {sch.start}~{sch.end}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="whitespace-pre-wrap text-[#1d1d1f]">{cls.time}</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-semibold text-[#1d1d1f] border-b border-[#1d1d1f]/06">
                                                {Number(cls.price).toLocaleString()}원
                                            </td>
                                            <td className="py-2.5 px-3 text-[10px] text-[#636366] border-b border-[#1d1d1f]/06 leading-snug">
                                                <div dangerouslySetInnerHTML={{ __html: cls.note || '—' }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </PrintDocument>
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
                {subjectEntries.length > 0 ? subjectEntries.map(([subject, classesList]) => {
                    const style = getSubjectCardStyle(subject);
                    return (
                    <div
                        key={subject}
                        className="rounded-3xl apple-shadow border overflow-hidden relative"
                        style={{
                            backgroundColor: '#fff',
                            borderColor: style.border,
                            borderLeftWidth: '4px',
                            borderLeftColor: style.accent,
                        }}
                    >
                        <div
                            className="px-6 sm:px-8 py-5 flex items-center gap-3 border-b"
                            style={{ backgroundColor: style.bg, borderColor: style.border }}
                        >
                            <BookOpen />
                            <h3 className="text-[15px] font-bold tracking-widest" style={{ color: style.accent }}>{subject}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${style.badge}`}>{classesList.length}</span>
                        </div>
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
                    );
                }) : (
                    <div className="py-20 text-center text-[#86868b] font-medium text-[13px]">해당 그룹에 배정된 강의가 없습니다.</div>
                )}
            </div>
        </div>
    );
};
