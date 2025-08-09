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

const initializeVideoPlayers = () => {
    dom.mainContent.querySelectorAll('.video-container').forEach(container => {
        const tabs = container.querySelectorAll('.platform-btn');
        const players = container.querySelectorAll('.video-wrapper');
        const highlighter = container.querySelector('.video-tab-highlighter');

        const moveHighlighter = (targetTab) => {
            if (!highlighter || !targetTab) return;
            highlighter.style.width = `${targetTab.offsetWidth}px`;
            highlighter.style.transform = `translateX(${targetTab.offsetLeft}px)`;
        };

        const activeTab = container.querySelector('.platform-btn.active');
        if (activeTab) {
            requestAnimationFrame(() => moveHighlighter(activeTab));
        }

        tabs.forEach(tab => {
            if (tab.dataset.listenerAttached) return;
            tab.addEventListener('click', () => {
                const targetPlatform = tab.dataset.platform;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                players.forEach(player => {
                    player.classList.toggle('active', player.dataset.platform === targetPlatform);
                });
                moveHighlighter(tab);
            });
            tab.dataset.listenerAttached = 'true';
        });
    });
};

const debounce = (func, delay = 250) => {
    let timeoutId;
    return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); };
};

const updateMetaTags = (title, description) => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
};

const updateActiveLink = (path) => {
    const currentBase = path.split('/')[1] || 'home';
    document.querySelectorAll('a[data-page]').forEach(link => {
        const linkPage = link.getAttribute('data-page');
        link.setAttribute('aria-current', linkPage === currentBase ? 'page' : '');
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
                    let isFirstPlatform = true;

                    if (hasAparat) {
                        const aparatIdMatch = block.data.AparatUrl.match(/(?:\/v\/|\/embed\/)([a-zA-Z0-9]+)/);
                        if (aparatIdMatch) {
                            const embedUrl = `https://www.aparat.com/embed/${aparatIdMatch[1]}?data[responsive]=yes`;
                            tabsHTML += `<button class="platform-btn active" data-platform="aparat" title="پخش از آپارات"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M14.412 12.022l-.414 1.832c-.16.712-.597 1.33-1.214 1.72-.555.351-1.215.49-1.86.397l-.215-.04-1.817-.41c2.326-.274 4.328-1.605 5.52-3.499zM8 1.262c3.72 0 6.737 3.017 6.737 6.738 0 3.72-3.016 6.737-6.737 6.737S1.263 11.72 1.263 8 4.279 1.263 8 1.263zM.478 8.893c.263 2.23 1.497 4.16 3.266 5.367l.233.153-1.832-.414c-.712-.16-1.33-.597-1.72-1.214-.35-.555-.49-1.215-.397-1.86l.04-.215.41-1.817zm9.206.371c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.685 1.684 1.685.93 0 1.684-.755 1.684-1.685s-.754-1.684-1.684-1.684zM5.052 8c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.684 1.684 1.684.93 0 1.685-.754 1.685-1.684C6.737 8.754 5.982 8 5.052 8zm3.374-.746c-.263-.154-.59-.154-.853 0-.263.155-.422.44-.415.746.01.457.384.823.842.823.458 0 .831-.366.841-.824.007-.305-.152-.59-.415-.745zm2.521-2.623c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.685 1.684 1.685.93 0 1.685-.754 1.685-1.685 0-.93-.755-1.684-1.685-1.684zm1.075-3.044l1.832.414c1.427.322 2.343 1.7 2.11 3.125l-.032.164-.41 1.817c-.275-2.325-1.606-4.327-3.5-5.52zM6.315 3.368c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.685 1.684 1.685.93 0 1.685-.755 1.685-1.685s-.754-1.684-1.685-1.684zM5.076.028l.215.04 1.817.41C4.878.74 2.948 1.975 1.74 3.744l-.153.233.414-1.832c.16-.712.598-1.33 1.215-1.72.555-.35 1.215-.49 1.86-.397z"></path></svg></button>`;
                            playersHTML += `<div class="video-wrapper active" data-platform="aparat"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
                            isFirstPlatform = false;
                        }
                    }
                    if(hasYoutube) {
                        const youtubeIdMatch = block.data.YoutubeUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/);
                        if (youtubeIdMatch) {
                            tabsHTML += `<button class="platform-btn ${isFirstPlatform ? 'active' : ''}" data-platform="youtube" title="پخش از یوتیوب"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.897 3.43.1 6.27.1 12s.797 8.57 3.485 8.816c3.6.245 11.626.246 15.23 0C21.103 20.57 22.1 17.73 22.1 12s-.997-8.57-2.485-8.816zM9.925 15.5V8.5l6.5 3.5-6.5 3.5z"></path></svg></button>`;
                            playersHTML += `<div class="video-wrapper ${isFirstPlatform ? 'active' : ''}" data-platform="youtube"><iframe src="https://www.youtube.com/embed/${youtubeIdMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
                        }
                    }

                    if(tabsHTML) {
                        const videoTitle = block.data.title ? `<h3 class="video-title">${block.data.title}</h3>` : '';
                        const videoDesc = block.data.description ? `<p class="video-description">${parseInlineMarkdown(block.data.description)}</p>` : '';
                        const tabsContainer = (hasAparat && hasYoutube) ? `<div class="video-tabs-container"><div class="video-tab-highlighter"></div>${tabsHTML}</div>` : '';
                        html += `<div class="video-container">${videoTitle}<div class="video-player-area">${playersHTML}</div><div class="video-controls-container">${videoDesc}${tabsContainer}</div></div>`;
                    }
                    break;
                default: console.warn('Unknown block type:', block.type);
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
    initializeCopyButtons();
    initializeVideoPlayers();
};


const handleNavigation = () => {
    const path = location.hash || '#/';
    renderPage(path);
};

export const initializeRouter = () => {
    window.addEventListener('popstate', handleNavigation);
    handleNavigation();
};