// src/assets/js/auth.js

// این بخش کلاینت Supabase را تعریف می‌کند.
// مطمئن شوید که آدرس و کلید پروژه خودتان را جایگزین کرده‌اید.
const SUPABASE_URL = 'https://vgecvbadhoxijspowemu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZWN2YmFkaG94aWpzcG93ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDI5MjksImV4cCI6MjA2OTAxODkyOX0.4XW_7NUcidoa9nOGO5BrJvreITjg-vuUzsQbSH87eaU';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// توابع کمکی (Helper Functions)
function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> در حال بررسی...';
    } else {
        button.disabled = false;
        button.innerHTML = 'ورود'; // متن دکمه را به حالت اولیه برمی‌گرداند
    }
}

function showToast(message, type = 'info') {
    alert(message); // شما می‌توانید این را با سیستم نمایش پیام خود جایگزین کنید
}

// تابع جدید برای ارسال ایمیل تنظیم رمز به کاربران گوگل
async function handleGoogleUserPasswordSetup(email) {
    const resetURL = `${window.location.origin}/reset-password.html`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetURL,
    });

    if (error) {
        showToast("خطایی در ارسال ایمیل رخ داد. لطفاً دوباره تلاش کنید.", "error");
    } else {
        showToast("ایمیلی برای تنظیم رمز عبور به شما ارسال شد. لطفاً صندوق ورودی خود را چک کنید.", "success");
        const loginForm = document.querySelector('#login-form');
        if(loginForm) loginForm.style.display = 'none';

        // نمایش یک پیام راهنما به کاربر
        const messageArea = document.querySelector('.content-box');
        if(messageArea) {
            messageArea.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h3>ایمیل ارسال شد</h3>
                    <p>لینک تنظیم رمز عبور به <b>${email}</b> ارسال شد. پس از تنظیم رمز، می‌توانید با آن وارد شوید.</p>
                </div>
            ` + messageArea.innerHTML;
        }
    }
}

// نسخه اصلاح‌شده تابع ورود اصلی
async function handleLogin(event) {
    event.preventDefault();
    const loginForm = event.target;
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    const loginButton = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
        showToast("لطفاً ایمیل و رمز عبور را وارد کنید.", "warning");
        return;
    }

    setLoading(loginButton, true);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        if (error.message === "Invalid login credentials") {
            try {
                // فراخوانی تابع SQL که در مرحله ۱ ساختیم
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_providers', { user_email: email });

                if (rpcError) throw rpcError;

                if (rpcData && rpcData.is_google_user) {
                    // اگر کاربر گوگل بود، ایمیل تنظیم رمز را ارسال کن
                    await handleGoogleUserPasswordSetup(email);
                } else {
                    showToast("ایمیل یا رمز عبور نامعتبر است.", "error");
                }
            } catch (rpcError) {
                showToast("خطا در بررسی نوع حساب کاربری.", "error");
                console.error("RPC Error:", rpcError.message);
            }
        } else {
            showToast(error.message, "error");
        }
    } else {
        showToast("شما با موفقیت وارد شدید.", "success");
        window.location.href = '/admin.html'; // یا هر صفحه دیگری
    }

    setLoading(loginButton, false);
}

// اتصال تابع به فرم ورود در صفحه login.html
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});