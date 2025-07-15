// --- ساختار یکپارچه و نهایی اسکریپت ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. متغیرهای عمومی و اولیه ---
    const body = document.body;
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const initialContent = mainContent.innerHTML;
    const pageCache = { '/': initialContent };
    let particlesInstance = null;

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
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => applyTheme(e.matches ? 'dark-theme' : 'light-theme'));

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
        applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme');
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
                    submitButton.textContent = 'ارسال شد';
                } else { throw new Error('Server error'); }
            }).catch(error => {
                if (statusMessage) {
                    statusMessage.textContent = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
                    statusMessage.className = 'form-status error';
                    statusMessage.style.display = 'block';
                }
                submitButton.disabled = false;
                submitButton.textContent = 'ارسال درخواست';
            });
        });
    }

    const initializeContactForm = () => {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm || contactForm.dataset.listenerAttached) return;

        const statusBox = contactForm.querySelector('.form-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const formspreeEndpoint = 'https://formspree.io/f/xjkovbqp';

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
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
                    submitBtn.textContent = 'ارسال شد';
                } else { throw new Error('Server error'); }
            }).catch(error => {
                if (statusBox) {
                    statusBox.textContent = 'خطای شبکه. لطفاً اتصال خود را بررسی کنید.';
                    statusBox.className = 'form-status error';
                    statusBox.style.display = 'block';
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'ارسال پیام';
            });
        });
        contactForm.dataset.listenerAttached = 'true';
    };

    // --- 6. منطق مسیریابی SPA ---
    const updateActiveLink = (path) => {
        document.querySelectorAll('a[data-page]').forEach(link => {
            const linkPath = link.getAttribute('href');
            if (linkPath === path || (path === '/' && linkPath === '/index.html')) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    };

    const renderPage = async (path) => {
        updateActiveLink(path);
        if (pageCache[path]) {
            mainContent.innerHTML = pageCache[path];
            if (path === '/contact') initializeContactForm();
            return;
        }

        try {
            let pageHTML;
            if (path === '/members') {
                const response = await fetch('members.json');
                if (!response.ok) throw new Error('فایل اطلاعات اعضا یافت نشد.');
                const members = await response.json();
                let membersGridHTML = '<div class="members-grid">';
                members.forEach(member => {
                    membersGridHTML += `
                        <div class="member-card">
                            <img src="${member.imageUrl}" alt="${member.name}" class="member-photo">
                            <div class="card-header"><h3>${member.name}</h3><p class="role">${member.role}</p></div>
                            <p class="description">${member.description}</p>
                            <div class="card-tags"><span class="tag entry-year">ورودی ${member.entryYear}</span></div>
                            <div class="card-socials">
                                <a href="${member.social.linkedin}" target="_blank" title="LinkedIn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
                                <a href="${member.social.telegram}" target="_blank" title="Telegram"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 L11 13 L2 9 L22 2 Z M22 2 L15 22 L11 13 L2 9 L22 2 Z"></path></svg></a>
                            </div>
                        </div>`;
                });
                membersGridHTML += '</div>';
                pageHTML = `<section class="members-container"><div class="container"><h1>اعضای انجمن</h1>${membersGridHTML}</div></section>`;
            } else if (path === '/about' || path === '/contact') {
                const response = await fetch(path.substring(1) + '.html');
                if (!response.ok) throw new Error(`محتوای صفحه یافت نشد.`);
                pageHTML = await response.text();
                if (path === '/contact') { setTimeout(initializeContactForm, 0); }
            } else {
                pageHTML = initialContent;
            }
            pageCache[path] = pageHTML;
            mainContent.innerHTML = pageHTML;

        } catch (error) {
            mainContent.innerHTML = `<p style="text-align: center;">خطا: ${error.message}</p>`;
        }
    };
    
    const navigate = (path, doPushState = true) => {
        if (doPushState) {
            history.pushState({ path }, '', path);
        }
        renderPage(path);
    };

    document.body.addEventListener('click', e => {
        const link = e.target.closest('a[data-page]');
        if (link) {
            e.preventDefault();
            navigate(link.getAttribute('href'));
        }
    });

    window.addEventListener('popstate', e => {
        navigate(e.state ? e.state.path : '/', false);
    });
    
    // --- 7. مدیریت بارگذاری اولیه صفحه ---
    const getInitialPath = () => {
        const redirectedPath = sessionStorage.getItem('redirect');
        if (redirectedPath) {
            sessionStorage.removeItem('redirect');
            const url = new URL(redirectedPath);
            const repoName = location.pathname.split('/')[1];
            // مسیر را نسبت به ریشه ریپازیتوری استخراج می‌کند
            const relativePath = url.pathname.startsWith(`/${repoName}`) ? url.pathname.substring(repoName.length + 1) : url.pathname;
            history.replaceState({ path: relativePath }, '', relativePath);
            return relativePath || '/';
        }
        const repoName = location.pathname.split('/')[1];
        const relativePath = location.pathname.startsWith(`/${repoName}`) ? location.pathname.substring(repoName.length + 1) : location.pathname;
        return relativePath || '/';
    };
    
    navigate(getInitialPath(), false);
});