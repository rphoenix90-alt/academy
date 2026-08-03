import React from 'react';
import { formatDate } from '../lib/utils';

/**
 * 인쇄물 공통 레이아웃 — 로고 헤더 + 본문 + 학원명/상담전화 푸터
 */
export function PrintDocument({
  academyInfo,
  title,
  subtitle,
  children,
  docLabel = 'OFFICIAL DOCUMENT',
}) {
  const name = academyInfo?.name || '학원';
  const phone = academyInfo?.phone || '';
  const logoUrl = academyInfo?.logoUrl || '';

  return (
    <div className="print-doc bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto text-[#1a1a1a] font-sans print:m-0 print:shadow-none print:max-w-none flex flex-col">
      <header className="print-doc-header shrink-0 pb-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 object-contain shrink-0 print-logo"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center text-lg font-bold shrink-0 tracking-tight">
                {(name || 'L').charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-[0.22em] text-[#86868b] uppercase mb-1">
                {docLabel}
              </p>
              <h1 className="text-[22px] font-bold tracking-tight text-[#1d1d1f] leading-snug">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-[11px] font-medium text-[#86868b] mt-1.5">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0 pt-1">
            <p className="text-[10px] font-semibold text-[#86868b] tracking-wide">발행일</p>
            <p className="text-[12px] font-bold text-[#1d1d1f] mt-0.5">{formatDate(new Date())}</p>
          </div>
        </div>
        <div className="mt-5 h-px bg-gradient-to-r from-[#1d1d1f] via-[#1d1d1f]/40 to-transparent" />
      </header>

      <main className="print-doc-body flex-1">{children}</main>

      <footer className="print-doc-footer shrink-0 mt-10 pt-5">
        <div className="h-px bg-[#1d1d1f]/15 mb-4" />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-8 object-contain opacity-90 print-logo" />
            ) : null}
            <div>
              <p className="text-[13px] font-bold text-[#1d1d1f] tracking-tight">{name}</p>
              {academyInfo?.address ? (
                <p className="text-[10px] font-medium text-[#86868b] mt-0.5 leading-relaxed">{academyInfo.address}</p>
              ) : null}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[9px] font-bold tracking-[0.18em] text-[#86868b] uppercase">상담 문의</p>
            <p className="text-[15px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
              {phone || '연락처 미등록'}
            </p>
          </div>
        </div>
        <p className="text-[9px] text-[#a1a1a6] font-medium mt-4 text-center tracking-wide">
          본 문서는 {name}에서 발행한 공식 자료입니다.
        </p>
      </footer>
    </div>
  );
}
