import { useState } from 'react';

export const inputCls = "w-full text-[13px] bg-[#f5f5f7] border border-[rgba(0,0,0,0.05)] rounded-xl px-4 py-3 focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all duration-200 text-[#1d1d1f] font-medium";
export const labelCls = "block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1";
export const primaryBtnCls = "bg-[#0066cc] hover:bg-[#005bb5] text-white px-5 py-2.5 rounded-full font-semibold text-[13px] transition-all shadow-sm flex items-center justify-center gap-1.5";
export const secondaryBtnCls = "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] px-5 py-2.5 rounded-full font-semibold text-[13px] transition-all flex items-center justify-center gap-1.5";
export const subtleBtnCls = "bg-white border border-[rgba(0,0,0,0.05)] text-[#1d1d1f] hover:bg-[#f5f5f7] px-4 py-2 rounded-full font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-1.5";

export const triggerNotification = (message, isError = false) => {
    const el = document.createElement('div');
    el.className = `fixed top-6 left-1/2 -translate-x-1/2 text-white px-6 py-3.5 rounded-full shadow-lg z-[100] transition-all duration-300 flex items-center gap-2.5 no-print font-medium text-sm apple-glass border-none ${isError ? 'bg-rose-500/90' : 'bg-[#1d1d1f]/90'}`;
    el.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} ${isError ? 'text-white' : 'text-blue-400'}"></i> <span>${message}</span>`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -20px)'; setTimeout(() => document.body.removeChild(el), 300); }, 3000);
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

