// js/modules/router.js
import { state, dom } from './state.js';
import { initializeContactForm } from './ui.js';
import * as components from './components.js';

const DEFAULT_AVATAR_URL = 'defualt-avatar.png'; // این نام فایل باید اصلاح شود

// --- Private Functions ---
const updateMetaTags = (title, description) => {
    document.title = title;
    document.querySelector('meta[name="description"]').setAttribute('content', description);
};

const updateActiveLink = (path) => {
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    const currentBase = path.split('/')[1] || 'home';
    document.querySelectorAll('a[data-page]').forEach(link => {
        link.getAttribute('data-page') === currentBase ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current');
    });
    if (mobileDropdownMenu && mobileDropdownMenu.classList.contains('is-open')) {
        mobileDropdownMenu.classList.remove('is-open');
    }
};

const cleanupPageSpecifics = (newPath) => {
    if (state.newsScrollHandler) {
        window.removeEventListener('scroll', state.newsScrollHandler);
        state.newsScrollHandler = null;
    }
    if (!newPath.startsWith('/news')) {
        state.loadedNewsCount = 0;
        state.isLoadingNews = false;
    }
};

const renderPage = async (path) => {
    if (!dom.mainContent) return;

    cleanupPageSpecifics(path);
    updateActiveLink(path);
    window.scrollTo(0, 0);

    // Meta Tags Management
    let pageTitle = 'انجمن علمی علوم کامپیوتر | دانشگاه شهید چمران اهواز';
    let pageDescription = 'وب‌سایت رسمی انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز.';
    const pageKeyForMeta = path.split('/')[1] || 'home';
    const metaMap = {
        'home': { title: 'انجمن علمی علوم کامپیوتر | صفحه اصلی', description: 'به وب‌سایت رسمی انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز خوش آمدید.' },
        'about': { title: 'درباره ما | انجمن علمی علوم کامپیوتر', description: 'آشنایی با انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز، اهداف و فعالیت‌های ما.' },
        'members': { title: 'اعضای انجمن | انجمن علمی علوم کامپیوتر', description: 'با اعضای اصلی و فعال انجمن علمی علوم کامپیوتر دانشگاه شهید چمران اهواز آشنا شوید.' },
        'news': { title: 'اخبار و اطلاعیه‌ها | انجمن علمی علوم کامپیوتر', description: 'آرشیو آخرین اخبار، اطلاعیه‌ها و گزارش رویدادهای مربوط به انجمن علمی علوم کامپیوتر.' },
        'events': { title: 'رویدادها | انجمن علمی علوم کامپیوتر', description: 'از آخرین رویدادها، کارگاه‌ها، و مسابقات انجمن علمی مطلع شوید و در آن‌ها شرکت کنید.' },
        'journal': { title: 'نشریه علمی بایت | انجمن علمی علوم کامپیوتر', description: 'نشریه علمی بایت، فراتر از صفر و یک. محلی برای انتشار مقالات و دستاوردهای علمی دانشجویان.' },
        'contact': { title: 'تماس با ما | انجمن علمی علوم کامپیوتر', description: 'راه‌های ارتباطی با انجمن علمی علوم کامپیوتر.' }
    };
    if (metaMap[pageKeyForMeta]) {
        pageTitle = metaMap[pageKeyForMeta].title;
        pageDescription = metaMap[pageKeyForMeta].description;
    }
    updateMetaTags(pageTitle, pageDescription);

    // --- News Detail Page Logic ---
    if (path.startsWith('/news/')) {
        const newsItem = state.allNews.find(n => n.link === `#${path}`);
        if (!newsItem) {
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>محتوای خبر مورد نظر یافت نشد.</p><a href="#/news" class="btn btn-secondary" style="margin-top: 1rem;">بازگشت به آرشیو</a></div>`;
            return;
        }
        
        updateMetaTags(`${newsItem.title} | اخبار انجمن`, newsItem.summary);
        
        try {
            const response = await fetch(`news/${path.substring(6)}.html`);
            if (!response.ok) throw new Error('فایل محتوای خبر یافت نشد.');
            const articleHTML = await response.text();
            const author = state.membersMap.get(newsItem.authorId);
            const authorProfileHTML = author ? `...` : ''; // ... (منطق رندر پروفایل نویسنده)
            
            dom.mainContent.innerHTML = `
                <section class="page-container news-detail-page">
                    <div class="container">
                        <a href="#/news" class="btn-back">...<span>بازگشت به اخبار</span></a>
                        <div class="news-detail-meta-header">
                        ${author ? `
                            <div class="news-detail-author clickable-author" data-author-id="${author.id}">
                                <img src="${author.imageUrl || DEFAULT_AVATAR_URL}" alt="${author.name}">
                                <div><strong>${author.name}</strong><span>${author.role || 'عضو انجمن'}</span></div>
                            </div>` : ''}
                            <div class="news-item-meta">
                                <span>${newsItem.date}</span><span class="separator">&bull;</span><span>${newsItem.readingTime}</span>
                            </div>
                        </div>
                        <div class="content-box">${articleHTML}</div>
                    </div>
                </section>
            `;
        } catch (error) {
            console.error(error);
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا در بارگذاری محتوای خبر.</p></div>`;
        }
        return;
    }

    // --- Other Pages Logic ---
    if (path === '/') {
        if (!state.pageCache['/']) state.pageCache['/'] = dom.mainContent.innerHTML;
        dom.mainContent.innerHTML = state.pageCache['/'];
        components.loadLatestNews();
    } else {
        const pageKey = path.substring(1);
        if (state.pageCache[path]) {
            dom.mainContent.innerHTML = state.pageCache[path];
        } else {
            try {
                const response = await fetch(`${pageKey}.html`);
                if (!response.ok) throw new Error(`صفحه ${pageKey}.html یافت نشد.`);
                const pageHTML = await response.text();
                state.pageCache[path] = pageHTML;
                dom.mainContent.innerHTML = pageHTML;
            } catch (error) {
                console.error(error);
                location.hash = '#/';
                return;
            }
        }
        // --- Page-specific function calls ---
        const pageRenderers = {
            '/contact': initializeContactForm,
            '/events': components.renderEventsPage,
            '/members': components.renderMembersPage,
            '/journal': components.renderJournalPage,
            '/news': () => {
                state.loadedNewsCount = 0;
                components.loadMoreNews();
                state.newsScrollHandler = () => {
                    if (state.isLoadingNews || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 200) return;
                    components.loadMoreNews();
                };
                window.addEventListener('scroll', state.newsScrollHandler);
            }
        };
        if (pageRenderers[path]) {
            pageRenderers[path]();
        }
    }
};

const getCurrentPath = () => location.hash.substring(1) || '/';

// --- Exported Initializer ---
export const initializeRouter = () => {
    window.addEventListener('hashchange', () => renderPage(getCurrentPath()));
    renderPage(getCurrentPath()); // Initial render
};