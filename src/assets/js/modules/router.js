// src/assets/js/modules/router.js (نسخه نهایی با مدیریت مودال)

import { state, dom } from './state.js';
import { initializeContactForm, showEventModal } from './ui.js';
import * as components from './components.js';
import { supabaseClient, loadEvents, loadJournal, loadChartData, getBaseUrl } from './api.js';

const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

const updateMetaTags = (title, description) => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
};

const updateActiveLink = (path) => {
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    const currentBase = path.split('/')[1] || 'home';
    document.querySelectorAll('a[data-page]').forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === currentBase) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
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
    const cleanPath = path.startsWith('#') ? path.substring(1) : path;
    cleanupPageSpecifics(cleanPath);
    updateActiveLink(cleanPath);
    
    // 1. اگر مسیر مربوط به جزئیات خبر بود
    if (cleanPath.startsWith('/news/')) {
        window.scrollTo(0, 0);
        const newsLink = `#${cleanPath}`;
        const { data: newsItem, error } = await supabaseClient.from('news').select(`*`).eq('link', newsLink).single();

        if (error || !newsItem) {
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>محتوای خبر مورد نظر یافت نشد.</p><a href="#/news" class="btn btn-secondary" style="margin-top: 1rem;">بازگشت به آرشیو</a></div>`;
            return;
        }
        
        updateMetaTags(`${newsItem.title} | اخبار انجمن`, newsItem.summary);
        const author = state.membersMap.get(newsItem.authorId);
        const articleHTML = newsItem.content;
        dom.mainContent.innerHTML = `
            <section class="page-container news-detail-page">
                <div class="container">
                    <a href="#/news" class="btn-back"><span>بازگشت به اخبار</span></a>
                    <div class="news-detail-meta-header">
                        ${author ? `<div class="news-detail-author clickable-author" data-author-id="${author.id}"><img src="${author.imageUrl || DEFAULT_AVATAR_URL}" alt="${author.name}"><div><strong>${author.name}</strong><span>${author.role || 'عضو انجمن'}</span></div></div>` : ''}
                        <div class="news-item-meta"><span>${newsItem.date}</span><span class="separator">&bull;</span><span>${newsItem.readingTime}</span></div>
                    </div>
                    <div class="content-box">${articleHTML}</div>
                </div>
            </section>
        `;
        return;
    }

    // 2. اگر مسیر مربوط به جزئیات رویداد بود
    if (cleanPath.startsWith('/events/')) {
        await loadEvents();
        if (!state.pageCache['/events']) {
            const response = await fetch('events.html');
            state.pageCache['/events'] = await response.text();
        }
        dom.mainContent.innerHTML = state.pageCache['/events'];
        components.renderEventsPage();
        showEventModal(cleanPath);
        return;
    }

    // --- مدیریت صفحات استاتیک ---
    window.scrollTo(0, 0);
    const pageKey = cleanPath === '/' || cleanPath === '' ? 'home' : cleanPath.substring(1);
    const pageFile = pageKey === 'home' ? 'index.html' : `${pageKey}.html`;
    
    if (pageKey === 'home') {
        dom.mainContent.innerHTML = state.pageCache['/'] || ' ';
        components.loadLatestNews();
    } else {
        if (state.pageCache[cleanPath]) {
            dom.mainContent.innerHTML = state.pageCache[cleanPath];
        } else {
            try {
                const response = await fetch(`${pageKey}.html`);
                if (!response.ok) throw new Error(`Page not found: ${pageKey}.html`);
                const pageHTML = await response.text();
                state.pageCache[cleanPath] = pageHTML;
                dom.mainContent.innerHTML = pageHTML;
            } catch (error) {
                location.hash = '#/';
                return;
            }
        }
    }
    
    const pageRenderers = {
        '/contact': initializeContactForm,
        '/events': async () => { await loadEvents(); components.renderEventsPage(); },
        '/members': components.renderMembersPage,
        '/journal': async () => { await loadJournal(); components.renderJournalPage(); },
        '/chart': async () => { await loadChartData(); components.renderChartPage(); },
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
    if (pageRenderers[cleanPath]) {
        await pageRenderers[cleanPath]();
    }
};

const handleNavigation = () => {
    const path = location.hash || '#/';
    renderPage(path);
};

export const initializeRouter = () => {
    window.addEventListener('popstate', handleNavigation);
    handleNavigation(); // رندر اولیه
};