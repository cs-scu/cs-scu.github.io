// js/modules/theme.js
import { state, dom } from './state.js';

const themeToggle = document.getElementById('theme-toggle');
const THEME_STATES = ['system', 'light', 'dark'];
const THEME_TITLES = { system: 'سیستم', light: 'روشن', dark: 'تیره' };

const getSystemThemeClass = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';

const applyVisualTheme = (themeClass) => {
    dom.body.classList.remove('light-theme', 'dark-theme');
    dom.body.classList.add(themeClass);

    if (state.particlesInstance) {
        const isDark = themeClass === 'dark-theme';
        const newParticleColor = isDark ? '#e8c38e' : '#555555';
        state.particlesInstance.options.particles.color.value = newParticleColor;
        state.particlesInstance.options.particles.shadow.enable = isDark;
        state.particlesInstance.refresh();
    }
};

const setThemeState = (themeState) => {
    if (!themeToggle) return;
    themeToggle.setAttribute('data-theme-state', themeState);
    themeToggle.setAttribute('title', `تغییر تم (حالت فعلی: ${THEME_TITLES[themeState]})`);

    const themeClass = (themeState === 'system') ? getSystemThemeClass() : `${themeState}-theme`;
    applyVisualTheme(themeClass);

    localStorage.setItem('themeState', themeState);
};

export const initializeTheme = () => {
    if (!themeToggle) return;

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

    const initialThemeState = localStorage.getItem('themeState') || 'system';
    setThemeState(initialThemeState);
};