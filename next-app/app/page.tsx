// src/app/page.tsx
import Link from 'next/link';

// --- تعریف نوع داده خبر ---
interface NewsItem {
  id: number;
  title: string;
  summary: string;
  image: string;
  link: string;
  date: string;
  authorId?: number;
}

// --- تابع فرضی برای دریافت اخبار ---
// !!! این بخش باید با کد واقعی اتصال به دیتابیس/API جایگزین شود !!!
async function getLatestNews(): Promise<NewsItem[]> {
  console.log('Fetching latest news...'); // اجرا در سمت سرور
  await new Promise((resolve) => setTimeout(resolve, 50)); // شبیه‌سازی تاخیر
  return [
    { id: 3, title: 'وب‌سایت انجمن علمی کامپیوتر رسماً آغاز به کار کرد!', summary: 'وب‌سایت رسمی انجمن علمی به عنوان کانونی جدید برای اطلاع‌رسانی...', image: '/images/news-placeholder-1.png', link: '/news/3-website-launch', date: '۲۷ تیر ۱۴۰۴', authorId: 1 },
    { id: 2, title: 'اعلام زمان امتحانات شهریورماه دانشگاه', summary: 'به اطلاع دانشجویان عزیز می‌رساند بازه زمانی برگزاری امتحانات...', image: '/images/news-placeholder-2.png', link: '/news/2-exam-schedule', date: '۵ شهریور ۱۴۰۴' },
    { id: 1, title: 'آماده‌سازی برای ثبت‌نام نو ورودان 1404', summary: 'راهنمای آماده‌سازی برای ثبت‌نام نو ورودان مهرماه 1404.', image: '/images/news-placeholder-3.png', link: '/news/1-new-student-registration', date: '۲۱ مهر ۱۴۰۴' },
  ];
}
// --- پایان تابع فرضی ---

// --- کامپوننت کارت خبر ---
function NewsCard({ news }: { news: NewsItem }) {
  return (
    <article className="news-card"> {/* استایل‌ها در globals.css */}
      <Link href={news.link} className="news-card-image-link block">
        <img
          src={news.image || '/images/placeholder.png'}
          alt={news.title}
          loading="lazy"
          width={300}
          height={200}
          className="aspect-[3/2] object-cover w-full"
        />
      </Link>
      <div className="news-card-content">
        <Link href={news.link}>
          <h3 className="mb-2 text-lg font-bold text-[--primary-color-light-theme] dark:text-[--primary-color] hover:underline"> {/* رنگ از globals.css */}
            {news.title}
          </h3>
        </Link>
        <p className="text-sm leading-relaxed opacity-90 flex-grow mb-4">{news.summary}</p>
        <div className="news-card-footer">
           <div className="news-item-author"> {/* آیکون پیش‌فرض */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="author-icon w-6 h-6 opacity-70"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          <span className="news-meta text-xs opacity-70">{news.date}</span>
        </div>
      </div>
    </article>
  );
}
// --- پایان کامپوننت ---

// --- صفحه اصلی ---
export default async function HomePage() {
  const latestNews = await getLatestNews();

  return (
    <>
      {/* بخش Hero */}
      <section className="hero min-h-[50vh] flex items-center justify-center text-center py-8">
        <div className="container">
          <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4 font-bold text-[--primary-color-light-theme] dark:text-[--primary-color] animate-pulse-glow"> {/* استایل و انیمیشن */}
            از صفر تا یک، همراه با تکنولوژی
          </h1>
          <p className="text-base md:text-lg max-w-3xl mx-auto mb-8 opacity-90">
            به وب‌سایت رسمی انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز خوش آمدید.
          </p>
          <Link href="/about" className="btn btn-primary">
            بیشتر با ما آشنا شوید
          </Link>
        </div>
      </section>

      {/* بخش آخرین اخبار */}
      <section className="latest-news py-16 text-center">
        <div className="container">
          <h2 className="news-title text-3xl md:text-4xl mb-12 font-bold text-[--primary-color-light-theme] dark:text-[--primary-color]">
            آخرین اخبار و اطلاعیه‌ها
          </h2>
          <div className="news-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {latestNews.length > 0 ? (
              latestNews.map((newsItem) => (
                <NewsCard key={newsItem.id} news={newsItem} />
              ))
            ) : (
              <p className="col-span-full">خبری برای نمایش وجود ندارد.</p>
            )}
          </div>
          <Link href="/news" className="btn btn-secondary mt-12">
            آرشیو اخبار
          </Link>
        </div>
      </section>
    </>
  );
}