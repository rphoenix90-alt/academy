import React, { useState } from 'react';
import { formatDate, secondaryBtnCls } from '../lib/utils';
import { ChevronRight, ArrowLeft, Printer } from '../components/Icons';
import { PrintDocument } from '../components/PrintDocument';

export const TuitionView = ({
  currentUser, isInstructor, instructors, academyInfo,
  calcSettlementDetails, calcTeacherStats, handleSessionChange, handleSettlementChange,
  handlePrint, isPrintMode, settlements, openModal, setDetailTab,
}) => {
    const [tuitionMonth, setTuitionMonth] = useState(formatDate(new Date()).substring(0, 7));
    const [selectedTeacherForSettlement, setSelectedTeacherForSettlement] = useState(null);

    const activeTeacherId = isInstructor ? currentUser.id : selectedTeacherForSettlement;
    const stats = calcTeacherStats();
    const displaySettlementData = isInstructor ? stats.filter(t => t.id === currentUser.id) : stats;
    const sortedSettlementData = [...displaySettlementData].sort((a, b) => a.name.localeCompare(b.name));

    if (isPrintMode && activeTeacherId) {
        const t = instructors.find(i=>i.id === activeTeacherId);
        const { details, totalAmount } = calcSettlementDetails(activeTeacherId, tuitionMonth);
        if(!t) return null;
        return (
            <PrintDocument
                academyInfo={academyInfo}
                docLabel="SETTLEMENT"
                title="강사 강의료 정산 명세서"
                subtitle={`정산 기준월 ${tuitionMonth}`}
            >
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-[#f8f8fa] px-5 py-4 border border-[#1d1d1f]/06">
                    <div>
                        <p className="text-[9px] font-bold tracking-[0.18em] text-[#86868b] uppercase">강사</p>
                        <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight mt-1">{t.name}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold tracking-[0.18em] text-[#86868b] uppercase">담당</p>
                        <p className="text-[12px] font-semibold text-[#1d1d1f] mt-1">{t.subject || '미분류'}</p>
                    </div>
                </div>

                <table className="w-full text-[11px] text-left border-collapse print-table mb-4">
                    <thead>
                        <tr>
                            <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15">학생명</th>
                            <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15">강좌명</th>
                            <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 text-center">회차</th>
                            <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 text-center">기본 수강료</th>
                            <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 text-right">최종 정산액</th>
                            <th className="py-2.5 px-3 font-bold text-[#86868b] border-b border-[#1d1d1f]/15 text-center w-28">비고</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.length === 0 ? (
                            <tr><td colSpan="6" className="text-center p-10 text-[#86868b]">정산 내역이 없습니다.</td></tr>
                        ) : details.map((d, rowIdx) => (
                            <tr key={d.id} className={rowIdx % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'}>
                                <td className="py-2.5 px-3 font-bold text-[#1d1d1f] border-b border-[#1d1d1f]/06">
                                    {d.studentName}
                                    {d.school ? <span className="text-[#86868b] font-medium ml-1">({d.school})</span> : null}
                                </td>
                                <td className="py-2.5 px-3 text-[#1d1d1f] border-b border-[#1d1d1f]/06">{d.className}</td>
                                <td className="py-2.5 px-3 text-center text-[#1d1d1f] border-b border-[#1d1d1f]/06">{d.baseSessions} / {d.actualSessions}</td>
                                <td className="py-2.5 px-3 text-center text-[#1d1d1f] border-b border-[#1d1d1f]/06">{Number(d.basePrice).toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#1d1d1f] border-b border-[#1d1d1f]/06">{Number(d.finalPrice).toLocaleString()}원</td>
                                <td className="py-2.5 px-3 text-[10px] text-[#636366] text-center border-b border-[#1d1d1f]/06 truncate">{d.reason || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-6 flex items-center justify-between rounded-xl bg-[#1d1d1f] text-white px-5 py-4">
                    <span className="text-[11px] font-bold tracking-[0.16em] uppercase opacity-80">총 정산액 (세전)</span>
                    <span className="text-xl font-bold tracking-tight">{totalAmount.toLocaleString()}원</span>
                </div>
            </PrintDocument>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] tracking-tight">강사 정산 {isInstructor && <span className="text-[15px] font-medium text-[#86868b] ml-2">(읽기 전용)</span>}</h2>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full apple-shadow border border-[rgba(0,0,0,0.05)]">
                    <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest">정산월</span>
                    <input type="month" value={tuitionMonth} onChange={e=>setTuitionMonth(e.target.value)} className="bg-transparent text-[#1d1d1f] text-[13px] font-semibold outline-none"/>
                </div>
            </div>
            
            {!activeTeacherId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {sortedSettlementData.length > 0 ? sortedSettlementData.map(teacher => (
                        <div key={teacher.id} className="bg-white p-6 sm:p-8 rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] cursor-pointer transition-all group" onClick={() => setSelectedTeacherForSettlement(teacher.id)}>
                            <div className="flex justify-between items-start mb-6">
                                <div><span className="text-[10px] font-semibold bg-[#f5f5f7] text-[#86868b] px-2.5 py-1 rounded-full mb-3 inline-block tracking-wider uppercase">{teacher.subject || '미분류'} 파트</span><h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{teacher.name}</h3></div>
                                <div className="w-10 h-10 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center font-bold text-[13px]">{teacher.studentsCount}</div>
                            </div>
                            <div className="text-[11px] font-semibold text-[#86868b] flex justify-end items-center gap-1 group-hover:text-[#0066cc] transition-colors">명세서 확인 <ChevronRight size={10}/></div>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 text-center text-[#86868b] font-medium text-[13px]">정산 대상이 없습니다.</div>
                    )}
                </div>
            ) : (
                <div className="animate-in slide-in-from-right-8 duration-500">
                    <div className="bg-white rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-[rgba(0,0,0,0.05)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                {!isInstructor && <button onClick={() => setSelectedTeacherForSettlement(null)} className="p-2 hover:bg-[#f5f5f7] rounded-full transition-colors"><ArrowLeft size={16} className="text-[#86868b]"/></button>}
                                <div>
                                    <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{instructors.find(i=>i.id===activeTeacherId)?.name}</h2>
                                    <p className="text-[11px] font-medium text-[#86868b] mt-1 uppercase tracking-widest">{tuitionMonth} 정산 내역</p>
                                </div>
                            </div>
                            <button onClick={handlePrint} className={secondaryBtnCls}><Printer size={12}/> 명세서 인쇄</button>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar p-0">
                            {(() => {
                                const { details, totalAmount } = calcSettlementDetails(activeTeacherId, tuitionMonth);
                                return (
                                    <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                                        <thead>
                                            <tr className="bg-[#f5f5f7]/50 text-[#86868b] text-[11px] font-semibold uppercase tracking-wider border-b border-[rgba(0,0,0,0.05)]">
                                                <th className="p-5">학생명(학교)</th>
                                                <th className="p-5 text-center">수강 강좌</th>
                                                <th className="p-5 text-center">회차 (기준/실제)</th>
                                                <th className="p-5 text-center">기본 수강료</th>
                                                <th className="p-5 text-right">최종 정산액</th>
                                                <th className="p-5 text-center w-48">변동 사유</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[rgba(0,0,0,0.02)]">
                                            {details.length === 0 ? <tr><td colSpan="6" className="text-center p-16 text-[#86868b] font-medium text-[13px]">수강 중인 학생이 없습니다.</td></tr> : 
                                            details.map(d => (
                                                <tr key={d.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                                                    <td className="p-5">
                                                        <button onClick={(e) => { e.stopPropagation(); setDetailTab('basic'); openModal('studentDetail', d.studentId); }} className={`font-semibold hover:text-[#0066cc] transition-colors text-[14px] ${d.gender === '여' ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>
                                                            {d.studentName}
                                                        </button>
                                                        <span className="text-[11px] font-medium text-[#86868b] ml-2">{d.school}</span>
                                                    </td>
                                                    <td className="p-5 text-center text-[13px] font-medium text-[#1d1d1f]">{d.className}</td>
                                                    <td className="p-5 text-center">
                                                        {isInstructor ? (
                                                            <span className="font-semibold text-[#1d1d1f] text-[13px]">{d.baseSessions} / {d.actualSessions}</span>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-[11px] text-[#86868b] w-4 text-right font-medium">{d.baseSessions}</span>
                                                                <span className="text-[11px] text-[#a1a1a6]">/</span>
                                                                <input type="number" min="0" value={d.actualSessions} onChange={(e) => handleSessionChange(d.id, Number(e.target.value))} className="w-12 text-center bg-white border border-[rgba(0,0,0,0.05)] rounded-md py-1 text-[13px] font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] shadow-sm transition-all" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-center text-[13px]">
                                                        {d.isAdjusted ? (
                                                            <div className="flex flex-col items-center leading-tight">
                                                                <span className="text-[10px] line-through text-[#a1a1a6] font-medium">{d.originalBasePrice.toLocaleString()}</span>
                                                                <span className="font-semibold text-[#ff3b30]">{Number(d.basePrice).toLocaleString()}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="font-semibold text-[#1d1d1f]">{Number(d.basePrice).toLocaleString()}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        {isInstructor ? (
                                                            <span className="font-bold text-[#1d1d1f] text-[14px]">{Number(d.finalPrice).toLocaleString()}원</span>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <input type="number" min="0" value={d.finalPrice} onChange={(e) => {
                                                                    if (e.target.value === '') {
                                                                        const newSettlements = {...settlements};
                                                                        if(newSettlements[d.id]) {
                                                                            delete newSettlements[d.id].finalPrice;
                                                                            handleSettlementChange(d.id, 'finalPrice', undefined);
                                                                        }
                                                                    } else {
                                                                        handleSettlementChange(d.id, 'finalPrice', Number(e.target.value));
                                                                    }
                                                                }} className="w-24 text-right bg-[#f5f5f7] border border-transparent rounded-lg px-2 py-1.5 font-semibold text-[13px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0066cc] transition-all" />
                                                                <span className="text-[11px] font-medium text-[#86868b]">원</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5">
                                                        {isInstructor ? (
                                                            <span className="text-[11px] font-medium text-[#86868b] block truncate w-48 text-center">{d.reason || '-'}</span>
                                                        ) : (
                                                            <input type="text" value={d.reason} onChange={(e) => handleSettlementChange(d.id, 'reason', e.target.value)} placeholder="사유 입력" className="w-full text-[12px] bg-[#f5f5f7] border border-transparent rounded-lg px-3 py-1.5 focus:outline-none focus:bg-white focus:border-[#0066cc] transition-all text-[#1d1d1f] font-medium placeholder-[#a1a1a6]" />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {details.length > 0 && <tfoot><tr><td colSpan="4" className="p-6 text-right font-semibold text-[#86868b] text-[13px]">정산 합계</td><td colSpan="2" className="p-6 text-left font-bold text-xl text-[#1d1d1f] tracking-tight">{totalAmount.toLocaleString()}원</td></tr></tfoot>}
                                    </table>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
