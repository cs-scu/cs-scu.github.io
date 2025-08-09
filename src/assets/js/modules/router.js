// src/assets/js/modules/router.js
import { state, dom } from './state.js';
import { initializeAuthForm, initializeContactForm, showEventModal, initializeInteractions, renderInteractionsSection, showProfileModal } from './ui.js';
import * as components from './components.js';
import { supabaseClient, loadEvents, loadJournal, loadChartData, getComments, getLikeStatus } from './api.js';

const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

const initializeCopyButtons = () => {
    dom.mainContent.querySelectorAll('.copy-code-btn').forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.addEventListener('click', () => {
            const wrapper = btn.closest('.code-block-wrapper');
            const code = wrapper.querySelector('pre code');
            if (code) {
                navigator.clipboard.writeText(code.textContent).then(() => {
                    const originalIcon = btn.innerHTML;
                    const themeColor = document.body.classList.contains('dark-theme') ? '#e8c38e' : '#1a5c5d';
                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
                });
            }
        });
        btn.dataset.listenerAttached = 'true';
    });
};

// <<-- تابع جدید برای مدیریت پلیر ویدیو -->>
const initializeVideoPlayers = () => {
    dom.mainContent.querySelectorAll('.video-container').forEach(container => {
        const tabs = container.querySelectorAll('.video-tab-btn');
        const players = container.querySelectorAll('.video-wrapper');

        tabs.forEach(tab => {
            if (tab.dataset.listenerAttached) return;
            tab.addEventListener('click', () => {
                const targetPlatform = tab.dataset.platform;

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                players.forEach(player => {
                    if (player.dataset.platform === targetPlatform) {
                        player.classList.add('active');
                    } else {
                        player.classList.remove('active');
                    }
                });
            });
            tab.dataset.listenerAttached = 'true';
        });
    });
};

const debounce = (func, delay = 250) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
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
    
    const parseInlineMarkdown = (text) => {
        if (!text) return '';
        const sanitizer = document.createElement('div');
        sanitizer.textContent = text;
        let sanitizedText = sanitizer.innerHTML;
        sanitizedText = sanitizedText.replace(/(?<!\\)\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        sanitizedText = sanitizedText.replace(/(?<!\\)\*(.*?)\*/g, '<em>$1</em>');
        sanitizedText = sanitizedText.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
            if (url.startsWith('javascript:')) return `[${linkText}]()`;
            if (url.startsWith('@')) return `<a href="#/${url.substring(1)}">${linkText}</a>`;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        });
        sanitizedText = sanitizedText.replace(/\\(\*)/g, '$1');
        return sanitizedText;
    };

    const renderJsonContent = (blocks) => {
        if (!Array.isArray(blocks)) return '<p>محتوای این خبر به درستی بارگذاری نشد.</p>';
        let html = '';
        blocks.forEach(block => {
            switch (block.type) {
                case 'header': html += `<h${block.data.level}>${block.data.text}</h${block.data.level}>`; break;
                case 'paragraph': html += `<p>${parseInlineMarkdown(block.data.text)}</p>`; break;
                case 'list': html += `<${block.data.style === 'ordered' ? 'ol' : 'ul'}>${block.data.items.map(item => `<li>${parseInlineMarkdown(item)}</li>`).join('')}</${block.data.style === 'ordered' ? 'ol' : 'ul'}>`; break;
                case 'image': html += `<figure><img src="${block.data.url}" alt="${block.data.caption || 'Image'}">${block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ''}</figure>`; break;
                case 'quote': html += `<blockquote><p>${block.data.text}</p>${block.data.caption ? `<cite>${block.data.caption}</cite>` : ''}</blockquote>`; break;
                case 'code':
                    const lang = block.data.language || '';
                    const code = block.data.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    html += `<div class="code-block-wrapper"><div class="code-block-header"><span class="language-name">${lang}</span><button class="copy-code-btn" title="کپی"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></div><pre><code>${code}</code></pre></div>`;
                    break;
                case 'table':
                    const headers = block.data.withHeadings ? `<thead><tr>${block.data.content[0].map(c => `<th>${c}</th>`).join('')}</tr></thead>` : '';
                    const rows = block.data.withHeadings ? block.data.content.slice(1) : block.data.content;
                    const body = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
                    html += `<div class="table-wrapper"><table class="content-table">${headers}${body}</table></div>`;
                    break;
                case 'video':
                    let tabsHTML = '', playersHTML = '';
                    const hasYoutube = block.data.YoutubeUrl && block.data.YoutubeUrl.trim() !== '';
                    const hasAparat = block.data.AparatUrl && block.data.AparatUrl.trim() !== '';
                    
                    if(hasYoutube) {
                        const videoId = new URL(block.data.YoutubeUrl).searchParams.get('v') || block.data.YoutubeUrl.split('youtu.be/')[1];
                        tabsHTML += `<button class="video-tab-btn active" data-platform="youtube">یوتیوب</button>`;
                        playersHTML += `<div class="video-wrapper active" data-platform="youtube"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
                    }
                    if(hasAparat) {
                        const videoId = block.data.AparatUrl.split('/v/')[1];
                        tabsHTML += `<button class="video-tab-btn ${!hasYoutube ? 'active' : ''}" data-platform="aparat">آپارات</button>`;
                        playersHTML += `<div class="video-wrapper ${!hasYoutube ? 'active' : ''}" data-platform="aparat"><iframe src="https://www.aparat.com/video/video/embed/videohash/${videoId}/vt/frame" frameborder="0" allowfullscreen></iframe></div>`;
                    }

                    if(tabsHTML) {
                        html += `<div class="video-container"><div class="video-tabs">${tabsHTML}</div><div class="video-player-area">${playersHTML}</div></div>`;
                    }
                    break;
                default: console.warn('Unknown block type:', block.type);
            }
        });
        return html;
    };

    if (cleanPath === '/profile-updated') { /* ... */ }
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
            const articleHTML = renderJsonContent(newsItem.content);
            const [{ data: comments }, { data: likeStatus }] = await Promise.all([ getComments(newsItem.id, state.user?.id), getLikeStatus(newsItem.id, state.user?.id) ]);
            dom.mainContent.innerHTML = `<section class="page-container news-detail-page"><div class="container"><a href="#/news" class="btn-back"><span>بازگشت به اخبار</span></a><div class="news-detail-meta-header">${author ? `<div class="news-detail-author clickable-author" data-author-id="${author.id}"><img src="${author.imageUrl || DEFAULT_AVATAR_URL}" alt="${author.name}" loading="lazy"><div><strong>${author.name}</strong><span>${author.role || 'عضو انجمن'}</span></div></div>` : ''}<div class="news-item-meta"><span>${newsItem.date}</span><span class="separator">&bull;</span><span>${newsItem.readingTime}</span></div></div><div class="content-box"><article class="news-content-area">${articleHTML}</article><hr class="post-divider">${renderInteractionsSection(newsItem.id, likeStatus, comments)}</div></div></section>`;
            initializeInteractions(newsItem.id);
        }
    } else if (cleanPath.startsWith('/events/')) {
        await loadEvents();
        if (!state.pageCache['/events']) {
            const response = await fetch('events.html');
            state.pageCache['/events'] = await response.text();
        }
        dom.mainContent.innerHTML = state.pageCache['/events'];
        components.renderEventsPage();
        showEventModal(cleanPath);
    } else {
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
    }
    
    const pageRenderers = {
        '/login': initializeAuthForm, '/admin': () => { if (state.profile?.role !== 'admin') location.hash = '#/'; },
        '/contact': initializeContactForm, '/events': async () => { await loadEvents(); components.renderEventsPage(); },
        '/members': components.renderMembersPage, '/journal': async () => { await loadJournal(); components.renderJournalPage(); },
        '/chart': async () => { await loadChartData(); components.renderChartPage(); },
        '/news': () => {
            state.loadedNewsCount = 0; components.loadMoreNews();
            state.newsScrollHandler = debounce(() => { if (state.isLoadingNews || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 200) return; components.loadMoreNews(); }, 100);
            window.addEventListener('scroll', state.newsScrollHandler);
        }
    };
    if (pageRenderers[cleanPath]) await pageRenderers[cleanPath]();
    
    dom.mainContent.classList.remove('is-loading');
    initializeCopyButtons();
    initializeVideoPlayers(); // <<-- فعال‌سازی دکمه‌های ویدیو
};

const handleNavigation = () => { const path = location.hash || '#/'; renderPage(path); };
export const initializeRouter = () => { window.addEventListener('popstate', handleNavigation); handleNavigation(); };