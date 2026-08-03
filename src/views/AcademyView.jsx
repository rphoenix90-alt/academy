import React from 'react';
import { primaryBtnCls, secondaryBtnCls, subtleBtnCls } from '../lib/utils';
import { Icon, Users, Plus, Edit, Trash2, Download, Upload } from '../components/Icons';
import { ModuleSettingsPanel } from '../components/ModuleSettingsPanel';

export const AcademyView = ({ academyInfo, setAcademyInfo, instructors, openModal, deleteItem, handleBackupData, handleRestoreData, backupInputRef }) => {
    const sortedInstructors = [...instructors].sort((a, b) => a.name.localeCompare(b.name));
    const groupedInstructors = { '원장': [], '관리자': [], '강사': [] };
    sortedInstructors.forEach(inst => {
        if (groupedInstructors[inst.role]) groupedInstructors[inst.role].push(inst);
        else groupedInstructors['강사'].push(inst); 
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end mb-4"><h2 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">학원 및 직원 관리</h2></div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] xl:col-span-1 h-max overflow-hidden">
                    <div className="h-1.5 bg-[#0066cc] w-full"></div>
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-widest">Academy Info</h3>
                            <button onClick={() => openModal('academyEdit', academyInfo)} className={subtleBtnCls}><Edit size={10}/> 수정</button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">{academyInfo.name || '학원명 미설정'}</h2>
                            </div>
                            <div className="bg-[#f5f5f7] p-5 rounded-2xl space-y-3.5 text-[13px] font-medium">
                                <div className="flex justify-between"><span className="text-[#86868b]">대표자</span><span className="text-[#1d1d1f]">{academyInfo.ceoName || '미등록'}</span></div>
                                <div className="flex justify-between"><span className="text-[#86868b]">사업자번호</span><span className="text-[#1d1d1f]">{academyInfo.bizNumber || '미등록'}</span></div>
                                <div className="flex justify-between"><span className="text-[#86868b]">연락처</span><span className="text-[#1d1d1f]">{academyInfo.phone || '미등록'}</span></div>
                                <div className="flex flex-col gap-1 mt-2 pt-3 border-t border-[rgba(0,0,0,0.05)]"><span className="text-[#86868b]">소재지</span><span className="text-[#1d1d1f] leading-relaxed">{academyInfo.address || '주소 정보가 없습니다.'}</span></div>
                            </div>
                        </div>
                        
                        <div className="mt-10 pt-8 border-t border-[rgba(0,0,0,0.05)]">
                            <h4 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-4">Data Backup</h4>
                            <div className="flex flex-col gap-2.5">
                                <button onClick={handleBackupData} className="w-full bg-[#1d1d1f] hover:bg-black text-white font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2 text-[13px] shadow-sm"><Download size={14}/> 전체 백업 다운로드</button>
                                <input type="file" accept=".json" ref={backupInputRef} onChange={handleRestoreData} className="hidden" />
                                <button onClick={() => backupInputRef.current.click()} className="w-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2 text-[13px]"><Upload size={14}/> 백업 파일 복원</button>
                            </div>
                        </div>

                        <ModuleSettingsPanel academyInfo={academyInfo} setAcademyInfo={setAcademyInfo} />
                    </div>
                </div>

                <div className="bg-white rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] xl:col-span-2 flex flex-col h-full max-h-[800px]">
                    <div className="p-6 sm:p-8 border-b border-[rgba(0,0,0,0.05)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
                        <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-widest">Staff Accounts</h3>
                        <button onClick={() => openModal('instructor')} className={primaryBtnCls}><Plus size={12}/> 신규 직원 등록</button>
                    </div>
                    
                    <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                        {instructors.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#86868b] py-10">
                                <Users size={24} className="mb-4 opacity-50"/>
                                <p className="font-medium text-[13px]">등록된 직원이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {['원장', '관리자', '강사'].map(key => {
                                    const list = groupedInstructors[key];
                                    if (list.length === 0) return null; 
                                    return (
                                        <div key={key}>
                                            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b] mb-4 ml-1 flex items-center gap-2">
                                                {key} <span className="bg-[#f5f5f7] px-2 py-0.5 rounded-full">{list.length}</span>
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {list.map(t => (
                                                    <div key={t.id} className="bg-white p-5 rounded-2xl border border-[rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all group flex flex-col justify-between min-h-[140px]">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#1d1d1f] text-sm">
                                                                    <Icon name={key === '원장' ? 'user-tie' : (key === '관리자' ? 'user-cog' : 'chalkboard-teacher')} />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="font-bold text-[#1d1d1f] text-[15px]">{t.name}</span>
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${t.status === '재직' ? 'bg-[#e5fcf1] text-[#008f5d]' : 'bg-[#fff0f0] text-[#ff3b30]'}`}>{t.status}</span>
                                                                    </div>
                                                                    <div className="text-[11px] font-medium text-[#86868b]">{t.phone || '연락처 미등록'}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openModal('instructor', t)} className="p-2 text-[#86868b] hover:text-[#0066cc] transition-colors" title="수정"><Edit size={12}/></button>
                                                                <button onClick={() => deleteItem('instructor', t.id)} className="p-2 text-[#86868b] hover:text-[#ff3b30] transition-colors" title="삭제"><Trash2 size={12}/></button>
                                                            </div>
                                                        </div>
                                                        <div className="bg-[#f5f5f7] rounded-xl p-3 text-[11px] font-medium text-[#86868b] flex justify-between border border-transparent gap-2">
                                                            <span className="flex items-center gap-1.5 truncate"><Icon name="envelope" size={10}/> <span className="text-[#1d1d1f] truncate">{t.email || '이메일 미등록'}</span></span>
                                                            <span className={`flex items-center gap-1.5 shrink-0 font-bold ${t.authUid ? 'text-[#008f5d]' : 'text-[#f5a623]'}`}>
                                                              <Icon name="link" size={10}/> {t.authUid ? '연결됨' : '미연결'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

