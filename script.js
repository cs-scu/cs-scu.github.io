// --- کنترل انیمیشن ذرات ---
let particlesInstance = null;
const particleOptions = {
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
    interactivity: {
        detect_on: "window",
        events: { onhover: { enable: true, mode: "bubble" }, onclick: { enable: false }, resize: true },
        modes: { bubble: { distance: 200, duration: 2, opacity: 1, size: 3, color: "#ffffff" } }
    },
    retina_detect: true
};
tsParticles.load("particles-js", particleOptions).then(container => {
    particlesInstance = container;
    // تم اولیه را پس از بارگذاری انیمیشن اعمال می‌کنیم
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark-theme' : 'light-theme');
});


// --- کنترل تم ---
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

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

// گوش دادن به تغییرات تم دستگاه
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newTheme = event.matches ? 'dark-theme' : 'light-theme';
    applyTheme(newTheme);
});

// عملکرد دکمه تغییر تم دستی
themeToggle.addEventListener('click', () => {
    const currentTheme = body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
    const newTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
    applyTheme(newTheme);
});


// --- کنترل منوی بازشونده موبایل ---
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');

    if (mobileMenuToggle && mobileDropdownMenu) {
        mobileMenuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            mobileDropdownMenu.classList.toggle('is-open');
        });

        // بستن منو با کلیک بیرون از آن
        document.addEventListener('click', (event) => {
            if (mobileDropdownMenu.classList.contains('is-open') && !mobileDropdownMenu.contains(event.target)) {
                mobileDropdownMenu.classList.remove('is-open');
            }
        });
    }
});

// --- کنترل Modal ثبت نام ---
document.addEventListener('DOMContentLoaded', () => {
    const registerModal = document.getElementById('register-modal');
    const openModalBtn = document.getElementById('open-register-btn');
    const closeModalBtn = registerModal.querySelector('.close-modal');

    const openModal = () => {
        document.body.classList.add('modal-is-open');
        registerModal.classList.add('is-open');
    };

    const closeModal = () => {
        document.body.classList.remove('modal-is-open');
        registerModal.classList.remove('is-open');
    };

    if (openModalBtn) {
        openModalBtn.addEventListener('click', (event) => {
            event.preventDefault();
            openModal();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    registerModal.addEventListener('click', (event) => {
        if (event.target === registerModal) {
            closeModal();
        }
    });
});

// --- منطق پیشرفته فرم ثبت نام ---
document.addEventListener('DOMContentLoaded', () => {
});

// --- ارسال فرم ثبت نام با AJAX و بازخورد کامل به کاربر (نسخه نهایی) ---
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');
    if (!registrationForm) return;

    // مهم: از کلاس برای پیدا کردن عنصر استفاده می‌شود
    const statusMessage = registrationForm.querySelector('.form-status'); 
    const submitButton = registrationForm.querySelector('button[type="submit"]');
    const formspreeEndpoint = 'https://formspree.io/f/xblkjrva'; // یا آدرس Formspree خودتان

    registrationForm.addEventListener('submit', function(event) {
        event.preventDefault();

        if (statusMessage) {
            statusMessage.style.display = 'none';
            statusMessage.className = 'form-status'; // ریست کردن کلاس
        }
        submitButton.disabled = true;
        submitButton.textContent = 'در حال ارسال...';

        const formData = new FormData(registrationForm);

        fetch(formspreeEndpoint, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        })
        .then(response => {
            if (response.ok) {
                if (statusMessage) {
                    statusMessage.textContent = 'درخواست شما با موفقیت ثبت شد! به زودی با شما تماس میگیریم. 👾';
                    statusMessage.classList.add('success');
                    statusMessage.style.display = 'block';
                }
                registrationForm.reset(); 
                submitButton.textContent = 'ارسال شد';
            } else {
                if (statusMessage) {
                    statusMessage.textContent = 'خطایی در سرور رخ داد. لطفاً دوباره تلاش کنید.';
                    statusMessage.classList.add('error');
                    statusMessage.style.display = 'block';
                }
                submitButton.disabled = false;
                submitButton.textContent = 'ارسال درخواست';
            }
        })
        .catch(error => {
            if (statusMessage) {
                statusMessage.textContent = 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.';
                statusMessage.classList.add('error');
                statusMessage.style.display = 'block';
            }
            submitButton.disabled = false;
            submitButton.textContent = 'ارسال درخواست';
        });
    });
});

// --- منطق کامل و نهایی SPA (نسخه بازسازی شده) ---
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const navLinks = document.querySelectorAll('a[data-page]');
    const initialContent = mainContent.innerHTML;
    const pageCache = { '/': initialContent };

    const updateActiveLink = (path) => {
        navLinks.forEach(link => {
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === path) {
                link.setAttribute('aria-current', 'page');
            }
        });
    };

    const initializeContactForm = () => {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm || contactForm.dataset.listenerAttached) return;

        const statusBox = contactForm.querySelector('.form-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const formspreeEndpoint = 'https://formspree.io/f/xjkovbqp'; // آدرس فرم تماس شما

        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            statusBox.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'در حال ارسال...';
            
            fetch(formspreeEndpoint, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            })
            .then(response => {
                if (response.ok) {
                    statusBox.textContent = 'پیام شما با موفقیت ارسال شد. ✅';
                    statusBox.className = 'form-status success';
                    contactForm.reset();
                    submitBtn.textContent = 'ارسال شد';
                } else {
                    statusBox.textContent = 'خطایی در ارسال رخ داد. لطفاً دوباره تلاش کنید.';
                    statusBox.className = 'form-status error';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'ارسال پیام';
                }
                statusBox.style.display = 'block';
            })
            .catch(error => {
                statusBox.textContent = 'خطای شبکه. لطفاً اتصال خود را بررسی کنید.';
                statusBox.className = 'form-status error';
                submitBtn.disabled = false;
                submitBtn.textContent = 'ارسال پیام';
            });
        });
        contactForm.dataset.listenerAttached = 'true';
    };

    const renderPage = async (path) => {
        updateActiveLink(path);

        if (pageCache[path]) {
            mainContent.innerHTML = pageCache[path];
            if (path === '/contact') initializeContactForm();
            return;
        }

        try {
            if (path === '/members') {
                const response = await fetch('/members.json');
                if (!response.ok) throw new Error('فایل اطلاعات اعضا یافت نشد.');
                const members = await response.json();
                
                let membersHTML = '<div class="members-grid">';
                members.forEach(member => {
                    // **بخش تکمیل شده برای ساخت کارت اعضا**
                    membersHTML += `
                        <div class="member-card">
                            <img src="${member.imageUrl}" alt="تصویر ${member.name}" class="member-photo">
                            <div class="card-header"><h3>${member.name}</h3><p class="role">${member.role}</p></div>
                            <p class="description">${member.description}</p>
                            <div class="card-tags">
                                <span class="tag entry-year">ورودی ${member.entryYear}</span>
                                ${member.role.includes('فرعی') ? `<span class="tag major">${member.major}</span>` : ''}
                            </div>
                            <div class="card-socials">
                                <a href="${member.social.linkedin}" target="_blank" title="لینکدین"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
                                <a href="${member.social.telegram}" target="_blank" title="تلگرام"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 L11 13 L2 9 L22 2 Z M22 2 L15 22 L11 13 L2 9 L22 2 Z"></path></svg></a>
                            </div>
                        </div>`;
                });
                membersHTML += '</div>';

                const pageHTML = `<section class="members-container"><div class="container"><h1>اعضای انجمن</h1>${membersHTML}</div></section>`;
                pageCache[path] = pageHTML;
                mainContent.innerHTML = pageHTML;

            } else if (path === '/about' || path === '/contact') {
                const response = await fetch(path.substring(1) + '.html');
                if (!response.ok) throw new Error(`محتوای صفحه ${path} یافت نشد.`);
                const pageHTML = await response.text();
                pageCache[path] = pageHTML;
                mainContent.innerHTML = pageHTML;
                if (path === '/contact') initializeContactForm();
            } else {
                mainContent.innerHTML = initialContent;
            }
        } catch (error) {
            mainContent.innerHTML = `<p style="text-align: center;">خطا: ${error.message}</p>`;
        }
    };

    const navigate = (path, doPushState = true) => {
        if (doPushState) {
            window.history.pushState({ path }, '', path);
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
        const path = (e.state && e.state.path) ? e.state.path : '/';
        navigate(path, false);
    });

    // --- مدیریت نهایی بارگذاری اولیه صفحه ---
    const getRelativePath = () => {
        const fullPath = window.location.pathname;
        const repoName = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? '' : fullPath.split('/')[1];
        return repoName ? fullPath.replace(`/${repoName}`, '') : fullPath;
    };
    
    const redirectedUrlString = sessionStorage.getItem('redirect');
    if (redirectedUrlString) {
        sessionStorage.removeItem('redirect');
        const redirectedUrl = new URL(redirectedUrlString);
        const path = redirectedUrl.pathname;
        history.replaceState({ path }, '', path);
        renderPage(path);
    } else {
        renderPage(getRelativePath());
    }
});

/**
     * منطق ارسال فرم تماس با ما
     */
    const initializeContactForm = () => {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        const statusBox = contactForm.querySelector('.form-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const formspreeEndpoint = 'https://formspree.io/f/xjkovbqp'; // ایمیل یا کد فرم تماس خود را اینجا قرار دهید

        // اگر قبلاً شنونده‌ای اضافه شده، از افزودن مجدد جلوگیری می‌کنیم
        if (contactForm.dataset.listenerAttached) return;

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (statusBox) {
                statusBox.style.display = 'none';
                statusBox.className = 'form-status';
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'در حال ارسال...';
            
            const formData = new FormData(contactForm);

            fetch(formspreeEndpoint, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            })
            .then(response => {
                if(response.ok) {
                    if (statusBox) {
                        statusBox.textContent = 'پیام شما با موفقیت ارسال شد. ✅';
                        statusBox.classList.add('success');
                        statusBox.style.display = 'block';
                    }
                    contactForm.reset();
                    submitBtn.textContent = 'ارسال شد';
                } else {
                    if (statusBox) {
                        statusBox.textContent = 'خطایی در ارسال رخ داد. لطفاً دوباره تلاش کنید.';
                        statusBox.classList.add('error');
                        statusBox.style.display = 'block';
                    }
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'ارسال پیام';
                }
            })
            .catch(error => {
                if (statusBox) {
                    statusBox.textContent = 'خطای شبکه. لطفاً اتصال خود را بررسی کنید.';
                    statusBox.classList.add('error');
                    statusBox.style.display = 'block';
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'ارسال پیام';
            });
        });
        
        // نشانه‌گذاری برای جلوگیری از افزودن شنونده‌های تکراری
        contactForm.dataset.listenerAttached = 'true';
    };