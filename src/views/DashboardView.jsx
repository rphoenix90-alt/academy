import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isCloudActive, appId } from '../firebase';
import { formatDate, getMonday, getWeekDates } from '../lib/utils';
import { Icon, ChevronRight, ChevronLeft } from '../components/Icons';
export const DashboardView = ({ currentUser, isInstructor, getMyStudents, calcTeacherStats, students, dashboardMemos, setDashboardMemos, adminMemoMode, setAdminMemoMode }) => {
    const [weekStart, setWeekStart] = useState(getMonday(new Date()));
    
    const displayStudents = getMyStudents().filter(s => s.status !== '퇴원');
    const studentCount = displayStudents.length;
    const stats = calcTeacherStats().filter(t => t.role === '강사' || t.studentsCount > 0); 
    
    const displayTeacherStats = (isInstructor ? stats.filter(t => t.id === currentUser.id) : stats).map(t => {
        let mockMom = 0;
        if (t.studentsCount > 0) mockMom = Math.floor(((t.name.charCodeAt(0) + t.studentsCount) % 9) - 2); 
        return { ...t, momChange: mockMom };
    }).sort((a, b) => b.momChange - a.momChange);

    const pastMonthsStr = [];
    const pastMonthsLabels = [];
    for(let i = 4; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        pastMonthsStr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        pastMonthsLabels.push(`${d.getMonth() + 1}월`);
    }

    const chartPoints = pastMonthsStr.map((monthStr, i) => {
        const activeCount = students.filter(s => {
            const isEnrolled = s.enrollDate ? s.enrollDate.substring(0, 7) <= monthStr : true;
            const notYetWithdrawn = (s.status === '퇴원' && s.withdrawDate) ? s.withdrawDate.substring(0, 7) >= monthStr : s.status !== '퇴원';
            return isEnrolled && notYetWithdrawn;
        }).length;
        return { label: pastMonthsLabels[i], value: activeCount };
    });

    const maxValInPoints = Math.max(...chartPoints.map(p => p.value));
    const chartMaxY = Math.max(maxValInPoints + 5, 20); 
    
    const w = 400; const h = 160; const p = 24;
    const pts = chartPoints.map((d, i) => {
        const x = p + i * ((w - 2 * p) / (chartPoints.length - 1));
        const y = h - p - (d.value / chartMaxY) * (h - 2 * p);
        return { x: isNaN(x) ? w/2 : x, y: isNaN(y) ? h/2 : y, value: d.value, label: d.label };
    });

    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const xMid = (pts[i].x + pts[i + 1].x) / 2;
        pathD += ` C ${xMid} ${pts[i].y}, ${xMid} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${h - p} L ${pts[0].x} ${h - p} Z`;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-2">
                <h2 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">대시보드 {isInstructor && <span className="text-sm font-semibold text-[#0066cc] ml-2">({currentUser.name} 전용)</span>}</h2>
                <div className="text-[13px] font-semibold text-[#86868b] flex items-center gap-2">
                    현재 {isInstructor ? '내 수강생' : '총 재원생'}: <span className="font-bold text-[#1d1d1f] text-lg">{studentCount}명</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] w-full flex flex-col transition-all">
                    <h3 className="text-[13px] font-semibold text-[#1d1d1f] mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0066cc]"></span> 월별 등록 추이
                    </h3>
                    <div className="flex-1 w-full relative flex items-center justify-center min-h-[200px]">
                        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0066cc" stopOpacity="0.15" /><stop offset="100%" stopColor="#0066cc" stopOpacity="0" /></linearGradient>
                            </defs>
                            {[0, 25, 50, 75, 100].map(val => {
                                const yLine = h - p - (val/100)*(h - 2*p);
                                return <line key={val} x1={p} y1={yLine} x2={w - p} y2={yLine} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />;
                            })}
                            <path d={areaD} fill="url(#areaGradient)" />
                            <path d={pathD} fill="none" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((pt, idx) => (
                                <g key={idx} className="group">
                                    <circle cx={pt.x} cy={pt.y} r="4.5" fill="#0066cc" stroke="#fff" strokeWidth="2" className="cursor-pointer transition-all duration-300 group-hover:r-6" />
                                    <text x={pt.x} y={pt.y - 12} fontSize="11" textAnchor="middle" fill="#0066cc" fontWeight="600">{pt.value}</text>
                                    <text x={pt.x} y={h} fontSize="10" textAnchor="middle" fill="#86868b" fontWeight="500">{pt.label}</text>
                                </g>
                            ))}
                        </svg>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] w-full transition-all">
                    <h3 className="text-[13px] font-semibold text-[#1d1d1f] mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#1d1d1f]"></span> {isInstructor ? '내 담당 학생 수' : '강사별 담당 학생 통계'}</div>
                        <span className="text-[10px] text-[#86868b] font-medium tracking-wide">전월 대비</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar" style={{ maxHeight: '220px' }}>
                        {displayTeacherStats.length === 0 ? <p className="text-sm text-[#86868b] mt-10 text-center font-medium">데이터가 없습니다.</p> : 
                            displayTeacherStats.map(t => (
                            <div key={t.id} className="flex items-center text-[13px] group p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors">
                                <div className="w-20 sm:w-24 font-semibold text-[#1d1d1f] truncate">{t.name}</div>
                                <div className="flex-1 mx-2 sm:mx-4 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#1d1d1f] group-hover:bg-[#0066cc] transition-all duration-500 ease-out" style={{ width: Math.min(100, ((t.studentsCount||0)/Math.max(studentCount,1))*100) + '%' }}></div>
                                </div>
                                <div className="w-10 sm:w-12 text-right font-bold text-[#1d1d1f]">{t.studentsCount || 0}</div>
                                <div className={`w-10 text-right text-[10px] font-bold ${t.momChange > 0 ? 'text-[#ff3b30]' : t.momChange < 0 ? 'text-[#0066cc]' : 'text-[#86868b]'}`}>
                                    {t.momChange > 0 ? `▲ ${t.momChange}` : t.momChange < 0 ? `▼ ${Math.abs(t.momChange)}` : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl apple-shadow border border-[rgba(0,0,0,0.05)] w-full transition-all">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span> {isInstructor ? '내 일정' : '주간 일정/메모'}</h3>
                        <div className="flex items-center gap-1 bg-[#f5f5f7] rounded-full p-1 border border-[rgba(0,0,0,0.02)]">
                            <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() - 7)))} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronLeft size={12}/></button>
                            <span className="text-xs font-semibold text-[#1d1d1f] px-2 tracking-wide">{formatDate(weekStart)}</span>
                            <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() + 7)))} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronRight size={12}/></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!isInstructor && (
                            <div className="flex gap-1 bg-[#f5f5f7] p-1 rounded-full border border-[rgba(0,0,0,0.02)]">
                                <button onClick={() => setAdminMemoMode('public')} className={`text-[11px] font-semibold px-4 py-1.5 rounded-full transition-all ${adminMemoMode === 'public' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>전체 공개</button>
                                <button onClick={() => setAdminMemoMode('private')} className={`text-[11px] font-semibold px-4 py-1.5 rounded-full transition-all ${adminMemoMode === 'private' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>관리자 전용</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="grid grid-cols-7 gap-3 min-w-[700px]">
                        {getWeekDates(weekStart).map((date, i) => {
                            const dateStr = formatDate(date);
                            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                            const memoKey = isInstructor ? `${dateStr}_${currentUser.id}` : `${dateStr}_${adminMemoMode}`;
                            const publicMemoKey = `${dateStr}_public`; 

                            return (
                                <div key={dateStr} className="flex flex-col gap-2 h-44">
                                    <div className={`text-center py-2 rounded-xl text-[11px] font-semibold tracking-wide ${i === 0 ? 'text-[#ff3b30]' : i === 6 ? 'text-[#0066cc]' : 'text-[#86868b]'}`}>
                                        {date.getDate()}일 <span className="opacity-70">({dayNames[date.getDay()]})</span>
                                    </div>
                                    
                                    {isInstructor && dashboardMemos[publicMemoKey] && (
                                        <div className="bg-[#f0f9ff] p-2.5 rounded-xl text-[11px] text-[#0066cc] font-medium whitespace-pre-wrap leading-relaxed">
                                            <span className="font-bold flex items-center gap-1 mb-1"><Icon name="bullhorn" size={10}/> 공지</span>
                                            {dashboardMemos[publicMemoKey]}
                                        </div>
                                    )}

                                    <textarea 
                                        value={dashboardMemos[memoKey] || ''} 
                                        onChange={(e) => setDashboardMemos({...dashboardMemos, [memoKey]: e.target.value})}
                                        onBlur={async () => { if(isCloudActive) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'memos', 'main'), dashboardMemos); }}
                                        className={`flex-1 p-3 text-xs resize-none outline-none focus:ring-1 focus:ring-[#0066cc] rounded-xl transition-all duration-200 custom-scrollbar leading-relaxed font-medium ${isInstructor ? 'bg-[#f5f5f7] border border-transparent text-[#1d1d1f]' : (adminMemoMode === 'public' ? 'bg-[#f0f9ff]/50 text-[#0066cc] placeholder-[#0066cc]/40 border border-[#0066cc]/10' : 'bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] hover:bg-white')}`}
                                        placeholder={isInstructor ? "내 일정..." : (adminMemoMode === 'public' ? "강사 공유 공지..." : "관리자 일정...")}
                                        spellCheck="false"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

