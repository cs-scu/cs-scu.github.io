// js/main.js
import { state, dom } from './modules/state.js';
import { loadMembers, getSession, onAuthStateChange, signOut, getProfile , loadTags ,getUserRegistrations} from './modules/api.js';
import { initializeTheme } from './modules/theme.js';
import { initializeGlobalUI, updateUserUI } from './modules/ui.js';
import { initializeRouter } from './modules/router.js';

document.addEventListener('DOMContentLoaded', () => {

    const preloader = document.getElementById('preloader');
    document.body.classList.add('preloader-active');

    const initializeParticles = () => {
        if (typeof tsParticles === 'undefined') return;

        const isDark = document.body.classList.contains('dark-theme');
        const particleColor = isDark ? '#e8c38e' : '#555555';
        const shadowEnabled = isDark;

        tsParticles.load("particles-js", {
            background: { color: { value: 'transparent' } },
            particles: {
                number: { value: 80, density: { enable: true, value_area: 850 } },
                color: { value: particleColor },
                shape: { type: "circle" },
                opacity: { value: { min: 0.1, max: 0.5 }, animation: { enable: true, speed: 1.5, minimumValue: 0.1, sync: false } },
                size: { value: { min: 1, max: 2 } },
                move: { enable: true, speed: 0.5, direction: "none", random: true, straight: false, out_mode: "out" },
                shadow: { enable: shadowEnabled, color: "#e8c38e", blur: 7 }
            },
            interactivity: { events: { onhover: { enable: true, mode: "bubble" } }, modes: { bubble: { distance: 200, duration: 2, opacity: 1, size: 3 } } },
        }).then(container => {
            state.particlesInstance = container;
            const particlesElement = document.getElementById('particles-js');
            if (particlesElement) {
                particlesElement.style.opacity = '1';
            }
        });
    };

    const setInitialState = () => {
        if (!dom.mainContent) return;
        state.pageCache['/'] = dom.mainContent.innerHTML;
        
        const currentYearSpan = document.getElementById('current-year');
        if (currentYearSpan) {
            const now = new Date();
            const persianYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(now);
            currentYearSpan.textContent = persianYear;
        }
    }

    const initializeApp = async () => {
        setInitialState();
        initializeTheme();
        initializeParticles();
        initializeGlobalUI();
        
        document.getElementById('logout-btn')?.addEventListener('click', signOut);

        const handleAuthChange = async (user) => {
            let profile = null;
            if (user) {
                profile = await getProfile();
                // START: بخش جدید برای بارگذاری ثبت‌نام‌ها
                const registrations = await getUserRegistrations(user.id);
                state.userRegistrations.clear();
                registrations.forEach(reg => {
                    state.userRegistrations.set(reg.event_id, reg.status);
                });
                // END: پایان بخش جدید
            } else {
                // اگر کاربر خارج شد، اطلاعات ثبت‌نام او را پاک می‌کنیم
                state.userRegistrations.clear();
            }
            updateUserUI(user, profile); 
        };

        await getSession();
        await handleAuthChange(state.user); 
        onAuthStateChange(handleAuthChange);

        await loadMembers(); 
        await loadTags(); // <-- این خط اضافه شود
        initializeRouter();

        if (preloader) {
            preloader.classList.add('hidden');
            setTimeout(() => {
                document.body.classList.remove('preloader-active');
            }, 200); 
        }
    };

    initializeApp();
});