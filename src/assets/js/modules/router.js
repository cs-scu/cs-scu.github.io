// src/assets/js/modules/router.js
import { state, dom } from './state.js';
import { initializeAuthForm, initializeContactForm, showEventModal, initializeInteractions, renderInteractionsSection, showProfileModal } from './ui.js';
import * as components from './components.js';
import { supabaseClient, loadEvents, loadJournal, loadChartData, getComments, getLikeStatus } from './api.js';

const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

// --- Helper Functions ---
const debounce = (func, delay = 250) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

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
    
    const renderJsonContent = (blocks) => {
        if (!Array.isArray(blocks)) {
            console.error("Content is not a valid block array:", blocks);
            return '<p>محتوای این خبر به درستی بارگذاری نشد.</p>';
        }

        let html = '';
        blocks.forEach(block => {
            // با توجه به نوع هر بلوک، تگ HTML مناسب را ایجاد می‌کند
            switch (block.type) {
                case 'header':
                    html += `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
                    break;
                case 'paragraph':
                    // استفاده از innerHTML برای نمایش صحیح لینک‌ها و تگ‌های ساده
                    html += `<p>${block.data.text}</p>`;
                    break;
                case 'list':
                    const listItems = block.data.items.map(item => `<li>${item}</li>`).join('');
                    const listType = block.data.style === 'ordered' ? 'ol' : 'ul';
                    html += `<${listType}>${listItems}</${listType}>`;
                    break;
                
                // <<-- بلوک‌های جدید از اینجا اضافه شده‌اند -->>
                case 'image':
                    html += `
                        <figure>
                            <img src="${block.data.url}" alt="${block.data.caption || 'Image'}">
                            ${block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ''}
                        </figure>`;
                    break;
                case 'quote':
                    html += `
                        <blockquote>
                            <p>${block.data.text}</p>
                            ${block.data.caption ? `<cite>${block.data.caption}</cite>` : ''}
                        </blockquote>`;
                    break;
                case 'code':
                    // برای امنیت، محتوای کد را escape می‌کنیم
                    const escapedCode = block.data.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    html += `<pre><code>${escapedCode}</code></pre>`;
                    break;
                case 'table':
                    const headers = block.data.withHeadings 
                        ? `<thead><tr>${block.data.content[0].map(cell => `<th>${cell}</th>`).join('')}</tr></thead>` 
                        : '';
                    
                    const bodyRows = block.data.withHeadings ? block.data.content.slice(1) : block.data.content;
                    const body = `<tbody>${bodyRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;

                    html += `<div class="table-wrapper"><table class="content-table">${headers}${body}</table></div>`;
                    break;

                default:
                    console.warn('Unknown block type:', block.type);
            }
        });
        return html;
    };

    if (cleanPath === '/profile-updated') {
        await renderPage('/');
        showProfileModal();
        history.replaceState(null, '', location.pathname + '#/');
        return;
    }

    dom.mainContent.classList.add('is-loading');
    await new Promise(resolve => setTimeout(resolve, 200)); 

    cleanupPageSpecifics(cleanPath);
    updateActiveLink(cleanPath);
    
    if (cleanPath.startsWith('/news/')) {
        window.scrollTo(0, 0);
        const newsLink = `#${cleanPath}`;
        const { data: newsItem, error } = await supabaseClient.from('news').select(`*`).eq('link', newsLink).single();

        if (error || !newsItem) {
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>محتوای خبر مورد نظر یافت نشد.</p><a href="#/news" class="btn btn-secondary" style="margin-top: 1rem;">بازگشت به آرشیو</a></div>`;
        } else {
            updateMetaTags(`${newsItem.title} | اخبار انجمن`, newsItem.summary);
            const author = state.membersMap.get(newsItem.authorId);
            
            // <<-- تغییر اصلی اینجاست: فراخوانی تابع جدید برای رندر محتوا -->>
            const articleHTML = renderJsonContent(newsItem.content);

            const [{ data: comments }, { data: likeStatus }] = await Promise.all([
                getComments(newsItem.id, state.user?.id),
                getLikeStatus(newsItem.id, state.user?.id)
            ]);

            dom.mainContent.innerHTML = `
                <section class="page-container news-detail-page">
                    <div class="container">
                        <a href="#/news" class="btn-back"><span>بازگشت به اخبار</span></a>
                        <div class="news-detail-meta-header">
                            ${author ? `<div class="news-detail-author clickable-author" data-author-id="${author.id}"><img src="${author.imageUrl || DEFAULT_AVATAR_URL}" alt="${author.name}" loading="lazy"><div><strong>${author.name}</strong><span>${author.role || 'عضو انجمن'}</span></div></div>` : ''}
                            <div class="news-item-meta"><span>${newsItem.date}</span><span class="separator">&bull;</span><span>${newsItem.readingTime}</span></div>
                        </div>
                        <div class="content-box">
                            <article class="news-content-area">${articleHTML}</article>
                            <hr class="post-divider">
                            ${renderInteractionsSection(newsItem.id, likeStatus, comments)}
                        </div>
                    </div>
                </section>
            `;
            initializeInteractions(newsItem.id);
        }
        dom.mainContent.classList.remove('is-loading');
        return;
    }

    if (cleanPath.startsWith('/events/')) {
        await loadEvents();
        if (!state.pageCache['/events']) {
            const response = await fetch('events.html');
            state.pageCache['/events'] = await response.text();
        }
        dom.mainContent.innerHTML = state.pageCache['/events'];
        components.renderEventsPage();
        showEventModal(cleanPath);
        dom.mainContent.classList.remove('is-loading');
        return;
    }

    window.scrollTo(0, 0);
    const pageKey = cleanPath === '/' || cleanPath === '' ? 'home' : cleanPath.substring(1);
    
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
            }
        }
    }
    
    const pageRenderers = {
        '/login': initializeAuthForm,
        '/admin': () => {
            if (state.profile?.role !== 'admin') {
                location.hash = '#/';
            }
        },
        '/contact': initializeContactForm,
        '/events': async () => { await loadEvents(); components.renderEventsPage(); },
        '/members': components.renderMembersPage,
        '/journal': async () => { await loadJournal(); components.renderJournalPage(); },
        '/chart': async () => { await loadChartData(); components.renderChartPage(); },
        '/news': () => {
            state.loadedNewsCount = 0;
            components.loadMoreNews();
            state.newsScrollHandler = debounce(() => {
                if (state.isLoadingNews || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 200) return;
                components.loadMoreNews();
            }, 100);
            window.addEventListener('scroll', state.newsScrollHandler);
        }
    };
    if (pageRenderers[cleanPath]) {
        await pageRenderers[cleanPath]();
    }
    
    dom.mainContent.classList.remove('is-loading');
};


const handleNavigation = () => {
    const path = location.hash || '#/';
    renderPage(path);
};

export const initializeRouter = () => {
    window.addEventListener('popstate', handleNavigation);
    handleNavigation();
};