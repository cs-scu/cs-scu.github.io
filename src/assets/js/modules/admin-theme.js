// for managing admin theme based on user preference and system settings
const getSystemThemeClass = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';
};

// Apply the theme to admin interface
const applyAdminTheme = (themeState) => {
    const themeClass = (themeState === 'system') ? getSystemThemeClass() : `${themeState}-theme`;
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(themeClass);
};

// Initialize admin theme on page load
export const initializeAdminTheme = () => {
    const initialThemeState = localStorage.getItem('themeState') || 'system';
    
    applyAdminTheme(initialThemeState);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('themeState') === 'system') {
            applyAdminTheme('system');
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'themeState') {
            applyAdminTheme(event.newValue || 'system');
        }
    });
};