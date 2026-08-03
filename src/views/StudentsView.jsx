import React, { useState } from 'react';
import { formatDate, primaryBtnCls, secondaryBtnCls, subtleBtnCls, inputCls } from '../lib/utils';
import { Icon, Plus, Download, Upload, Search, Edit, Trash2, CreditCard } from '../components/Icons';
export const StudentsView = ({ getMyStudents, isInstructor, openModal, fileInputRef, handleExcelUpload, downloadSampleExcel, deleteItem, classes, setDetailTab, moduleFlags = {} }) => {
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [studentTab, setStudentTab] = useState('list');
    const [studentSortConfig, setStudentSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [tuitionMonth, setTuitionMonth] = useState(formatDate(new Date()).substring(0, 7));

    const displayStudents = getMyStudents().filter(s => {
        const term = studentSearchTerm.toLowerCase();
        const termWithoutHyphen = term.replace(/-/g, '');
        
        const matchName = s.name.toLowerCase().includes(term);
        const matchSchool = s.school && s.school.toLowerCase().includes(term);
        const matchPhone = s.phone && s.phone.replace(/-/g, '').includes(termWithoutHyphen);
        const matchParentPhone = s.parentPhone && s.parentPhone.replace(/-/g, '').includes(termWithoutHyphen);
        return matchName || matchSchool || matchPhone || matchParentPhone;
    });

    const activeStudents = displayStudents.filter(s => s.status !== '퇴원');
    const withdrawnStudents = displayStudents.filter(s => s.status === '퇴원');
    
    const listToSort = studentTab === 'withdrawn' ? withdrawnStudents : activeStudents;
    const sortedStudentsForTable = [...listToSort].sort((a, b) => {
        let valA = a[studentSortConfig.key] || '';
        let valB = b[studentSortConfig.key] || '';
        if (valA < valB) return studentSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return studentSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleStudentSort = (key) => {
        let direction = 'asc';
        if (studentSortConfig.key === key && studentSortConfig.direction === 'asc') direction = 'desc';
        setStudentSortConfig({ key, direction });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] tracking-tight">학생 관리 {isInstructor && <span className="text-sm font-semibold text-[#0066cc] ml-2">(내 수강생)</span>}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    {moduleFlags.sms && <button onClick={() => openModal('sms')} className={secondaryBtnCls}><Icon name="comment-dots"/> 단체 문자</button>}
                    {!isInstructor && (
                        <>
                            {moduleFlags.excelImport && (
                              <>
                                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleExcelUpload} className="hidden" />
                                <button onClick={downloadSampleExcel} className={subtleBtnCls} title="샘플 양식 다운로드"><Download size={12}/> 샘플 양식</button>
                                <button onClick={() => fileInputRef.current.click()} className={secondaryBtnCls}><Upload size={12}/> 엑셀 업로드</button>
                              </>
                            )}
                            <button onClick={() => openModal('student')} className={primaryBtnCls}><Plus size={12}/> 신규 등록</button>
                        </>
                    )}
                </div>
            </div>

            {!isInstructor && (
                <div className="flex overflow-x-auto gap-2 p-1 bg-[#f5f5f7] rounded-full w-max max-w-full custom-scrollbar">
                    <button onClick={() => setStudentTab('list')} className={`px-5 py-2 rounded-full font-semibold text-[13px] transition-all whitespace-nowrap ${studentTab === 'list' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>재원생 명단</button>
                    <button onClick={() => setStudentTab('tuition')} className={`px-5 py-2 rounded-full font-semibold text-[13px] transition-all whitespace-nowrap ${studentTab === 'tuition' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>수납 현황</button>
                    <button onClick={() => setStudentTab('withdrawn')} className={`px-5 py-2 rounded-full font-semibold text-[13px] transition-all whitespace-nowrap ${studentTab === 'withdrawn' ? 'bg-white text-[#ff3b30] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>퇴원생 관리</button>
                </div>
            )}

            {(studentTab === 'list' || studentTab === 'withdrawn' || isInstructor) ? (
                <div className="bg-white rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-[rgba(0,0,0,0.05)] flex">
                        <div className="relative w-full sm:w-80">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><Search size={14}/></span>
                            <input type="text" value={studentSearchTerm} onChange={e=>setStudentSearchTerm(e.target.value)} placeholder="이름, 학교, 연락처 검색" className={inputCls + " pl-10"} />
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        {sortedStudentsForTable.length === 0 ? <p className="text-[#86868b] text-center p-16 font-medium text-[13px]">해당 조건에 맞는 학생이 없습니다.</p> :
                        <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#f5f5f7]/50 text-[#86868b] text-[11px] font-semibold uppercase tracking-wider border-b border-[rgba(0,0,0,0.05)] select-none">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:text-[#1d1d1f] transition-colors" onClick={() => handleStudentSort('name')}>이름 {studentSortConfig.key === 'name' ? (studentSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-[#1d1d1f] transition-colors" onClick={() => handleStudentSort('school')}>학교 {studentSortConfig.key === 'school' ? (studentSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-[#1d1d1f] transition-colors" onClick={() => handleStudentSort('grade')}>학년 {studentSortConfig.key === 'grade' ? (studentSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th className="px-6 py-4">학생 연락처</th>
                                    <th className="px-6 py-4">학부모 연락처</th>
                                    <th className="px-6 py-4">수강 강좌</th>
                                    <th className="px-6 py-4 text-center">상태</th>
                                    <th className="px-6 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgba(0,0,0,0.02)]">
                                {sortedStudentsForTable.map(s => (
                                    <tr key={s.id} className="hover:bg-[#f5f5f7]/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${s.gender === '여' ? 'bg-[#fff0f0] text-[#ff3b30]' : 'bg-[#f0f9ff] text-[#0066cc]'}`}>{s.name.charAt(0)}</div>
                                                <button onClick={() => { setDetailTab('basic'); openModal('studentDetail', s.id); }} className="font-semibold text-[14px] text-[#1d1d1f] hover:text-[#0066cc] transition-colors">{s.name}</button>
                                                {studentTab === 'withdrawn' && s.withdrawReason && (
                                                    <span className="text-[10px] text-[#86868b] max-w-[120px] truncate ml-2">사유: {s.withdrawReason}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-[#1d1d1f]">{s.school || '-'}</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-[#86868b]">{s.grade || '-'}</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-[#86868b]">{s.phone || '-'}</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-[#86868b]">{s.parentPhone || '-'}</td>
                                        <td className="px-6 py-4 text-[12px] font-medium text-[#1d1d1f]">
                                            {(s.classIds || []).map(cId => classes.find(c=>c.id===cId)?.name).filter(Boolean).join(', ') || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${s.status==='재원' ? 'bg-[#e5fcf1] text-[#008f5d]' : (s.status === '퇴원' ? 'bg-[#fff0f0] text-[#ff3b30]' : 'bg-[#f5f5f7] text-[#86868b]')}`}>{s.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex gap-2 justify-end lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!isInstructor && <button onClick={() => openModal('student', s)} className="p-2 text-[#86868b] hover:text-[#0066cc] transition-colors"><Edit size={14}/></button>}
                                            {!isInstructor && <button onClick={() => deleteItem('student', s.id)} className="p-2 text-[#86868b] hover:text-[#ff3b30] transition-colors"><Trash2 size={14}/></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-6 border-b border-[rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                        <h3 className="font-semibold text-[13px] text-[#86868b] uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> 수납 현황</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">조회 월</span>
                            <input type="month" value={tuitionMonth} onChange={e=>setTuitionMonth(e.target.value)} className="bg-[#f5f5f7] border border-transparent rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#1d1d1f] focus:outline-none"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#f5f5f7]/50 text-[#86868b] text-[11px] font-semibold uppercase tracking-wider border-b border-[rgba(0,0,0,0.05)]">
                                <tr>
                                    <th className="px-6 py-4">학생명</th>
                                    <th className="px-6 py-4">학부모 연락처</th>
                                    <th className="px-6 py-4 text-center">수강 강좌수</th>
                                    <th className="px-6 py-4 text-right">총 청구액 (월)</th>
                                    <th className="px-6 py-4 text-right">실 납부액</th>
                                    <th className="px-6 py-4 text-center">상태</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgba(0,0,0,0.02)]">
                                {activeStudents.length === 0 ? <tr><td colSpan="6" className="text-center p-16 text-[#86868b] font-medium text-[13px]">수납 대상 학생이 없습니다.</td></tr> :
                                activeStudents.map(s => {
                                    const stdClasses = (s.classIds || []).map(cId => classes.find(c=>c.id===cId)).filter(Boolean);
                                    const displayExpected = stdClasses.reduce((sum, c) => {
                                        const customPrice = s.customClassTuition?.[c.id];
                                        const price = customPrice !== undefined && customPrice !== '' ? Number(customPrice) : Number(c.price || 0);
                                        return sum + price;
                                    }, 0);
                                    
                                    const monthlyHistory = (s.tuitionHistory || []).filter(th => th.month === tuitionMonth);
                                    const totalPaid = monthlyHistory.reduce((sum, th) => sum + Number(th.amount || 0), 0);
                                    
                                    let statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#86868b] bg-[#f5f5f7] uppercase">청구없음</span>;
                                    
                                    if (displayExpected > 0) {
                                        if (totalPaid >= displayExpected) statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#008f5d] bg-[#e5fcf1] uppercase">완납</span>;
                                        else if (totalPaid > 0) statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#f97316] bg-[#fff6ed] uppercase">부분납</span>;
                                        else statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#ff3b30] bg-[#fff0f0] uppercase">미납</span>;
                                    }

                                    return (
                                    <tr key={s.id} onClick={() => { setDetailTab('tuition'); openModal('studentDetail', s.id); }} className="hover:bg-[#f5f5f7]/50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold text-[14px] group-hover:text-[#0066cc] transition-colors ${s.gender === '여' ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>{s.name}</span>
                                            <span className="text-[11px] font-medium text-[#86868b] ml-2">{s.school}</span>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-[#86868b]">{s.parentPhone || '미입력'}</td>
                                        <td className="px-6 py-4 text-[13px] font-semibold text-[#1d1d1f] text-center">{stdClasses.length}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-[#1d1d1f]">{displayExpected > 0 ? displayExpected.toLocaleString() : '-'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-[#0066cc]">{totalPaid > 0 ? totalPaid.toLocaleString() : '-'}</td>
                                        <td className="px-6 py-4 text-center">{statusBadge}</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

