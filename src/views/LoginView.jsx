import React from 'react';
import { isCloudActive } from '../firebase';
import { formatPhoneNumber } from '../lib/utils';
import { Icon, UserIcon, LockIcon } from '../components/Icons';
export const LoginView = ({ loginId, setLoginId, loginPw, setLoginPw, handleLogin, academyInfo, isSyncing }) => (
    <div className="flex h-screen bg-[#f5f5f7] items-center justify-center font-sans relative p-4 sm:p-0">
        <div className="bg-white p-10 sm:p-12 rounded-[2rem] apple-shadow border border-[rgba(0,0,0,0.05)] w-full max-w-[400px]">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-[#0066cc] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm relative">
                    <Icon name="link" className="text-white text-2xl"/>
                    {isSyncing && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></span>}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Link Works</h1>
                <p className="text-xs font-semibold text-[#86868b] mt-2">
                    {academyInfo.name || 'Academy'} Management
                    {isCloudActive ? <span className="text-[#0066cc] ml-1">Cloud</span> : <span className="ml-1">Local</span>}
                </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><UserIcon size={14} /></span>
                    <input type="text" value={loginId} onChange={e=>setLoginId(e.target.value)} onInput={(e) => e.target.value = formatPhoneNumber(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]" placeholder="연락처 입력" />
                </div>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><LockIcon /></span>
                    <input type="password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]" placeholder="비밀번호" />
                </div>
                <button type="submit" disabled={isSyncing} className={`w-full text-white font-semibold py-3.5 rounded-xl shadow-sm transition-all duration-300 mt-6 text-[13px] ${isSyncing ? 'bg-[#a1a1a6] cursor-not-allowed' : 'bg-[#0066cc] hover:bg-[#005bb5]'}`}>
                    {isSyncing ? '동기화 중...' : '로그인'}
                </button>
            </form>
            <div className="mt-8 text-center text-[11px] font-medium text-[#86868b]">초기 비밀번호는 관리자에게 문의하세요.</div>
        </div>
    </div>
);

