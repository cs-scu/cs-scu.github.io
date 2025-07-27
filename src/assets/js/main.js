// js/main.js
import { state, dom } from './modules/state.js';
import { loadInitialData } from './modules/api.js';
import { initializeTheme } from './modules/theme.js';
import { initializeGlobalUI } from './modules/ui.js';
import { initializeRouter } from './modules/router.js';

document.addEventListener('DOMContentLoaded', () => {

    const preloader = document.getElementById('preloader'); // دریافت عنصر پیش‌بارگذار
    document.body.classList.add('preloader-active');

    const initializeParticles = () => {
        if (typeof tsParticles === 'undefined') return;
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
            state.particlesInstance = container;
            initializeTheme(); // Initialize theme after particles are loaded to set initial color
        });
    };

    const initializeFonts = () => {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap';
        fontLink.rel = 'stylesheet';
        fontLink.onload = () => {
            document.documentElement.classList.add('fonts-loaded');
        };
        document.head.appendChild(fontLink);
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
        initializeParticles();
        initializeGlobalUI();

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const testDelay = delay(3000); // 3000 میلی‌ثانیه = 3 ثانیه


        await Promise.all([
            loadInitialData(),
            testDelay
        ]);
        // await loadInitialData();

        initializeRouter();

        if (preloader) {
            preloader.classList.add('hidden');
            // با کمی تاخیر کلاس را حذف می‌کنیم تا انیمیشن محو شدن تمام شود
            setTimeout(() => {
                document.body.classList.remove('preloader-active');
            }, 700); // این زمان باید با زمان transition در CSS برابر باشد
        }
    };

    initializeApp();
    window.addEventListener('load', initializeFonts);
});