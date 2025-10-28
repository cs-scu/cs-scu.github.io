// src/app/layout.tsx
import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css'; // فایل CSS سراسری

// --- کامپوننت‌های مشترک ---
import Header from '@/components/Header'; // ایمپورت هدر
// import Footer from '@/components/Footer'; // فوتر رو بعدا اضافه می‌کنیم
// import { ThemeProvider } from 'next-themes'; // برای مدیریت تم

// بارگذاری فونت وزیرمتن
const vazirmatnFont = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-vazirmatn',
});

// متادیتای پیش‌فرض سایت
export const metadata: Metadata = {
  title: {
    template: '%s | انجمن علمی علوم کامپیوتر SCU',
    default: 'انجمن علمی علوم کامپیوتر | دانشگاه شهید چمران اهواز',
  },
  description: 'وب‌سایت رسمی انجمن علمی علوم کامپیوتر دانشگاه شهید چمران اهواز...',
  icons: {
    icon: '/favicon.png', // آیکون رو در پوشه public قرار بدید
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      {/* <html lang="fa" dir="rtl" suppressHydrationWarning> // برای next-themes */}
      <body className={`${vazirmatnFont.variable} font-sans flex flex-col min-h-screen`}>
        {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
          <Header /> {/* هدر در بالای همه صفحات */}
          <main className="flex-grow pt-8"> {/* محتوای اصلی */}
            {children}
          </main>
          {/* <Footer /> */} {/* فوتر رو بعدا اضافه می‌کنیم */}
        {/* </ThemeProvider> */}
      </body>
    </html>
  );
}