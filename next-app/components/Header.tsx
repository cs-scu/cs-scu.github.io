'use client'; // این کامپوننت نیاز به تعامل کاربر دارد (کلیک دکمه‌ها)، پس باید Client Component باشد

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
// import { useTheme } from 'next-themes'; // اگر از next-themes استفاده می‌کنید

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // --- مدیریت تم ---
  // const { theme, setTheme, resolvedTheme } = useTheme(); // اگر از next-themes استفاده می‌کنید
  // در غیر این صورت، state محلی یا context برای مدیریت تم لازم است
  const [currentThemeState, setCurrentThemeState] = useState('system'); // مثال: state محلی
  const themeTitles: { [key: string]: string } = { system: 'سیستم', light: 'روشن', dark: 'تیره' };

  // تابع برای تغییر تم (مثال با state محلی)
  const toggleTheme = () => {
    const themeStates = ['system', 'light', 'dark'];
    const currentIndex = themeStates.indexOf(currentThemeState);
    const nextState = themeStates[(currentIndex + 1) % themeStates.length];
    setCurrentThemeState(nextState);
    // اینجا باید منطق واقعی تغییر تم (تغییر کلاس body یا استفاده از next-themes) پیاده‌سازی شود
    console.log('Setting theme to:', nextState);
    // مثال با next-themes: setTheme(nextState);
    // مثال با کلاس body: document.body.className = nextState === 'system' ? ... : `${nextState}-theme`;
  };

  // --- مدیریت منو ---
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // بستن منو با کلیک بیرون از آن
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuToggleRef.current &&
        !menuToggleRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // بستن منو هنگام کلیک روی لینک‌های داخل منو
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    // از کلاس‌های CSS موجود در _header.css و _base.css استفاده کنید
    <header className="main-header sticky top-0 z-50"> {/* اضافه کردن کلاس‌های Tailwind/CSS */}
      <div className="container mx-auto flex items-center justify-between px-2 py-1 rounded-b-xl backdrop-blur-md border border-t-0 border-opacity-20 bg-opacity-30 border-[--glass-border-light] bg-[--glass-bg-light] dark:border-[--glass-border-dark] dark:bg-[--glass-bg-dark]"> {/* استایل کانتینر مشابه _header.css */}

        {/* --- دکمه تغییر تم (چپ) --- */}
        <button
          id="theme-toggle"
          title={`تغییر تم (حالت فعلی: ${themeTitles[currentThemeState]})`}
          onClick={toggleTheme}
          data-theme-state={currentThemeState} // برای نمایش آیکون صحیح
          className="p-2 text-inherit" // استایل پایه
        >
          {/* آیکون‌ها مشابه index.html */}
          <svg className={`sun ${currentThemeState !== 'light' ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <svg className={`moon ${currentThemeState !== 'dark' ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <svg className={`system ${currentThemeState !== 'system' ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><clipPath id="diagonal-half"><polygon points="2,3 22,3 2,17" /></clipPath></defs><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="2" y="3" width="20" height="14" fill="currentColor" className="light-theme-fill" clipPath="url(#diagonal-half)" strokeWidth="0"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </button>

        {/* --- عنوان (وسط) --- */}
        <Link href="/" className="logo text-lg font-bold text-[--primary-color-light-theme] dark:text-[--primary-color]"> {/* استایل مشابه _header.css */}
          انجمن علمی علوم کامپیوتر
        </Link>

        {/* --- دکمه منو (راست) و منوی کشویی --- */}
        <div className="relative"> {/* menu-wrapper */}
          <button
            id="mobile-menu-toggle"
            ref={menuToggleRef}
            title="منو"
            onClick={toggleMenu}
            className="p-2 text-inherit" // استایل پایه
          >
            {/* آیکون سه نقطه مشابه index.html */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>

          {/* منوی کشویی */}
          <div
            ref={menuRef}
            id="mobile-dropdown-menu"
            className={`absolute left-0 mt-2 min-w-[180px] rounded-lg shadow-lg backdrop-blur-md overflow-hidden border border-opacity-20 bg-opacity-90 transition-all duration-200 ease-out z-40
              border-[--glass-border-light] bg-[--glass-bg-light] dark:border-[--glass-border-dark] dark:bg-[--glass-bg-dark]
              ${isMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`} // استایل مشابه _header.css برای باز/بسته شدن
          >
            {/* لینک‌های منو - مشابه index.html */}
            <Link href="/" className="menu-link" onClick={handleLinkClick}>صفحه اصلی</Link>
            {/* <Link href="/login" className="menu-link" onClick={handleLinkClick}>ورود / ثبت‌نام</Link> */}
            <Link href="/news" className="menu-link" onClick={handleLinkClick}>اخبار</Link>
            <Link href="/events" className="menu-link" onClick={handleLinkClick}>رویدادها</Link>
            <Link href="/journal" className="menu-link" onClick={handleLinkClick}>نشریه</Link>
            <Link href="/chart" className="menu-link" onClick={handleLinkClick}>چارت درسی</Link>
            <Link href="/members" className="menu-link" onClick={handleLinkClick}>اعضا</Link>
            <Link href="/about" className="menu-link" onClick={handleLinkClick}>درباره ما</Link>
            <Link href="/contact" className="menu-link" onClick={handleLinkClick}>تماس با ما</Link>
            {/* ... لینک‌های دیگر مانند پروفایل، خروج، پنل ادمین (شرطی) ... */}
          </div>
        </div>
      </div>

      {/* استایل لینک‌های منو (می‌توانید به globals.css منتقل کنید) */}
      <style jsx>{`
        .menu-link {
          display: block;
          padding: 0.8rem 1.2rem;
          font-size: 0.9rem;
          text-decoration: none;
          text-align: right;
          border-bottom: 1px solid var(--glass-border-light);
          transition: background-color 0.2s, color 0.2s;
          color: var(--text-color-light); /* رنگ پیش‌فرض برای تم روشن */
        }
        .dark .menu-link { /* استایل در تم تیره */
            color: var(--text-color-dark);
            border-bottom-color: var(--glass-border-dark);
        }
        .menu-link:last-child {
          border-bottom: none;
        }
        .menu-link:hover {
          background-color: var(--primary-color-light-theme); /* رنگ هاور برای تم روشن */
          color: #fff;
        }
        .dark .menu-link:hover { /* استایل هاور در تم تیره */
           background-color: var(--primary-color);
           color: var(--background-color-dark);
        }
        /* کلاس‌های hidden برای آیکون‌های تم */
        .hidden { display: none; }
      `}</style>
    </header>
  );
}