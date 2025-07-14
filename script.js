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

// --- ارسال فرم ثبت نام با AJAX و بازخورد کامل به کاربر ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    if (!form) return;

    const statusMessage = document.getElementById('form-status-message');
    const submitButton = form.querySelector('button[type="submit"]');
    // دیگر نیازی به این دو متغیر نیست چون فرم را مخفی نمی‌کنیم
    // const successMessage = document.getElementById('success-message');
    // const formContentWrapper = document.getElementById('form-content-wrapper');
    const formspreeEndpoint = 'https://formsubmit.co/pejmansadrin@gmail.com'; // URL خود را اینجا قرار دهید

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        statusMessage.style.display = 'none';
        submitButton.disabled = true;
        submitButton.textContent = 'در حال ارسال...';

        const formData = new FormData(form);

        fetch(formspreeEndpoint, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                // در صورت موفقیت، پیام را در کادر وضعیت نمایش می‌دهیم
                statusMessage.textContent = 'درخواست شما با موفقیت ثبت شد و به زودی با شما تماس میگیریم!👾';
                statusMessage.className = 'success'; // اعمال استایل موفقیت
                statusMessage.style.display = 'block';
                
                form.reset(); // خالی کردن فیلدهای فرم
                submitButton.textContent = 'ارسال شد'; // تغییر متن دکمه به حالت نهایی
                // دکمه غیرفعال باقی می‌ماند تا از ارسال مجدد جلوگیری شود
            } else {
                // در صورت بروز خطای سمت سرور
                statusMessage.textContent = 'خطایی در سرور رخ داد. لطفاً دوباره تلاش کنید.';
                statusMessage.className = 'error';
                statusMessage.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = 'ارسال درخواست';
            }
        }).catch(error => {
            // در صورت بروز خطای شبکه
            statusMessage.textContent = 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.';
            statusMessage.className = 'error';
            statusMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'ارسال درخواست';
        });
    });
});