import React, { useState } from 'react';
import { isCloudActive } from '../firebase';
import { Icon, UserIcon, LockIcon } from '../components/Icons';

export const LoginView = ({
  mode, setMode,
  loginEmail, setLoginEmail,
  loginPw, setLoginPw,
  registerName, setRegisterName,
  handleLogin, handleRegisterOwner, handleRegisterStaff,
  academyInfo, isSyncing, authBusy, needsOwnerSetup,
}) => {
  const [localError, setLocalError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      if (mode === 'login') await handleLogin(e);
      else if (mode === 'owner') await handleRegisterOwner(e);
      else await handleRegisterStaff(e);
    } catch (err) {
      setLocalError(err?.message || '처리 중 오류가 발생했습니다.');
    }
  };

  const title =
    mode === 'login' ? '로그인' :
    mode === 'owner' ? '최초 원장 계정 만들기' :
    '직원 계정 연결';

  const subtitle =
    mode === 'login' ? `${academyInfo.name || 'Academy'} Management` :
    mode === 'owner' ? '학원에서 처음 쓰는 관리자 계정을 만듭니다' :
    '원장이 등록한 이메일로 비밀번호를 설정합니다';

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-start sm:items-center justify-center font-sans relative p-4 py-10 overflow-y-auto">
      <div className="bg-white p-8 sm:p-12 rounded-[2rem] apple-shadow border border-[rgba(0,0,0,0.05)] w-full max-w-[400px] my-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0066cc] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm relative">
            <Icon name="link" className="text-white text-2xl" />
            {isSyncing && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">Link Works</h1>
          <p className="text-xs font-semibold text-[#86868b] mt-2">
            {subtitle}
            {isCloudActive ? <span className="text-[#0066cc] ml-1">Cloud</span> : <span className="ml-1">Local</span>}
          </p>
          <p className="text-sm font-bold text-[#1d1d1f] mt-4">{title}</p>
        </div>

        {needsOwnerSetup && mode === 'login' && (
          <div className="mb-5 rounded-2xl bg-[#fff8e6] border border-[#f5a623]/30 px-4 py-3 text-[12px] font-semibold text-[#8a5a00] leading-relaxed">
            아직 원장 계정이 없습니다. 아래에서 <span className="text-[#1d1d1f]">「최초 원장 계정 만들기」</span>를 눌러 주세요.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {(mode === 'owner' || mode === 'staff') && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><UserIcon size={14} /></span>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]"
                placeholder="이름"
                required={mode === 'owner'}
              />
            </div>
          )}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><Icon name="envelope" size={14} /></span>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]"
              placeholder="이메일"
              required
              autoComplete="username"
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><LockIcon /></span>
            <input
              type="password"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]"
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {localError && (
            <p className="text-[12px] text-[#ff3b30] font-medium text-center">{localError}</p>
          )}

          <button
            type="submit"
            disabled={isSyncing || authBusy || !isCloudActive}
            className={`w-full text-white font-semibold py-3.5 rounded-xl shadow-sm transition-all duration-300 mt-2 text-[13px] ${(isSyncing || authBusy || !isCloudActive) ? 'bg-[#a1a1a6] cursor-not-allowed' : 'bg-[#0066cc] hover:bg-[#005bb5]'}`}
          >
            {!isCloudActive ? '클라우드 설정 필요' : authBusy ? '처리 중...' : title}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => { setMode('owner'); setLocalError(''); }}
              className="w-full py-3.5 rounded-xl font-semibold text-[13px] bg-[#1d1d1f] text-white hover:bg-black transition-colors"
            >
              최초 원장 계정 만들기
            </button>
            <button
              type="button"
              onClick={() => { setMode('staff'); setLocalError(''); }}
              className="w-full py-3 rounded-xl font-semibold text-[13px] bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors"
            >
              직원 계정 처음 연결하기
            </button>
          </div>
        )}

        {mode !== 'login' && (
          <button
            type="button"
            className="mt-5 w-full text-center text-[12px] font-semibold text-[#0066cc] hover:underline"
            onClick={() => { setMode('login'); setLocalError(''); }}
          >
            이미 계정이 있나요? 로그인으로 돌아가기
          </button>
        )}

        <p className="mt-6 text-center text-[11px] font-medium text-[#86868b]">
          비밀번호는 Firebase에만 저장되며, 화면에 표시되지 않습니다.
        </p>
      </div>
    </div>
  );
};
