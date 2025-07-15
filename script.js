document.addEventListener('DOMContentLoaded', () => {

    // --- 1. متغیرهای عمومی و اولیه ---
    const body = document.body;
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const initialContent = mainContent.innerHTML;
    const pageCache = { '/': initialContent };
    let particlesInstance = null;
    
    const currentYearSpan = document.getElementById('current-year');
    if(currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- 2. کنترل تم ---
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(theme);
        if (particlesInstance) {
            const newParticleColor = theme === 'dark-theme' ? '#e8c38e' : '#555555';
            particlesInstance.options.particles.color.value = newParticleColor;
            particlesInstance.options.particles.shadow.enable = theme === 'dark-theme';
            particlesInstance.refresh();
        }
    };
    themeToggle.addEventListener('click', () => applyTheme(body.classList.contains('dark-theme') ? 'light-theme' : 'dark-theme'));
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(preferredTheme.matches ? 'dark-theme' : 'light-theme');
    preferredTheme.addEventListener('change', e => applyTheme(e.matches ? 'dark-theme' : 'light-theme'));

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
        applyTheme(preferredTheme.matches ? 'dark-theme' : 'light-theme');
    });
    
    // --- 4. کنترل‌های رابط کاربری (منو و مودال) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    const registerModal = document.getElementById('register-modal');
    const openRegisterBtn = document.getElementById('open-register-btn');

    if (mobileMenuToggle && mobileDropdownMenu) {
        mobileMenuToggle.addEventListener('click', (e) => { e.stopPropagation(); mobileDropdownMenu.classList.toggle('is-open'); });
        document.addEventListener('click', (e) => {
            if (mobileDropdownMenu.classList.contains('is-open') && !mobileDropdownMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                mobileDropdownMenu.classList.remove('is-open');
            }
        });
    }

    if (registerModal && openRegisterBtn) {
        const closeRegisterBtn = registerModal.querySelector('.close-modal');
        const openModal = () => { body.classList.add('modal-is-open'); registerModal.classList.add('is-open'); };
        const closeModal = () => { body.classList.remove('modal-is-open'); registerModal.classList.remove('is-open'); };
        
        openRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
        closeRegisterBtn.addEventListener('click', closeModal);
        registerModal.addEventListener('click', (e) => { if (e.target === registerModal) closeModal(); });
    }

    // --- 5. منطق ارسال فرم‌ها ---
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const statusMessage = registrationForm.querySelector('.form-status');
            const submitButton = registrationForm.querySelector('button[type="submit"]');
            const formspreeEndpoint = 'https://formspree.io/f/xblkjrva';

            if (statusMessage) { statusMessage.style.display = 'none'; statusMessage.className = 'form-status'; }
            submitButton.disabled = true;
            submitButton.textContent = 'در حال ارسال...';
            
            fetch(formspreeEndpoint, {
                method: 'POST',
                body: new FormData(registrationForm),
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    if (statusMessage) {
                        statusMessage.textContent = 'درخواست شما با موفقیت ثبت شد! به زودی با شما تماس میگیریم. 👾';
                        statusMessage.className = 'form-status success';
                        statusMessage.style.display = 'block';
                    }
                    registrationForm.reset();
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
            const formspreeEndpoint = 'https://formspree.io/f/xjkovbqp';
            
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

    // --- 6. منطق بارگذاری محتوای داینامیک ---
    const loadLatestNews = async () => {
        const newsGrid = document.querySelector('.news-grid');
        if (!newsGrid) return;

        try {
            const response = await fetch('news.json');
            if (!response.ok) throw new Error('فایل اخبار یافت نشد.');
            const newsItems = await response.json();
            
            newsGrid.innerHTML = ''; 
            
            newsItems.slice(0, 3).forEach(item => {
                const newsCardHTML = `
                    <article class="news-card">
                        <img src="${item.image}" alt="تصویر خبر: ${item.title}">
                        <div class="news-card-content">
                            <h3>${item.title}</h3>
                            <p class="news-meta">منتشر شده در تاریخ ${item.date}</p>
                            <p>${item.summary}</p>
                            <a href="${item.link}">اطلاعات بیشتر &larr;</a>
                        </div>
                    </article>
                `;
                newsGrid.insertAdjacentHTML('beforeend', newsCardHTML);
            });

        } catch (error) {
            newsGrid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1;">${error.message}</p>`;
        }
    };


    // --- 7. منطق مسیریابی SPA (مبتنی بر هش) ---
    const getCurrentPath = () => location.hash.substring(1) || '/';

    const updateActiveLink = (path) => {
        document.querySelectorAll('a[data-page]').forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref === `#${path}` || (path === '/' && linkHref === '#/')) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
        if (mobileDropdownMenu.classList.contains('is-open')) {
            mobileDropdownMenu.classList.remove('is-open');
        }
    };

    const renderPage = async (path) => {
        updateActiveLink(path);

        if (path === '/') {
            mainContent.innerHTML = pageCache['/'];
            loadLatestNews();
            window.scrollTo(0, 0);
            return;
        }

        if (pageCache[path]) {
            mainContent.innerHTML = pageCache[path];
            if (path === '/contact') initializeContactForm();
            window.scrollTo(0, 0);
            return;
        }

        try {
            let pageHTML;
            if (path === '/members') {
                const response = await fetch('members.json');
                if (!response.ok) throw new Error('فایل اطلاعات اعضا یافت نشد.');
                const members = await response.json();

                const template = document.getElementById('member-card-template');
                if (!template) throw new Error('قالب کارت اعضا یافت نشد.');

                // URL تصویر پیش‌فرض برای کاربرانی که تصویر ندارند
                const DEFAULT_AVATAR_URL = 'https://icons.veryicon.com/png/o/miscellaneous/rookie-official-icon-gallery/225-default-avatar.png';

                const fragment = document.createDocumentFragment();
                members.forEach(member => {
                    const cardClone = template.content.cloneNode(true);
                    
                    // بررسی وجود تصویر و استفاده از تصویر پیش‌فرض در صورت نیاز
                    cardClone.querySelector('.member-photo').src = member.imageUrl || DEFAULT_AVATAR_URL;
                    cardClone.querySelector('.member-photo').alt = member.name;
                    cardClone.querySelector('.member-name').textContent = member.name;
                    cardClone.querySelector('.description').textContent = member.description;
                    
                    const tagsContainer = cardClone.querySelector('.card-tags');
                    if (member.tags && Array.isArray(member.tags)) {
                        member.tags.forEach(tagText => {
                            const tagElement = document.createElement('span');
                            tagElement.className = 'tag';
                            tagElement.textContent = tagText;
                            tagsContainer.appendChild(tagElement);
                        });
                    }
                    
                    if (member.social) {
                        const socialLinks = {
                            linkedin: cardClone.querySelector('.social-linkedin'),
                            telegram: cardClone.querySelector('.social-telegram'),
                            github: cardClone.querySelector('.social-github')
                        };

                        for (const key in socialLinks) {
                            if (member.social[key]) {
                                socialLinks[key].href = member.social[key];
                                socialLinks[key].style.display = 'inline-block';
                            }
                        }
                    }
                    
                    fragment.appendChild(cardClone);
                });
                
                const membersGrid = document.createElement('div');
                membersGrid.className = 'members-grid';
                membersGrid.appendChild(fragment);

                pageHTML = `<section class="members-container"><div class="container"><h1>اعضای انجمن</h1>${membersGrid.outerHTML}</div></section>`;
            
            
            } else if (path === '/about' || path === '/contact') {
                const response = await fetch(path.substring(1) + '.html');
                if (!response.ok) throw new Error(`محتوای صفحه یافت نشد.`);
                pageHTML = await response.text();
            } else {
                mainContent.innerHTML = pageCache['/'];
                loadLatestNews();
                return;
            }
            pageCache[path] = pageHTML;
            mainContent.innerHTML = pageHTML;
            if (path === '/contact') initializeContactForm();
            window.scrollTo(0, 0);

        } catch (error) {
            mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا: ${error.message}</p></div>`;
        }
    };
    
    // --- 8. راه‌اندازی اولیه و شنوندگان رویداد ---
    
    renderPage(getCurrentPath());
    window.addEventListener('hashchange', () => renderPage(getCurrentPath()));
});