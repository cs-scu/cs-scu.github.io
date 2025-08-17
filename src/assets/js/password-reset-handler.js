// src/assets/js/password-reset-handler.js

document.addEventListener('DOMContentLoaded', () => {
    const messageArea = document.getElementById('message-area');
    const passwordForm = document.getElementById('password-form');
    const newPasswordInput = document.getElementById('new-password');

    // تعریف کلاینت Supabase
    // مطمئن شوید که آدرس و کلید پروژه خودتان را جایگزین کرده‌اید.
    const SUPABASE_URL = 'https://vgecvbadhoxijspowemu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZWN2YmFkaG94aWpzcG93ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDI5MjksImV4cCI6MjA2OTAxODkyOX0.4XW_7NUcidoa9nOGO5BrJvreITjg-vuUzsQbSH87eaU';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // تابع کمکی برای نمایش لودینگ
    function setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> در حال ذخیره...';
        } else {
            button.disabled = false;
            button.innerHTML = 'ذخیره رمز عبور';
        }
    }

    // این تابع به محض کلیک کاربر روی لینک ایمیل و بارگذاری صفحه فعال می‌شود
    supabase.auth.onAuthStateChange(async (event, session) => {
        // اگر رویداد از نوع بازیابی رمز بود، فرم را نمایش بده
        if (event === 'PASSWORD_RECOVERY') {
            messageArea.style.display = 'none';
            passwordForm.style.display = 'block';

            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = newPasswordInput.value;
                const submitButton = passwordForm.querySelector('button[type="submit"]');
                
                if (newPassword.length < 6) {
                    alert("رمز عبور باید حداقل ۶ کاراکتر باشد.");
                    return;
                }

                setLoading(submitButton, true);

                // با استفاده از جلسه (session) فعال، رمز کاربر را به‌روزرسانی می‌کنیم
                const { error } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    messageArea.style.display = 'block';
                    messageArea.innerHTML = `<p style="color: var(--danger-color);">خطا: ${error.message}</p>`;
                } else {
                    passwordForm.style.display = 'none';
                    messageArea.style.display = 'block';
                    messageArea.innerHTML = `
                        <p style="color: var(--success-color);">رمز عبور شما با موفقیت تنظیم شد.</p>
                        <p>تا چند لحظه دیگر به صفحه ورود منتقل می‌شوید.</p>
                    `;
                    setTimeout(() => {
                        window.location.href = '/#/login'; // هدایت به صفحه ورود در SPA
                    }, 3000);
                }
                setLoading(submitButton, false);
            });
        }
    });
});