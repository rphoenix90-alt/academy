import React, { useState } from 'react';
import { primaryBtnCls, subtleBtnCls, getSubjectCardStyle } from '../lib/utils';
import { Icon, Plus, Search, Edit, Trash2 } from '../components/Icons';
export const ClassesView = ({ getMyClasses, isInstructor, openModal, deleteItem, students, setDetailTab, textbooks, moduleFlags = {} }) => {
    const [activeTab, setActiveTab] = useState('classes');
    const tab = moduleFlags.textbooks ? activeTab : 'classes';
    const [classSearchTerm, setClassSearchTerm] = useState('');
    const [classSubjectFilter, setClassSubjectFilter] = useState('전체');
    const [classGradeFilter, setClassGradeFilter] = useState('전체');
    const [expandedSubjects, setExpandedSubjects] = useState({'국어': true, '수학': true, '영어': true, '과학': true, '사회': true, '기타': true});
    const [visibleStudentClassId, setVisibleStudentClassId] = useState(null);
    const [textbookSubjectFilter, setTextbookSubjectFilter] = useState('전체');

    const displayClassesBase = getMyClasses();
    const filteredClasses = displayClassesBase.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(classSearchTerm.toLowerCase()) || (c.teacherName && c.teacherName.includes(classSearchTerm));
        const matchSubject = classSubjectFilter === '전체' || c.subject === classSubjectFilter;
        const matchGrade = classGradeFilter === '전체' || c.target === classGradeFilter;
        return matchSearch && matchSubject && matchGrade;
    });

    const sortedClasses = [...filteredClasses].sort((a, b) => a.name.localeCompare(b.name));
    const subjects = ['전체', ...new Set(displayClassesBase.map(c => c.subject))];
    const grades = ['전체', '중등', '중1', '중2', '중3', '고1', '고2', '고3'];

    const subjectOrder = ['국어', '수학', '영어', '과학', '사회', '기타'];
    const groupedClasses = { '국어': [], '수학': [], '영어': [], '과학': [], '사회': [], '기타': [] };
    sortedClasses.forEach(c => { if (groupedClasses[c.subject] !== undefined) groupedClasses[c.subject].push(c); else groupedClasses['기타'].push(c); });

    const textbookSubjects = ['전체', '국어', '수학', '영어', '과학', '사회'];
    const filteredTextbooks = textbooks.filter(t => textbookSubjectFilter === '전체' || t.subject === textbookSubjectFilter);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] tracking-tight">클래스{moduleFlags.textbooks ? ' 및 교재' : ''} {isInstructor && <span className="text-[15px] font-medium text-[#0066cc] ml-2">(내 강의)</span>}</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    {!isInstructor && tab === 'classes' && <button onClick={() => openModal('class')} className={primaryBtnCls}><Plus size={12}/> 새 학급 개설</button>}
                    {moduleFlags.textbooks && !isInstructor && tab === 'textbooks' && <button onClick={() => openModal('textbook')} className={primaryBtnCls}><Plus size={12}/> 새 교재 등록</button>}
                </div>
            </div>

            {moduleFlags.textbooks ? (
            <div className="flex gap-2 p-1 bg-[#f5f5f7] rounded-full w-max max-w-full custom-scrollbar overflow-x-auto">
                <button onClick={() => setActiveTab('classes')} className={`px-5 py-2 rounded-full font-semibold text-[13px] transition-all whitespace-nowrap ${tab === 'classes' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>클래스 관리</button>
                <button onClick={() => setActiveTab('textbooks')} className={`px-5 py-2 rounded-full font-semibold text-[13px] transition-all whitespace-nowrap ${tab === 'textbooks' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>교재 관리</button>
            </div>
            ) : null}

            {tab === 'classes' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row gap-3 mb-8">
                        <select value={classSubjectFilter} onChange={(e) => setClassSubjectFilter(e.target.value)} className="w-full sm:w-32 text-[13px] bg-white border border-[rgba(0,0,0,0.05)] rounded-full px-4 py-2.5 outline-none font-medium">
                            {subjects.map(s => <option key={s} value={s}>{s === '전체' ? '과목 전체' : s}</option>)}
                        </select>
                        <select value={classGradeFilter} onChange={(e) => setClassGradeFilter(e.target.value)} className="w-full sm:w-32 text-[13px] bg-white border border-[rgba(0,0,0,0.05)] rounded-full px-4 py-2.5 outline-none font-medium">
                            {grades.map(g => <option key={g} value={g}>{g === '전체' ? '대상 전체' : g}</option>)}
                        </select>
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><Search size={14}/></span>
                            <input type="text" value={classSearchTerm} onChange={(e) => setClassSearchTerm(e.target.value)} placeholder="클래스명 또는 강사 검색" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[rgba(0,0,0,0.05)] rounded-full outline-none text-[13px] font-medium" />
                        </div>
                    </div>

                    {sortedClasses.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-[rgba(0,0,0,0.05)] p-16 text-center text-[#86868b] font-medium text-[13px]">조건에 맞는 클래스가 없습니다.</div>
                    ) : (
                        <div className="space-y-10">
                            {subjectOrder.map(subj => {
                                const classesInSubj = groupedClasses[subj];
                                if (classesInSubj.length === 0) return null;
                                const isOpen = expandedSubjects[subj];

                                return (
                                    <div key={subj} className="animate-in fade-in duration-300">
                                        <button onClick={() => setExpandedSubjects(prev => ({...prev, [subj]: !isOpen}))} className="flex items-center gap-3 mb-5 group w-max text-left outline-none">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#86868b] group-hover:bg-[#e8e8ed]'}`}><Icon name={isOpen ? "chevron-down" : "chevron-right"} size={10}/></span>
                                            <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{subj}</h3>
                                            <span className="text-[11px] font-semibold text-[#86868b] bg-[#f5f5f7] px-2.5 py-0.5 rounded-full">{classesInSubj.length}</span>
                                        </button>

                                        {isOpen && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                {classesInSubj.map(c => {
                                                    const enrolledStudents = students.filter(s => s.status !== '퇴원' && (s.classIds || []).includes(c.id));
                                                    const subjectStyle = getSubjectCardStyle(c.subject || subj);
                                                    return (
                                                        <div
                                                            key={c.id}
                                                            className="p-6 rounded-[2rem] border apple-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between"
                                                            style={{
                                                                backgroundColor: subjectStyle.bg,
                                                                borderColor: subjectStyle.border,
                                                                borderLeftWidth: '4px',
                                                                borderLeftColor: subjectStyle.accent,
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div>
                                                                        <div className="flex gap-1.5 mb-2">
                                                                            <span className="text-[9px] font-bold bg-[#1d1d1f] text-white px-2 py-0.5 rounded uppercase tracking-wider">{c.target}</span>
                                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${subjectStyle.badge}`}>{c.subject}</span>
                                                                        </div>
                                                                        <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">{c.name}</h3>
                                                                    </div>
                                                                    {!isInstructor && (
                                                                        <div className="flex gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => openModal('class', c)} className="p-1.5 text-[#86868b] hover:text-[#0066cc] bg-white/80 hover:bg-white rounded-full transition-colors"><Edit size={12}/></button>
                                                                            <button onClick={() => deleteItem('class', c.id)} className="p-1.5 text-[#86868b] hover:text-[#ff3b30] bg-white/80 hover:bg-white rounded-full transition-colors"><Trash2 size={12}/></button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2 text-[12px] font-medium text-[#86868b] bg-white/55 p-4 rounded-2xl">
                                                                    <div className="flex justify-between"><span className="text-[#86868b]">담당</span> <span className="font-semibold text-[#1d1d1f]">{c.teacherName}</span></div>
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="text-[#86868b] whitespace-nowrap mt-0.5">시간</span> 
                                                                        <div className="flex flex-col items-end gap-1.5">
                                                                            {c.schedules && c.schedules.length > 0 ? (
                                                                                c.schedules.map(sch => (
                                                                                    <div key={sch.id} className="flex items-center gap-1.5 justify-end">
                                                                                        <div className="flex gap-0.5">{sch.days.map(d => <span key={d} className="bg-white text-[#1d1d1f] text-[9px] font-bold px-1 py-0.5 rounded border border-[rgba(0,0,0,0.05)] shadow-sm">{d}</span>)}</div>
                                                                                        <span className="font-semibold text-[#1d1d1f]">{sch.start} - {sch.end}</span>
                                                                                    </div>
                                                                                ))
                                                                            ) : <span className="font-semibold text-[#1d1d1f] text-right">{c.time}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-between pt-2 border-t border-[rgba(0,0,0,0.05)]"><span className="text-[#86868b]">수강료</span> <span className="font-semibold text-[#1d1d1f]">{Number(c.price).toLocaleString()}원</span></div>
                                                                </div>
                                                                
                                                                <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.08)]">
                                                                    <button onClick={() => setVisibleStudentClassId(visibleStudentClassId === c.id ? null : c.id)} className="w-full flex justify-between items-center group/btn outline-none">
                                                                        <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider group-hover/btn:text-[#1d1d1f] transition-colors">Students</span>
                                                                        <span className="text-[11px] font-bold text-[#1d1d1f] bg-white/70 px-2 py-0.5 rounded-full">{enrolledStudents.length}</span>
                                                                    </button>
                                                                    
                                                                    {visibleStudentClassId === c.id && (
                                                                        <div className="bg-white/70 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5 content-start mt-3 animate-in fade-in duration-200 border border-[rgba(0,0,0,0.02)]">
                                                                            {enrolledStudents.length === 0 ? (
                                                                                <span className="text-[11px] text-[#86868b] m-auto font-medium">수강생 없음</span>
                                                                            ) : (
                                                                                enrolledStudents.map(std => (
                                                                                    <button key={std.id} onClick={(e) => { e.stopPropagation(); setDetailTab('basic'); openModal('studentDetail', std.id); }} className={`text-[10px] font-semibold bg-white px-2 py-1 rounded shadow-sm hover:opacity-80 transition-opacity border border-[rgba(0,0,0,0.02)] ${std.gender === '여' ? 'text-[#ff3b30]' : 'text-[#0066cc]'}`}>
                                                                                        {std.name} <span className="text-[#86868b] ml-0.5 font-medium">{std.school || ''}</span>
                                                                                    </button>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {moduleFlags.textbooks && tab === 'textbooks' && (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-6">
                        <select value={textbookSubjectFilter} onChange={(e) => setTextbookSubjectFilter(e.target.value)} className="w-full sm:w-40 text-[13px] bg-white border border-[rgba(0,0,0,0.05)] rounded-full px-4 py-2.5 outline-none font-medium">
                            {textbookSubjects.map(s => <option key={s} value={s}>{s === '전체' ? '과목 전체 보기' : s}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredTextbooks.length === 0 ? (
                            <div className="col-span-full bg-white rounded-3xl border border-[rgba(0,0,0,0.05)] p-16 text-center text-[#86868b] font-medium text-[13px]">등록된 교재가 없습니다.</div>
                        ) : (
                            filteredTextbooks.map(t => (
                                <div key={t.id} className="bg-white p-6 rounded-3xl border border-[rgba(0,0,0,0.05)] apple-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[9px] font-bold bg-[#f5f5f7] text-[#86868b] px-2 py-0.5 rounded uppercase tracking-wider">{t.subject}</span>
                                            {!isInstructor && (
                                                <div className="flex gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openModal('textbook', t)} className="p-1.5 text-[#86868b] hover:text-[#0066cc] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-full transition-colors"><Edit size={10}/></button>
                                                    <button onClick={() => deleteItem('textbook', t.id)} className="p-1.5 text-[#86868b] hover:text-[#ff3b30] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-full transition-colors"><Trash2 size={10}/></button>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-[15px] font-bold text-[#1d1d1f] mb-1.5 leading-snug">{t.name}</h3>
                                        <p className="text-[11px] font-medium text-[#86868b] flex items-center gap-1.5"><Icon name="book" size={10}/> {t.publisher || '미상'}</p>
                                    </div>
                                    <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.05)] text-right">
                                        <span className="text-sm font-bold text-[#1d1d1f]">{Number(t.price).toLocaleString()}원</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

