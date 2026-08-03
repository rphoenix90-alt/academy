import React, { useState } from 'react';
import { isCloudActive } from '../firebase';
import { Icon, UserIcon, LockIcon } from '../components/Icons';
import { formatPhoneNumber } from '../lib/utils';

export const LoginView = ({
  mode, setMode,
  loginEmail, setLoginEmail,
  loginPhone, setLoginPhone,
  loginPw, setLoginPw,
  registerName, setRegisterName,
  handleLogin, handleOwnerLogin, handleRegisterOwner,
  academyInfo, isSyncing, authBusy, needsOwnerSetup,
}) => {
  const [localError, setLocalError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      if (mode === 'login') await handleLogin(e);
      else if (mode === 'ownerLogin') await handleOwnerLogin(e);
      else if (mode === 'owner') await handleRegisterOwner(e);
    } catch (err) {
      setLocalError(err?.message || '처리 중 오류가 발생했습니다.');
    }
  };

  const title =
    mode === 'login' ? '직원 로그인' :
    mode === 'ownerLogin' ? '원장 로그인' :
    '최초 원장 계정 만들기';

  const subtitle =
    mode === 'login' ? `${academyInfo.name || 'Academy'} · 전화번호 로그인` :
    mode === 'ownerLogin' ? `${academyInfo.name || 'Academy'} · 이메일 로그인` :
    '학원에서 처음 쓰는 관리자 계정을 만듭니다';

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

        {mode === 'login' && (
          <p className="mb-4 text-[11px] text-[#86868b] font-medium leading-relaxed text-center">
            최초 비밀번호는 <span className="text-[#1d1d1f] font-bold">전화번호 뒤 4자리</span>입니다.
            로그인 후 새 비밀번호(4자리)를 설정합니다.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'owner' && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><UserIcon size={14} /></span>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]"
                placeholder="이름"
                required
              />
            </div>
          )}

          {mode === 'login' ? (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><Icon name="phone" size={14} /></span>
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => setLoginPhone(formatPhoneNumber(e.target.value))}
                className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]"
                placeholder="전화번호"
                required
                autoComplete="tel"
              />
            </div>
          ) : (
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
          )}

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"><LockIcon /></span>
            <input
              type="password"
              inputMode={mode === 'login' ? 'numeric' : 'text'}
              value={loginPw}
              onChange={(e) => {
                const v = e.target.value;
                setLoginPw(mode === 'login' ? v.replace(/\D/g, '').slice(0, 4) : v);
              }}
              className="w-full pl-11 pr-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none text-[13px] transition-all font-medium text-[#1d1d1f]"
              placeholder={mode === 'login' ? '비밀번호 (숫자 4자리)' : '비밀번호 (6자 이상)'}
              required
              minLength={mode === 'login' ? 4 : 6}
              maxLength={mode === 'login' ? 4 : undefined}
              autoComplete={mode === 'owner' ? 'new-password' : 'current-password'}
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
              onClick={() => { setMode('ownerLogin'); setLocalError(''); setLoginPw(''); }}
              className="w-full py-3 rounded-xl font-semibold text-[13px] bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors"
            >
              원장 이메일 로그인
            </button>
            <button
              type="button"
              onClick={() => { setMode('owner'); setLocalError(''); setLoginPw(''); }}
              className="w-full py-3.5 rounded-xl font-semibold text-[13px] bg-[#1d1d1f] text-white hover:bg-black transition-colors"
            >
              최초 원장 계정 만들기
            </button>
          </div>
        )}

        {mode !== 'login' && (
          <button
            type="button"
            className="mt-5 w-full text-center text-[12px] font-semibold text-[#0066cc] hover:underline"
            onClick={() => { setMode('login'); setLocalError(''); setLoginPw(''); }}
          >
            직원 전화번호 로그인으로 돌아가기
          </button>
        )}

        <p className="mt-6 text-center text-[11px] font-medium text-[#86868b]">
          비밀번호는 Firebase에만 저장되며, 화면에 표시되지 않습니다.
        </p>
      </div>
    </div>
  );
};

/** 최초 로그인 후 4자리 PIN 강제 변경 */
export function ForcePinChangeModal({ onSubmit, busy }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(pin, confirm);
    } catch (err) {
      setError(err?.message || '변경에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 apple-shadow border border-[rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight mb-2">비밀번호 설정</h3>
        <p className="text-[12px] text-[#86868b] font-medium leading-relaxed mb-6">
          최초 로그인입니다. 앞으로 사용할 <span className="text-[#1d1d1f] font-bold">숫자 4자리</span> 비밀번호를 설정해 주세요.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">새 비밀번호</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl outline-none text-[13px] font-medium tracking-[0.3em] text-center"
              placeholder="••••"
              maxLength={4}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">비밀번호 확인</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-3.5 bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl outline-none text-[13px] font-medium tracking-[0.3em] text-center"
              placeholder="••••"
              maxLength={4}
              required
            />
          </div>
          {error && <p className="text-[12px] text-[#ff3b30] font-medium text-center">{error}</p>}
          <button
            type="submit"
            disabled={busy || pin.length !== 4 || confirm.length !== 4}
            className={`w-full py-3.5 rounded-xl text-white font-semibold text-[13px] mt-2 ${busy || pin.length !== 4 ? 'bg-[#a1a1a6]' : 'bg-[#0066cc] hover:bg-[#005bb5]'}`}
          >
            {busy ? '저장 중...' : '비밀번호 저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
