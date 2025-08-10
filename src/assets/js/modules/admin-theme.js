// src/assets/js/modules/admin-theme.js

// تابع کمکی برای تشخیص تم سیستم کاربر
const getSystemThemeClass = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';
};

// تابع اصلی برای اعمال تم به صفحه
const applyAdminTheme = (themeState) => {
    // بر اساس انتخاب کاربر، کلاس مناسب را تعیین می‌کند
    const themeClass = (themeState === 'system') ? getSystemThemeClass() : `${themeState}-theme`;
    
    // کلاس‌های قبلی را حذف و کلاس جدید را به تگ <body> اضافه می‌کند
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(themeClass);
};

// این تابع اصلی ماژول است که از بیرون فراخوانی می‌شود
export const initializeAdminTheme = () => {
    // ۱. انتخاب تم ذخیره شده کاربر را از حافظه می‌خواند
    const initialThemeState = localStorage.getItem('themeState') || 'system';
    
    // ۲. تم را در ابتدای بارگذاری صفحه اعمال می‌کند
    applyAdminTheme(initialThemeState);

    // ۳. به تغییرات تم سیستم گوش می‌دهد تا در حالت "سیستم" پنل هم آپدیت شود
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('themeState') === 'system') {
            applyAdminTheme('system');
        }
    });

    // ۴. (اختیاری) به تغییرات حافظه گوش می‌دهد تا اگر کاربر در تب دیگری تم را عوض کرد، اینجا هم آپدیت شود
    window.addEventListener('storage', (event) => {
        if (event.key === 'themeState') {
            applyAdminTheme(event.newValue || 'system');
        }
    });
};