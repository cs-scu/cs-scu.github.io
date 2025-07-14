

// --- تغییر اصلی در این بخش است ---
let particlesInstance = null;

const particleOptions = {
    background: {
        color: { value: 'transparent' }
    },
    particles: {
        number: { value: 150, density: { enable: true, value_area: 800 } },
        color: { value: "#e8c38e" }, // رنگ پیش‌فرض برای حالت تاریک
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
});

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

const applyTheme = (theme) => {
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(theme);
    // localStorage.setItem('theme', theme); // << این خط حذف یا کامنت بشه

    if (particlesInstance) {
        const newParticleColor = theme === 'dark-theme' ? '#e8c38e' : '#555555';
        particlesInstance.options.particles.color.value = newParticleColor;
        particlesInstance.options.particles.shadow.enable = theme === 'dark-theme';
        particlesInstance.refresh();
    }
};

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (prefersDark) {
    applyTheme('dark-theme');
} else {
    applyTheme('light-theme');
}

themeToggle.addEventListener('click', () => {
    const currentTheme = body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
    const newTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
    applyTheme(newTheme);
});


