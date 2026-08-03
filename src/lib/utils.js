import { useState } from 'react';

export const inputCls = "w-full text-[13px] bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl px-4 py-3 focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all duration-200 text-[#1d1d1f] font-medium";
export const labelCls = "block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1";
export const primaryBtnCls = "bg-[#0066cc] hover:bg-[#005bb5] text-white px-5 py-2.5 rounded-full font-semibold text-[13px] transition-all shadow-sm flex items-center justify-center gap-1.5";
export const secondaryBtnCls = "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] px-5 py-2.5 rounded-full font-semibold text-[13px] transition-all flex items-center justify-center gap-1.5";
export const subtleBtnCls = "bg-white border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] hover:bg-[#f5f5f7] px-4 py-2 rounded-full font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-1.5";

export const triggerNotification = (message, isError = false) => {
    const el = document.createElement('div');
    el.className = `fixed top-6 left-1/2 -translate-x-1/2 text-white px-6 py-3.5 rounded-full shadow-lg z-[100] transition-all duration-300 flex items-center gap-2.5 no-print font-medium text-sm apple-glass border-none ${isError ? 'bg-rose-500/90' : 'bg-[#1d1d1f]/90'}`;
    const icon = document.createElement('i');
    icon.className = `fas ${isError ? 'fa-exclamation-circle text-white' : 'fa-check-circle text-blue-400'}`;
    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -20px)'; setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300); }, 3000);
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};
export const getMonday = (d) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff)); };
export const getWeekDates = (startDate) => Array.from({ length: 7 }).map((_, i) => { const d = new Date(startDate); d.setDate(startDate.getDate() + i); return d; });

export const timeOptions = [];
for (let i = 8; i <= 23; i++) {
    const hour = i.toString().padStart(2, '0');
    timeOptions.push(`${hour}:00`);
    timeOptions.push(`${hour}:30`);
}
timeOptions.push('24:00');

export const formatPhoneNumber = (value) => {
    if (!value) return '';
    value = value.replace(/[^0-9]/g, '');
    if (value.length < 4) return value;
    if (value.length < 8) return `${value.substr(0, 3)}-${value.substr(3)}`;
    return `${value.substr(0, 3)}-${value.substr(3, 4)}-${value.substr(7, 4)}`;
};

/** 수능 답안지 계열의 연한 과목 색 */
export const SUBJECT_CARD_STYLES = {
    '국어': { bg: '#FFF3E8', border: '#F0A86B', accent: '#E67E22', badge: 'bg-[#F0A86B]/20 text-[#B35C12]' },
    '수학': { bg: '#EAF7EE', border: '#7BC48C', accent: '#2E9B57', badge: 'bg-[#7BC48C]/25 text-[#1F7A3F]' },
    '영어': { bg: '#F3ECFA', border: '#B08CD4', accent: '#8E5BB8', badge: 'bg-[#B08CD4]/25 text-[#6B3D94]' },
    '과학': { bg: '#FDE8EE', border: '#E890A4', accent: '#D45B75', badge: 'bg-[#E890A4]/25 text-[#A83D55]' },
    '사회': { bg: '#E8F1FB', border: '#7BA8D9', accent: '#3D7AB8', badge: 'bg-[#7BA8D9]/25 text-[#2A5F94]' },
    '기타': { bg: '#F4F4F6', border: '#C7C7CC', accent: '#8E8E93', badge: 'bg-[#C7C7CC]/40 text-[#636366]' },
};

export function getSubjectCardStyle(subject) {
    return SUBJECT_CARD_STYLES[subject] || SUBJECT_CARD_STYLES['기타'];
}

/** 학원 로고용 이미지 → 압축 data URL (Firestore 저장) */
export function compressImageToDataUrl(file, { maxSide = 400, quality = 0.85 } = {}) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('이미지 파일만 업로드할 수 있습니다.'));
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            reject(new Error('이미지는 8MB 이하로 올려 주세요.'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
            img.onload = () => {
                const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                if (dataUrl.length > 700_000) {
                    reject(new Error('이미지가 너무 큽니다. 더 작은 파일로 시도해 주세요.'));
                    return;
                }
                resolve(dataUrl);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) { return initialValue; }
    });
    const setValue = value => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) { console.error(error); }
    };
    return [storedValue, setValue];
}

