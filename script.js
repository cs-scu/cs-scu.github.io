document.addEventListener('DOMContentLoaded', () => {

    // --- 1. متغیرهای عمومی و اولیه ---
    const body = document.body;
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const initialContent = mainContent.innerHTML;
    const pageCache = { '/': initialContent };
    let particlesInstance = null;

    // Data stores
    let allNews = [];
    let membersMap = new Map();
    let allEvents = [];
    let allJournalIssues = []; // Data store for journal
    // News page state
    let loadedNewsCount = 0;
    const NEWS_PER_PAGE = 10;
    let isLoadingNews = false;
    let newsScrollHandler = null;

    // const DEFAULT_AVATAR_URL = 'https://icons.veryicon.com/png/o/miscellaneous/rookie-official-icon-gallery/225-default-avatar.png';

    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        const now = new Date();
        const persianYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(now);
        currentYearSpan.textContent = persianYear;
    }

    // --- 2. کنترل تم ---
    const themeToggle = document.getElementById('theme-toggle');
    const THEME_STATES = ['system', 'light', 'dark'];
    const THEME_TITLES = { system: 'سیستم', light: 'روشن', dark: 'تیره' };

    const getSystemThemeClass = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';

    const applyVisualTheme = (themeClass) => {
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(themeClass);

        if (particlesInstance) {
            const isDark = themeClass === 'dark-theme';
            const newParticleColor = isDark ? '#e8c38e' : '#555555';
            particlesInstance.options.particles.color.value = newParticleColor;
            particlesInstance.options.particles.shadow.enable = isDark;
            particlesInstance.refresh();
        }
    };

    const setThemeState = (state) => {
        themeToggle.setAttribute('data-theme-state', state);
        themeToggle.setAttribute('title', `تغییر تم (حالت فعلی: ${THEME_TITLES[state]})`);

        const themeClass = (state === 'system') ? getSystemThemeClass() : `${state}-theme`;
        applyVisualTheme(themeClass);

        localStorage.setItem('themeState', state);
    };

    themeToggle.addEventListener('click', () => {
        const currentState = localStorage.getItem('themeState') || 'system';
        const currentIndex = THEME_STATES.indexOf(currentState);
        const nextState = THEME_STATES[(currentIndex + 1) % THEME_STATES.length];
        setThemeState(nextState);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('themeState') === 'system') {
            applyVisualTheme(getSystemThemeClass());
        }
    });

    // --- 3. راه‌اندازی انیمیشن ذرات ---
    tsParticles.load("particles-js", {
        background: { color: { value: 'transparent' } },
        particles: {
            number: { value: 150, density: { enable: true, value_area: 800 } },
            color: { value: "#e8c38e" },
            shape: { type: "circle" },
            opacity: { value: { min: 0.1, max: 0.5 }, animation: { enable: true, speed: 1.5, minimumValue: 0.1, sync: false } },
            size: { value: { min: 1, max: 2.5 } },
            move: { enable: true, speed: 0.3, direction: "none", random: true, straight: false, out_mode: "out" },
            shadow: { enable: true, color: "#e8c38e", blur: 10 }
        },
        interactivity: { events: { onhover: { enable: true, mode: "bubble" } }, modes: { bubble: { distance: 200, duration: 2, opacity: 1, size: 3 } } },
    }).then(container => {
        particlesInstance = container;
        const initialThemeState = localStorage.getItem('themeState') || 'system';
        setThemeState(initialThemeState);
    });

    // --- 4. بارگذاری داده‌های اولیه ---
    const loadInitialData = async () => {
        try {
            const [membersResponse, newsResponse, eventsResponse, journalResponse] = await Promise.all([
                fetch('members.json'),
                fetch('news.json'),
                fetch('events.json'),
                fetch('journal.json') // Fetch journal data
            ]);

            if (!membersResponse.ok) throw new Error('فایل اعضا یافت نشد.');
            const members = await membersResponse.json();
            members.forEach(member => membersMap.set(member.id, member));

            if (!newsResponse.ok) throw new Error('فایل اخبار یافت نشد.');
            allNews = await newsResponse.json();

            if (!eventsResponse.ok) throw new Error('فایل رویدادها یافت نشد.');
            allEvents = await eventsResponse.json();

            if (!journalResponse.ok) throw new Error('فایل نشریه یافت نشد.');
            allJournalIssues = await journalResponse.json();

        } catch (error) {
            console.error("Failed to load initial data:", error);
            mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا در بارگذاری اطلاعات اولیه. لطفا صفحه را رفرش کنید.</p></div>`;
        }
    };


    // --- 5. کنترل‌های رابط کاربری (منو و مودال) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    if (mobileMenuToggle && mobileDropdownMenu) {
        mobileMenuToggle.addEventListener('click', (e) => { e.stopPropagation(); mobileDropdownMenu.classList.toggle('is-open'); });
        document.addEventListener('click', (e) => {
            if (mobileDropdownMenu.classList.contains('is-open') && !mobileDropdownMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                mobileDropdownMenu.classList.remove('is-open');
            }
        });
    }

    const registerModal = document.getElementById('register-modal');
    const openRegisterBtn = document.getElementById('open-register-btn');
    if (registerModal && openRegisterBtn) {
        const closeRegisterBtn = registerModal.querySelector('.close-modal');
        const openModal = () => { body.classList.add('modal-is-open'); registerModal.classList.add('is-open'); };
        const closeModal = () => { body.classList.remove('modal-is-open'); registerModal.classList.remove('is-open'); };

        openRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
        closeRegisterBtn.addEventListener('click', closeModal);
        registerModal.addEventListener('click', (e) => { if (e.target === registerModal) closeModal(); });
    }

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    const closeGenericModalBtn = genericModal.querySelector('.close-modal');

    const showMemberModal = (memberId) => {
        const member = membersMap.get(parseInt(memberId, 10));
        if (!member) return;

        const template = document.getElementById('member-card-template');
        if (!template) return;

        const cardClone = template.content.cloneNode(true);
        cardClone.querySelector('.member-card').classList.add('in-modal');
        cardClone.querySelector('.member-photo').src = member.imageUrl; // || DEFAULT_AVATAR_URL
        cardClone.querySelector('.member-photo').alt = member.name;
        cardClone.querySelector('.member-name').textContent = member.name;
        cardClone.querySelector('.role').textContent = member.role; // || 'عضو انجمن'
        cardClone.querySelector('.description').textContent = member.description;

        const tagsContainer = cardClone.querySelector('.card-tags');
        tagsContainer.innerHTML = '';
        if (member.tags && Array.isArray(member.tags)) {
            member.tags.forEach(tagText => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tagText;
                tagsContainer.appendChild(tagElement);
            });
        }

        const socials = cardClone.querySelector('.card-socials');
        if (member.social) {
            const socialLinks = {
                linkedin: cardClone.querySelector('.social-linkedin'),
                telegram: cardClone.querySelector('.social-telegram'),
                github: cardClone.querySelector('.social-github')
            };
            let hasSocial = false;
            for (const key in socialLinks) {
                if (member.social[key] && socialLinks[key]) {
                    socialLinks[key].href = member.social[key];
                    socialLinks[key].style.display = 'inline-block';
                    hasSocial = true;
                }
            }
            if (!hasSocial) socials.style.display = 'none';
        } else {
            socials.style.display = 'none';
        }

        genericModal.classList.remove('wide-modal');
        genericModalContent.innerHTML = '';
        genericModalContent.appendChild(cardClone);

        body.classList.add('modal-is-open');
        genericModal.classList.add('is-open');
    };

    const showEventModal = async (path) => {
        const event = allEvents.find(e => e.detailPage === `#${path}`);
        if (!event) return;

        const slug = path.substring(8); // removes `/events/`
        const eventHtmlPath = `events/${slug}.html`;

        try {
            const response = await fetch(eventHtmlPath);
            if (!response.ok) throw new Error('فایل جزئیات رویداد یافت نشد.');
            const detailHtml = await response.text();

            const modalHtml = `
                <div class="content-box">
                    <div class="event-content-area">
                        <h1>${event.title}</h1>
                        <div class="event-modal-meta">
                             <span class="event-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                ${event.displayDate}
                            </span>
                            <span class="event-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                ${event.location}
                            </span>
                        </div>
                        <hr>
                        ${detailHtml}
                    </div>
                </div>
            `;
            genericModal.classList.add('wide-modal');
            genericModalContent.innerHTML = modalHtml;
            body.classList.add('modal-is-open');
            genericModal.classList.add('is-open');
        } catch (error) {
            console.error(error);
            genericModalContent.innerHTML = `<p>خطا در بارگذاری محتوا.</p>`;
        }
    };

    const closeGenericModal = () => {
        body.classList.remove('modal-is-open');
        genericModal.classList.remove('is-open');
    };

    closeGenericModalBtn.addEventListener('click', closeGenericModal);
    genericModal.addEventListener('click', (e) => { if (e.target === genericModal) closeGenericModal(); });

    mainContent.addEventListener('click', (e) => {
        const authorTrigger = e.target.closest('.clickable-author');
        if (authorTrigger && authorTrigger.dataset.authorId) {
            e.preventDefault();
            showMemberModal(authorTrigger.dataset.authorId);
            return;
        }

        const eventCard = e.target.closest('.event-card');
        if (eventCard) {
            const registrationLink = e.target.closest('a.btn-primary');
            if (!registrationLink) {
                e.preventDefault();
                const detailLink = eventCard.querySelector('a[href*="#/events/"]');
                if (detailLink && detailLink.href) {
                    const path = new URL(detailLink.href).hash.substring(1);
                    showEventModal(path);
                }
            }
        }
    });

    // --- 6. منطق ارسال فرم‌ها ---
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const statusMessage = registrationForm.querySelector('.form-status');
            const submitButton = registrationForm.querySelector('button[type="submit"]');
            const formspreeEndpoint = 'https://formspree.io/f/xeozaqap';

            if (statusMessage) { statusMessage.style.display = 'none'; statusMessage.className = 'form-status'; }
            submitButton.disabled = true;
            submitButton.textContent = 'در حال ارسال...';

            fetch(formspreeEndpoint, {
                method: 'POST',
                body: new FormData(registrationForm),
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    document.getElementById('form-content-wrapper').style.display = 'none';
                    document.getElementById('success-message').style.display = 'block';
                } else { throw new Error('Server error'); }
            }).catch(error => {
                if (statusMessage) {
                    statusMessage.textContent = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
                    statusMessage.className = 'form-status error';
                    statusMessage.style.display = 'block';
                }
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'ارسال درخواست';
            });
        });
    }

    const initializeContactForm = () => {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm || contactForm.dataset.listenerAttached) return;

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const statusBox = contactForm.querySelector('.form-status');
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const formspreeEndpoint = 'https://formspree.io/f/xgvzaead';

            if (statusBox) { statusBox.style.display = 'none'; statusBox.className = 'form-status'; }
            submitBtn.disabled = true;
            submitBtn.textContent = 'در حال ارسال...';

            fetch(formspreeEndpoint, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    if (statusBox) {
                        statusBox.textContent = 'پیام شما با موفقیت ارسال شد. ✅';
                        statusBox.className = 'form-status success';
                        statusBox.style.display = 'block';
                    }
                    contactForm.reset();
                } else { throw new Error('Server error'); }
            }).catch(error => {
                if (statusBox) {
                    statusBox.textContent = 'خطای شبکه. لطفاً اتصال خود را بررسی کنید.';
                    statusBox.className = 'form-status error';
                    statusBox.style.display = 'block';
                }
            }).finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'ارسال پیام';
            });
        });
        contactForm.dataset.listenerAttached = 'true';
    };

    // --- 7. منطق بارگذاری محتوای داینامیک ---
    const createAuthorHTML = (author) => {
        if (!author) return '';
        return `
            <div class="news-item-author clickable-author" data-author-id="${author.id}">
                <img src="${author.imageUrl}" alt="${author.name}" class="author-photo">

            </div>
        `;
    };

    const loadLatestNews = () => {
        const newsGrid = document.querySelector('.news-grid');
        if (!newsGrid) return;
        newsGrid.innerHTML = '';

        allNews.slice(0, 3).forEach(item => {
            const newsCardHTML = `
                <article class="news-card">
                    <a href="${item.link}" class="news-card-image-link">
                        <img src="${item.image}" alt="${item.title}">
                    </a>
                    <div class="news-card-content">
                        <a href="${item.link}"><h3>${item.title}</h3></a>
                        <p>${item.summary}</p>
                        <div class="news-card-footer">
                            ${createAuthorHTML(membersMap.get(item.authorId))}
                            <span class="news-meta">${item.date}</span>
                        </div>
                    </div>
                </article>
            `;
            newsGrid.insertAdjacentHTML('beforeend', newsCardHTML);
        });
    };

    const renderNewsItems = (items) => {
        const newsList = document.querySelector('.news-list');
        const template = document.getElementById('news-item-template');
        if (!newsList || !template) return;

        items.forEach(item => {
            const cardClone = template.content.cloneNode(true);
            const author = membersMap.get(item.authorId);

            cardClone.querySelector('.news-item-image').src = item.image;
            cardClone.querySelector('.news-item-image').alt = item.title;
            cardClone.querySelector('.news-item-image-link').href = item.link;
            cardClone.querySelector('.news-item-title').textContent = item.title;
            cardClone.querySelector('.news-item-title-link').href = item.link;
            cardClone.querySelector('.news-item-summary').textContent = item.summary;
            cardClone.querySelector('.news-item-date').textContent = item.date;

            const authorContainer = cardClone.querySelector('.news-item-author');
            authorContainer.innerHTML = createAuthorHTML(author);

            const tagsContainer = cardClone.querySelector('.news-item-tags');
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                item.tags.forEach(([text, color]) => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'news-tag';
                    tagEl.textContent = text;
                    tagEl.style.backgroundColor = color;
                    tagsContainer.appendChild(tagEl);
                });
            }

            newsList.appendChild(cardClone);
        });
    };

    const loadMoreNews = () => {
        if (isLoadingNews || (loadedNewsCount > 0 && loadedNewsCount >= allNews.length)) return;

        isLoadingNews = true;
        const loader = document.getElementById('news-loader');
        if (loader) loader.style.display = 'block';

        const newsToLoad = allNews.slice(loadedNewsCount, loadedNewsCount + NEWS_PER_PAGE);

        setTimeout(() => {
            renderNewsItems(newsToLoad);
            loadedNewsCount += newsToLoad.length;
            isLoadingNews = false;
            if (loader) loader.style.display = 'none';

            if (loadedNewsCount >= allNews.length) {
                if (newsScrollHandler) window.removeEventListener('scroll', newsScrollHandler);
                if (loader) loader.textContent = "پایان لیست اخبار";
            }
        }, 500);
    };

    const renderEventsPage = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = allEvents.filter(event => new Date(event.endDate) >= today)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const pastEvents = allEvents.filter(event => new Date(event.endDate) < today)
            .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

        const upcomingGrid = document.querySelector('#upcoming .events-grid');
        const pastGrid = document.querySelector('#past .events-grid');
        const template = document.getElementById('event-card-template');

        if (!upcomingGrid || !pastGrid || !template) return;

        const populateGrid = (grid, events) => {
            grid.innerHTML = '';
            if (events.length === 0) {
                grid.innerHTML = '<p class="no-events-message">در حال حاضر رویدادی در این دسته وجود ندارد.</p>';
                return;
            }
            events.forEach(event => {
                const card = template.content.cloneNode(true);

                card.querySelector('.event-card-image-link').href = event.detailPage;
                card.querySelector('.event-card-image').src = event.image;
                card.querySelector('.event-card-image').alt = event.title;

                const tagsContainer = card.querySelector('.event-card-tags');
                tagsContainer.innerHTML = '';
                event.tags.forEach(([text, color]) => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'news-tag';
                    tagEl.textContent = text;
                    tagEl.style.backgroundColor = color;
                    tagsContainer.appendChild(tagEl);
                });

                card.querySelector('.event-card-title-link').href = event.detailPage;
                card.querySelector('.event-card-title').textContent = event.title;
                card.querySelector('.event-card-summary').textContent = event.summary;

                const metaContainer = card.querySelector('.event-meta');
                metaContainer.innerHTML = `
                    <span class="event-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${event.displayDate}
                    </span>
                    <span class="event-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${event.location}
                    </span>
                `;

                const actionsContainer = card.querySelector('.event-actions');
                actionsContainer.innerHTML = '';
                let button;
                if (event.registrationLink) {
                    button = document.createElement('a');
                    button.href = event.registrationLink;
                    button.target = "_blank";
                    button.className = 'btn btn-primary';
                    if (new Date(event.endDate) < today) {
                        button.textContent = 'پایان یافته';
                        button.classList.add('disabled');
                    } else {
                        button.textContent = 'ثبت‌نام';
                    }
                } else {
                    button = document.createElement('a');
                    button.href = event.detailPage;
                    button.className = 'btn btn-secondary';
                    button.textContent = 'اطلاعات بیشتر';
                }
                actionsContainer.appendChild(button);

                grid.appendChild(card);
            });
        };

        populateGrid(upcomingGrid, upcomingEvents);
        populateGrid(pastGrid, pastEvents);

        document.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(tabId).classList.add('active');
                moveHighlighter(button);

            });
        });

        // *** بخش جدید: هایلایتر را در جایگاه اولیه قرار بده ***
        const initiallyActiveTab = document.querySelector('.tab-link.active');
        if (initiallyActiveTab) {
            // یک تأخیر کوتاه می‌دهیم تا مرورگر فرصت رندر کردن اولیه را داشته باشد
            setTimeout(() => {
                moveHighlighter(initiallyActiveTab);
            }, 100);
        }
    };

    const renderMembersPage = () => {
        const membersGrid = document.querySelector('.members-grid');
        const template = document.getElementById('member-card-template');

        if (!membersGrid || !template) return;
        membersGrid.innerHTML = '';

        membersMap.forEach(member => {
            const cardClone = template.content.cloneNode(true);
            cardClone.querySelector('.member-photo').src = member.imageUrl || DEFAULT_AVATAR_URL;
            cardClone.querySelector('.member-photo').alt = member.name;
            cardClone.querySelector('.member-name').textContent = member.name;
            cardClone.querySelector('.role').textContent = member.role || 'عضو انجمن';
            cardClone.querySelector('.description').textContent = member.description;

            const tagsContainer = cardClone.querySelector('.card-tags');
            tagsContainer.innerHTML = '';
            if (member.tags && Array.isArray(member.tags)) {
                member.tags.forEach(tagText => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = tagText;
                    tagsContainer.appendChild(tagElement);
                });
            }

            const socials = cardClone.querySelector('.card-socials');
            if (member.social) {
                const socialLinks = {
                    linkedin: cardClone.querySelector('.social-linkedin'),
                    telegram: cardClone.querySelector('.social-telegram'),
                    github: cardClone.querySelector('.social-github')
                };
                let hasSocial = false;
                for (const key in socialLinks) {
                    if (member.social[key] && socialLinks[key]) {
                        socialLinks[key].href = member.social[key];
                        socialLinks[key].style.display = 'inline-block';
                        hasSocial = true;
                    }
                }
                if (!hasSocial) socials.style.display = 'none';
            } else {
                socials.style.display = 'none';
            }

            membersGrid.appendChild(cardClone);
        });
    };

    const renderJournalPage = () => {
        const journalGrid = document.querySelector('.journal-grid');
        if (!journalGrid) return;
        journalGrid.innerHTML = '';

        allJournalIssues.forEach(issue => {
            const cardHTML = `
                <a href="${issue.fileUrl}" target="_blank" class="journal-card">
                    <img src="${issue.coverUrl}" alt="${issue.title}" class="journal-card-cover">
                    <div class="journal-card-overlay">
                        <h3 class="journal-card-title">${issue.title}</h3>
                        <p class="journal-card-date">${issue.date}</p>
                        <p class="journal-card-summary">${issue.summary}</p>
                    </div>
                    <div class="journal-card-download">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                </a>
            `;
            journalGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    };
    
    // --- تابع جدید برای آپدیت متا تگ‌ها ---
    const updateMetaTags = (title, description) => {
        document.title = title;
        document.querySelector('meta[name="description"]').setAttribute('content', description);
    };

    // --- 8. منطق مسیریابی SPA (مبتنی بر هش) ---
    const getCurrentPath = () => location.hash.substring(1) || '/';

    const updateActiveLink = (path) => {
        const currentBase = path.split('/')[1] || 'home';
        document.querySelectorAll('a[data-page]').forEach(link => {
            const linkBase = link.getAttribute('data-page');
            if (linkBase === currentBase) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        if (mobileDropdownMenu.classList.contains('is-open')) {
            mobileDropdownMenu.classList.remove('is-open');
        }
    };

    const cleanupPageSpecifics = (newPath) => {
        if (newsScrollHandler) {
            window.removeEventListener('scroll', newsScrollHandler);
            newsScrollHandler = null;
        }
        if (!newPath.startsWith('/news')) {
            loadedNewsCount = 0;
            isLoadingNews = false;
        }
    };

    const renderPage = async (path) => {
        cleanupPageSpecifics(path);
        updateActiveLink(path);
        window.scrollTo(0, 0);

        // --- مدیریت متاتگ‌ها ---
        let pageTitle = 'انجمن علمی علوم کامپیوتر | دانشگاه شهید چمران اهواز';
        let pageDescription = 'وب‌سایت رسمی انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز. آخرین اخبار، رویدادها، نشریات و اطلاعات انجمن را اینجا دنبال کنید.';

        const pageKeyForMeta = path.split('/')[1] || 'home';
        switch (pageKeyForMeta) {
            case 'home':
                pageTitle = 'انجمن علمی علوم کامپیوتر | صفحه اصلی';
                pageDescription = 'به وب‌سایت رسمی انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز خوش آمدید. از صفر تا یک، همراه با تکنولوژی.';
                break;
            case 'about':
                pageTitle = 'درباره ما | انجمن علمی علوم کامپیوتر';
                pageDescription = 'آشنایی با انجمن علمی دانشجویی علوم کامپیوتر دانشگاه شهید چمران اهواز، اهداف و فعالیت‌های ما.';
                break;
            case 'members':
                pageTitle = 'اعضای انجمن | انجمن علمی علوم کامپیوتر';
                pageDescription = 'با اعضای اصلی و فعال انجمن علمی علوم کامپیوتر دانشگاه شهید چمران اهواز آشنا شوید.';
                break;
            case 'news':
                pageTitle = 'اخبار و اطلاعیه‌ها | انجمن علمی علوم کامپیوتر';
                pageDescription = 'آرشیو آخرین اخبار، اطلاعیه‌ها و گزارش رویدادهای مربوط به انجمن علمی علوم کامپیوتر.';
                break;
            case 'events':
                pageTitle = 'رویدادها | انجمن علمی علوم کامپیوتر';
                pageDescription = 'از آخرین رویدادها، کارگاه‌ها، و مسابقات انجمن علمی مطلع شوید و در آن‌ها شرکت کنید.';
                break;
            case 'journal':
                pageTitle = 'نشریه علمی بایت | انجمن علمی علوم کامپیوتر';
                pageDescription = 'نشریه علمی بایت، فراتر از صفر و یک. محلی برای انتشار مقالات و دستاوردهای علمی دانشجویان.';
                break;
            case 'contact':
                pageTitle = 'تماس با ما | انجمن علمی علوم کامپیوتر';
                pageDescription = 'راه‌های ارتباطی با انجمن علمی علوم کامپیوتر. پیام‌ها، پیشنهادات و انتقادات خود را با ما در میان بگذارید.';
                break;
        }
        updateMetaTags(pageTitle, pageDescription);

        // --- [اصلاح شده] منطق رندر صفحه جزئیات اخبار ---
        if (path.startsWith('/news/')) {
            const newsItem = allNews.find(n => n.link === `#${path}`);

            if (!newsItem) {
                mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>محتوای خبر مورد نظر یافت نشد.</p><a href="#/news" class="btn btn-secondary" style="margin-top: 1rem;">بازگشت به آرشیو</a></div>`;
                return; // پایان اجرا چون محتوا یافت نشد
            }
            
            // آپدیت متا برای صفحه جزئیات خبر
            const newsTitle = `${newsItem.title} | اخبار انجمن`;
            const newsDescription = newsItem.summary;
            updateMetaTags(newsTitle, newsDescription);
            
            const slug = path.substring(6);
            const articlePath = `news/${slug}.html`;
            try {
                const response = await fetch(articlePath);
                if (!response.ok) throw new Error('فایل محتوای خبر یافت نشد.');
                const articleHTML = await response.text();
                const author = membersMap.get(newsItem.authorId);

                const authorProfileHTML = author ? `
                    <div class="news-detail-author clickable-author" data-author-id="${author.id}">
                        <img src="${author.imageUrl || DEFAULT_AVATAR_URL}" alt="${author.name}">
                        <div>
                            <strong>${author.name}</strong>
                            <span>${author.role || 'عضو انجمن'}</span>
                        </div>
                    </div>
                ` : '';

                mainContent.innerHTML = `
                    <section class="page-container news-detail-page">
                        <div class="container">
                            <a href="#/news" class="btn-back">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                <span>بازگشت به اخبار</span>
                            </a>
                            <div class="news-detail-meta-header">
                                ${authorProfileHTML}
                                <div class="news-item-meta">
                                    <span>${newsItem.date}</span>
                                    <span class="separator">&bull;</span>
                                    <span>${newsItem.readingTime}</span>
                                </div>
                            </div>
                            <div class="content-box">
                                ${articleHTML}
                            </div>
                        </div>
                    </section>
                `;
            } catch (error) {
                console.error(error);
                mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا در بارگذاری محتوای خبر: ${error.message}</p><a href="#/news" class="btn btn-secondary" style="margin-top: 1rem;">بازگشت به آرشیو</a></div>`;
            }
            return; // پایان اجرا پس از رندر صفحه خبر
        }

        // --- منطق رندر صفحات دیگر ---
        let pageKey = path || '/';
        if (pageKey === '/') {
            mainContent.innerHTML = initialContent;
        } else if (pageCache[pageKey]) {
            mainContent.innerHTML = pageCache[pageKey];
        } else {
            const validPages = ['about', 'contact', 'events', 'members', 'news', 'journal'];
            const pageName = pageKey.substring(1);
            if (validPages.includes(pageName)) {
                try {
                    const response = await fetch(`${pageName}.html`);
                    if (!response.ok) throw new Error(`صفحه ${pageName}.html یافت نشد.`);
                    const pageHTML = await response.text();
                    pageCache[pageKey] = pageHTML;
                    mainContent.innerHTML = pageHTML;
                } catch (error) {
                    console.error(error);
                    mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا: ${error.message}</p></div>`;
                    return;
                }
            } else {
                mainContent.innerHTML = initialContent;
                location.hash = '#/';
            }
        }

        // --- اجرای توابع مخصوص هر صفحه ---
        if (pageKey === '/') loadLatestNews();
        if (pageKey === '/contact') initializeContactForm();
        if (pageKey === '/events') renderEventsPage();
        if (pageKey === '/members') renderMembersPage();
        if (pageKey === '/journal') renderJournalPage();
        if (pageKey === '/news') {
            loadedNewsCount = 0;
            loadMoreNews();
            newsScrollHandler = () => {
                if (isLoadingNews || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 200) return;
                loadMoreNews();
            };
            window.addEventListener('scroll', newsScrollHandler);
        }
    };

    // --- 9. راه‌اندازی اولیه و شنوندگان رویداد ---
    const initializeApp = async () => {
        await loadInitialData();
        window.addEventListener('hashchange', () => renderPage(getCurrentPath()));
        renderPage(getCurrentPath());
    };

    initializeApp();
});


// این کد بعد از بارگذاری کامل تمام منابع صفحه (عکس‌ها، اسکریپت‌ها و...) اجرا می‌شود
window.addEventListener('load', () => {
    // یک تگ link برای بارگذاری استایل‌شیت فونت ایجاد می‌کنیم
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';

    // زمانی که فایل CSS فونت با موفقیت دانلود شد، این تابع اجرا می‌شود
    fontLink.onload = () => {
        // کلاس fonts-loaded به تگ <html> اضافه می‌شود تا فونت جدید اعمال شود
        document.documentElement.classList.add('fonts-loaded');
        console.log('Custom font applied.');
    };

    // تگ link را به <head> سند اضافه می‌کنیم تا دانلود شروع شود
    document.head.appendChild(fontLink);
});
// تابع جدید برای حرکت دادن هایلایتر
const moveHighlighter = (activeTab) => {
    const highlighter = document.querySelector('.tabs-container .highlighter');
    if (!highlighter || !activeTab) return;

    // عرض هایلایتر را برابر با عرض تب فعال قرار می‌دهیم
    highlighter.style.width = `${activeTab.offsetWidth}px`;
    
    // هایلایتر را در راستای محور X به زیر تب فعال منتقل می‌کنیم
    highlighter.style.transform = `translateX(${activeTab.offsetLeft}px)`;
};