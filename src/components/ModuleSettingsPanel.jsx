import React from 'react';
import { setDoc } from 'firebase/firestore';
import { db, isCloudActive } from '../firebase';
import { academyDoc } from '../lib/paths';
import { MODULE_CATALOG, getEnabledModules, DEFAULT_ENABLED_MODULES } from '../registry';
import { triggerNotification } from '../lib/utils';

/**
 * 원장/관리자용 모듈 ON/OFF
 */
export function ModuleSettingsPanel({ academyInfo, setAcademyInfo }) {
  const enabled = getEnabledModules(academyInfo);

  const toggle = async (moduleId) => {
    const next = enabled.includes(moduleId)
      ? enabled.filter((id) => id !== moduleId)
      : [...enabled, moduleId];

    const updated = { ...academyInfo, enabledModules: next };
    try {
      if (isCloudActive) await setDoc(academyDoc(db), updated, { merge: true });
      setAcademyInfo(updated);
      triggerNotification(next.includes(moduleId) ? '모듈이 켜졌습니다.' : '모듈이 꺼졌습니다.');
    } catch (e) {
      console.error(e);
      triggerNotification('모듈 설정 저장에 실패했습니다.', true);
    }
  };

  const resetDefaults = async () => {
    const updated = { ...academyInfo, enabledModules: [...DEFAULT_ENABLED_MODULES] };
    try {
      if (isCloudActive) await setDoc(academyDoc(db), updated, { merge: true });
      setAcademyInfo(updated);
      triggerNotification('기본 모듈 설정으로 되돌렸습니다.');
    } catch (e) {
      triggerNotification('저장에 실패했습니다.', true);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-[rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h4 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest">기능 모듈</h4>
        <button
          type="button"
          onClick={resetDefaults}
          className="text-[10px] font-bold text-[#0066cc] hover:underline uppercase tracking-wider"
        >
          기본값
        </button>
      </div>
      <p className="text-[11px] text-[#86868b] font-medium mb-4 leading-relaxed">
        기본 기능(대시보드·학생·클래스·수납)은 항상 유지됩니다. 아래만 켜고 끌 수 있습니다.
      </p>
      <div className="space-y-2.5">
        {MODULE_CATALOG.map((mod) => {
          const on = enabled.includes(mod.id);
          return (
            <div
              key={mod.id}
              className="flex items-center justify-between gap-3 bg-[#f5f5f7] rounded-2xl px-4 py-3 border border-transparent"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1d1d1f]">{mod.name}</p>
                <p className="text-[11px] text-[#86868b] font-medium mt-0.5 leading-snug">{mod.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggle(mod.id)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[#0066cc]' : 'bg-[#d2d2d7]'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
