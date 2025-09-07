import { state, dom } from './state.js';
import { 
    supabaseClient, 
    checkUserStatus, 
    sendSignupOtp, 
    sendPasswordResetOtp, 
    verifyOtp, 
    signInWithPassword, 
    signInWithGoogle, 
    updateUserPassword, 
    updateProfile, 
    getProfile, 
    verifyTurnstile, 
    getEventRegistration, 
    deleteEventRegistration, 
    getUserProvider,
    addComment,
    toggleLike,
    toggleCommentVote,
    deleteComment,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    sendPhoneVerificationOtp,
    verifyPhoneOtp
} from './api.js';


let currentEmail = '';
const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

// Helper function to hide status messages
const hideStatus = (statusBox) => {
    if (!statusBox) return;
    statusBox.style.display = 'none';
    statusBox.textContent = '';
};

// Helper function to show status messages
const showStatus = (statusBox, message, type = 'error') => {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = `form-status ${type}`;
    statusBox.style.display = 'block';
};
const toPersianNumber = (n) => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/[0-9]/g, (digit) => persianNumbers[digit]);
};
const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);

    if (seconds < 60) {
        return "همین الان";
    }

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${toPersianNumber(minutes)} دقیقه قبل`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${toPersianNumber(hours)} ساعت قبل`;
    }

    // اگر از ۲۴ ساعت گذشته بود، تاریخ کامل را نمایش بده
    return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// A simple function to sanitize HTML and prevent XSS
const sanitizeHTML = (str) => {
    // --- START: SECURITY & NEWLINE FIX ---
    if (!str) return '';

    // 1. First, escape essential HTML characters to prevent XSS attacks.
    const escapedStr = str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 2. Then, convert newline characters to <br> tags to preserve formatting.
    return escapedStr.replace(/\r\n|\r|\n/g, '<br>');
    // --- END: SECURITY & NEWLINE FIX ---
};

export const showProfileModal = async () => {
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    // همیشه آخرین اطلاعات کاربر را از Supabase دریافت می‌کنیم
    const { data: { user: freshUser }, error: refreshError } = await supabaseClient.auth.refreshSession();
    if (refreshError || !freshUser) {
        console.error("Could not refresh user data:", refreshError);
        location.hash = '#/login'; // اگر نشست منقضی شده، به صفحه لاگین هدایت شو
        return;
    }
    state.user = freshUser;

    // <<-- START: منطق جدید برای دریافت پروفایل -->>
    // پروفایل را نیز مجددا واکشی می‌کنیم تا اطلاعات نام به‌روز باشد
    await getProfile();
    const profile = state.profile;
    // <<-- END: منطق جدید -->>

    const provider = state.user?.app_metadata?.provider;
    const userPhoneNumber = state.user?.phone;

    // بخش جدید: HTML برای مدیریت شماره تلفن
let phoneSectionHtml = '';
if (userPhoneNumber) {
    phoneSectionHtml = `
        <div class="form-group">
            <label for="phone-display">شماره تلفن تایید شده</label>
            <div class="phone-display-wrapper" style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="text" id="phone-display" value="${userPhoneNumber}" disabled dir="ltr" style="background-color: rgba(128,128,128,0.1); flex-grow: 1; text-align: left;">
                <span class="verified-badge" style="background-color: #28a745; color: white; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">✔ تایید شده</span>
            </div>
        </div>
    `;
} else {
    phoneSectionHtml = `
        <hr style="margin: 2rem 0;">
        <h4>تایید شماره تلفن</h4>
        <p>با تایید شماره تلفن، از اطلاع‌رسانی‌های مهم رویدادها باخبر شوید.</p>
        
        <form id="phone-verification-form" class="responsive-form-row" novalidate>
            <div class="form-group" style="flex-grow: 1; margin: 0;">
                <label for="phone-input" class="visually-hidden">شماره موبایل</label>
                <input type="tel" id="phone-input" name="phone" placeholder="شماره موبایل (مثال: 0912...)" required pattern="^09[0-9]{9}$" dir="ltr" style="text-align: left;">
            </div>
            <div style="flex-shrink: 0;">
                <button type="submit" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;">ارسال کد</button>
            </div>
        </form>

            <form id="otp-verification-form" class="responsive-form-column" style="display: none;" novalidate>
                <p style="text-align: center; margin-bottom: 1rem;">کد ۶ رقمی ارسال شده به شماره <strong id="display-phone-otp" dir="ltr"></strong> را وارد کنید.</p>
                
                <div class="otp-input-and-actions">
                    <div class="otp-container" dir="ltr">
                        <input type="text" class="otp-input" maxlength="1" inputmode="numeric"><input type="text" class="otp-input" maxlength="1" inputmode="numeric"><input type="text" class="otp-input" maxlength="1" inputmode="numeric"><input type="text" class="otp-input" maxlength="1" inputmode="numeric"><input type="text" class="otp-input" maxlength="1" inputmode="numeric"><input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                    </div>
                    <div class="otp-actions">
                        <button type="button" class="btn btn-secondary" id="edit-phone-btn">ویرایش</button>
                        <button type="submit" class="btn btn-primary">تایید</button>
                    </div>
                </div>
            </form>
        <div class="form-status phone-status" style="margin-top: 1rem;"></div>
    `;
}

    // محتوای فرم تغییر رمز عبور بدون تغییر باقی می‌ماند
    const changePasswordHtml = provider === 'email' ? `
        <hr style="margin: 2rem 0;">
        <h4>تغییر رمز عبور</h4>
        <form id="change-password-form" class="form-flipper" novalidate>
            <div class="form-flipper-front">
                <p>برای شروع، لطفاً رمز عبور فعلی خود را وارد کنید.</p>
                
                <div class="responsive-form-row">
                    <div class="form-group password-group" style="flex-grow: 1; margin: 0;">
                        <input type="password" id="current-password" name="current-password" placeholder="رمز عبور فعلی" required>
                    </div>
                    <div style="flex-shrink: 0;">
                        <button type="submit" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;">ادامه</button>
                    </div>
                </div>
                <div class="form-status" style="margin-top: 0.75rem;"></div>
            </div>

            <div class="form-flipper-back">
                <div class="form-group password-group">
                    <label for="new-password">رمز عبور جدید</label>
                    <input type="password" id="new-password" name="new-password" placeholder="حداقل ۶ کاراکتر" required>
                </div>
                <div class="form-group password-group">
                    <label for="confirm-new-password">تکرار رمز عبور جدید</label>
                    <input type="password" id="confirm-new-password" name="confirm-new-password" required>
                </div>
                <div class="form-status"></div>
                <div class="form-actions" style="flex-direction: row; gap: 1rem; margin-top: 1rem;">
                    <button type="button" class="btn btn-secondary" id="cancel-password-change">انصراف</button>
                    <button type="submit" class="btn btn-primary">ذخیره رمز جدید</button>
                </div>
            </div>
        </form>
    ` : '';
    
    const modalHtml = `
        <div class="content-box" style="padding: 2rem;">
            <h2>پروفایل کاربری</h2>
            <form id="profile-form" style="margin-bottom: 1.5rem;">
                <label for="full-name" style="display: block; margin-bottom: 0.5rem;">نام و نام خانوادگی</label>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="form-group" style="flex-grow: 1; margin: 0;">
                        <input type="text" id="full-name" name="full-name" value="${profile?.full_name || ''}" required>
                    </div>
                    
                    <div style="flex-shrink: 0;">
                        <button type="submit" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;">ذخیره</button>
                    </div>
                </div>
                <div class="form-status profile-status" style="margin-top: 0.75rem;"></div>
            </form>
            
            ${phoneSectionHtml}
            ${changePasswordHtml}
        </div>
    `;
    
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = modalHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    // --- منطق فرم‌های جدید ---
    const phoneForm = genericModalContent.querySelector('#phone-verification-form');
    const otpForm = genericModalContent.querySelector('#otp-verification-form');
    const phoneStatusBox = genericModalContent.querySelector('.form-status.phone-status');

    if (phoneForm && otpForm) {
        phoneForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = phoneForm.querySelector('#phone-input');
            const phone = phoneInput.value.trim();
            const submitBtn = phoneForm.querySelector('button[type="submit"]');

            hideStatus(phoneStatusBox);
            if (!phoneInput.checkValidity()) {
                showStatus(phoneStatusBox, 'لطفاً شماره موبایل را با فرمت صحیح وارد کنید.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'در حال ارسال...';

            const { error } = await sendPhoneVerificationOtp(phone);

            if (error) {
                showStatus(phoneStatusBox, error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'ارسال کد تایید';
            } else {
                showStatus(phoneStatusBox, 'کد تایید با موفقیت ارسال شد.', 'success');
                phoneForm.style.display = 'none';
                otpForm.style.display = 'block';
                genericModalContent.querySelector('#display-phone-otp').textContent = phone;
                otpForm.querySelector('.otp-input').focus();
            }
        });

        const otpInputs = Array.from(otpForm.querySelectorAll('.otp-input'));
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                if (input.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
        
        otpForm.querySelector('#edit-phone-btn').addEventListener('click', () => {
            hideStatus(phoneStatusBox);
            otpForm.style.display = 'none';
            phoneForm.style.display = 'block';
            const submitBtn = phoneForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'ارسال کد تایید';
        });

otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = genericModalContent.querySelector('#display-phone-otp').textContent;
    const otp = otpInputs.map(input => input.value).join('');
    const submitBtn = otpForm.querySelector('button[type="submit"]');

    hideStatus(phoneStatusBox);
    if (otp.length !== 6) {
        showStatus(phoneStatusBox, 'کد تایید باید ۶ رقم باشد.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال بررسی...';

    // CHANGED: The 'phone' variable is now correctly passed to the function
    const { error } = await verifyPhoneOtp(phone, otp);

    if (error) {
        showStatus(phoneStatusBox, error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'تایید نهایی';
    } else {
        showStatus(phoneStatusBox, 'شماره تلفن شما با موفقیت تایید شد!', 'success');
        setTimeout(() => {
            genericModal.classList.remove('is-open');
            dom.body.classList.remove('modal-is-open');
            showProfileModal(); 
        }, 2000);
    }
});
    }
    
    // --- کدهای مربوط به فرم پروفایل و تغییر رمز ---
const profileForm = genericModalContent.querySelector('#profile-form');
if (profileForm) {
    const profileStatusBox = profileForm.querySelector('.form-status.profile-status');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = profileForm.querySelector('#full-name').value;
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        
        // <<-- START: منطق جدید برای نمایش حالت لودینگ -->>
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span class="visually-hidden">در حال ذخیره...</span>
        `;
        // <<-- END: منطق جدید -->>

        hideStatus(profileStatusBox);

        const { error } = await updateProfile({ full_name: fullName });

        if (error) {
            showStatus(profileStatusBox, 'خطا در ذخیره اطلاعات.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText; // بازگرداندن متن اصلی دکمه
        } else {
            showStatus(profileStatusBox, 'اطلاعات با موفقیت ذخیره شد.', 'success');
            await getProfile();
            updateUserUI(state.user, state.profile);
            
            // بازگرداندن ظاهر دکمه به حالت اولیه پس از نمایش پیام موفقیت
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalButtonText;
                hideStatus(profileStatusBox);
            }, 2000);
        }
    });
}

// در فایل: src/assets/js/modules/ui.js
// این بلوک را در تابع showProfileModal جایگزین کنید

      const passwordForm = genericModalContent.querySelector('#change-password-form');
      if(passwordForm) {
        const flipper = passwordForm;
        const frontSide = flipper.querySelector('.form-flipper-front');
        const backSide = flipper.querySelector('.form-flipper-back');
        let currentStep = 1;

        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.submitter;
            const statusBox = (currentStep === 1) 
                ? frontSide.querySelector('.form-status') 
                : backSide.querySelector('.form-status');
            
            hideStatus(statusBox);
            submitBtn.disabled = true;

            if (currentStep === 1) {
                // Step 1: Verify current password
                const currentPassword = frontSide.querySelector('#current-password').value;
                const { error: signInError } = await signInWithPassword(state.user.email, currentPassword);
                
                if (signInError) {
                    showStatus(statusBox, 'رمز عبور فعلی شما صحیح نیست.');
                    submitBtn.disabled = false;
                } else {
                    flipper.style.minHeight = `${flipper.offsetHeight}px`;
                    flipper.classList.add('is-flipped');
                    currentStep = 2;
                }
            } else {
                // Step 2: Set new password
                const newPassword = backSide.querySelector('#new-password').value;
                const confirmNewPassword = backSide.querySelector('#confirm-new-password').value;
                
                if (newPassword.length < 6) {
                    showStatus(statusBox, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
                    submitBtn.disabled = false;
                    return;
                }
                if (newPassword !== confirmNewPassword) {
                    showStatus(statusBox, 'رمزهای عبور جدید با یکدیگر مطابقت ندارند.');
                    submitBtn.disabled = false;
                    return;
                }

                const { error: updateError } = await updateUserPassword(newPassword);
                if (updateError) {
                    showStatus(statusBox, 'خطا در تغییر رمز عبور.');
                } else {
                    showStatus(statusBox, 'رمز عبور با موفقیت تغییر کرد.', 'success');
                    setTimeout(() => {
                        flipper.classList.remove('is-flipped');
                        passwordForm.reset();
                        currentStep = 1;
                        hideStatus(statusBox);
                    }, 2000);
                }
                submitBtn.disabled = false;
            }
        });

        const cancelBtn = backSide.querySelector('#cancel-password-change');
        cancelBtn.addEventListener('click', () => {
            flipper.classList.remove('is-flipped');
            passwordForm.reset();
            currentStep = 1;
            hideStatus(backSide.querySelector('.form-status'));
        });
      }
};

export const initializeAuthForm = () => {
    const form = dom.mainContent.querySelector('#auth-form');
    if (!form || form.dataset.listenerAttached) return;

    const getFriendlyAuthError = (error) => {
        if (!error) return 'یک خطای ناشناخته رخ داد. لطفاً دوباره تلاش کنید.';
        console.error("Auth Error:", error);
        if (error.message.includes('network')) return 'مشکل در اتصال به سرور. لطفاً اینترنت خود را بررسی و دوباره تلاش کنید.';
        switch (error.message) {
            case 'Invalid login credentials': return 'ایمیل یا رمز عبور وارد شده صحیح نیست.';
            case 'Token has expired or is invalid':
            case 'Code is invalid': return 'کد تایید وارد شده صحیح نیست یا منقضی شده است.';
            case 'Unable to validate email address: invalid format': return 'فرمت ایمیل وارد شده صحیح نیست. لطفاً آن را بررسی کنید.';
            case 'Email rate limit exceeded': return 'تعداد درخواست‌ها برای این ایمیل بیش از حد مجاز است. لطفاً چند دقیقه دیگر صبر کنید.';
            case 'Password should be at least 6 characters': return 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
            default:
                if (error.status === 429) return 'تعداد درخواست‌ها زیاد است. لطفاً پس از ۱ دقیقه دوباره تلاش کنید.';
                return 'یک خطای غیرمنتظره رخ داد. لطفاً بعداً تلاش کنید.';
        }
    };

    const handleSuccessfulLogin = () => {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        if (redirectUrl && redirectUrl !== '#/login') location.hash = redirectUrl;
        else location.hash = '#/';
    };

    let otpTimerInterval = null;
    let otpContext = 'signup'; // 'signup' or 'reset'
    let tempFullName = '';

    const emailStep = form.querySelector('#email-step');
    const passwordStep = form.querySelector('#password-step');
    const otpStep = form.querySelector('#otp-step');
    const setNameStep = form.querySelector('#set-name-step');
    const setPasswordStep = form.querySelector('#set-password-step');
    const linkingStep = form.querySelector('#linking-step');
    const statusBox = form.querySelector('.form-status');
    const emailSubmitBtn = form.querySelector('#email-submit-btn');
    const forgotPasswordBtn = form.querySelector('#forgot-password-btn');
    const editEmailBtns = form.querySelectorAll('.edit-email-btn');
    const resendOtpBtn = form.querySelector('#resend-otp-btn');
    const otpTimerSpan = form.querySelector('#otp-timer');
    const googleSignInBtn = form.querySelector('#google-signin-btn');
    const displayEmailPassword = form.querySelector('#display-email-password');
    const displayEmailOtp = form.querySelector('#display-email-otp');
    const googleSignInRedirectBtn = form.querySelector('#google-signin-redirect-btn');
    const setPasswordRedirectBtn = form.querySelector('#set-password-redirect-btn');
    const displayEmailLinking = form.querySelector('#display-email-linking');
    const otpContainer = form.querySelector('#otp-container');
    const otpInputs = otpContainer ? Array.from(otpContainer.children) : [];
    const turnstileWidget = form.querySelector('#turnstile-widget');

    if (turnstileWidget && typeof turnstile !== 'undefined') {
        turnstile.render('#turnstile-widget', {
            sitekey: '0x4AAAAAABoNEi1N70S2VODl',
            theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
        });
    }

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            hideStatus(statusBox);
            const { error } = await signInWithGoogle();
            if (error) showStatus(statusBox, getFriendlyAuthError(error));
        });
    }

    form.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const passwordInput = btn.previousElementSibling;
            const isOpen = passwordInput.type === 'password';
            passwordInput.type = isOpen ? 'text' : 'password';
            btn.querySelector('.icon-eye-open').style.display = isOpen ? 'none' : 'block';
            btn.querySelector('.icon-eye-closed').style.display = isOpen ? 'block' : 'none';
        });
    });

    const newPasswordInput = form.querySelector('#new-password');
    const strengthIndicator = form.querySelector('#password-strength-indicator');
    if (newPasswordInput && strengthIndicator) {
        newPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput.value;
            let strength = 'none';
            if (password.length > 0) {
                strength = 'weak';
                if (password.length >= 8) strength = 'medium';
                if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) strength = 'strong';
            }
            strengthIndicator.className = `password-strength-indicator ${strength}`;
        });
    }
    
    const startOtpTimer = () => {
        clearInterval(otpTimerInterval);
        let duration = 60;
        resendOtpBtn.disabled = true;
        otpTimerSpan.style.display = 'inline';
        const updateTimer = () => {
            const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
            const seconds = String(duration % 60).padStart(2, '0');
            otpTimerSpan.textContent = `(${minutes}:${seconds})`;
        };
        updateTimer();
        otpTimerInterval = setInterval(() => {
            duration--;
            updateTimer();
            if (duration <= 0) {
                clearInterval(otpTimerInterval);
                resendOtpBtn.disabled = false;
                otpTimerSpan.style.display = 'none';
            }
        }, 1000);
    };

    const startEmailCooldown = () => {
        let duration = 60;
        if (!emailSubmitBtn) return;
        emailSubmitBtn.disabled = true;
        const originalText = "ادامه";
        const updateButtonText = () => {
            if (duration > 0) {
                emailSubmitBtn.textContent = `لطفاً ${duration} ثانیه صبر کنید`;
            } else {
                emailSubmitBtn.textContent = originalText;
                emailSubmitBtn.disabled = false;
                clearInterval(cooldownInterval);
            }
        };
        const cooldownInterval = setInterval(() => {
            duration--;
            updateButtonText();
        }, 1000);
        updateButtonText();
    };


    const showStep = (step) => {
        const allSteps = [emailStep, passwordStep, otpStep, setNameStep, setPasswordStep, linkingStep];
        allSteps.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        if (step) {
            step.style.display = 'block';
        }
        if (step === otpStep) otpInputs[0]?.focus();
        if (step === setNameStep) form.querySelector('#full-name-signup').focus();
    };

    editEmailBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hideStatus(statusBox);
            showStep(emailStep);
            if (emailSubmitBtn) {
                emailSubmitBtn.disabled = false;
                emailSubmitBtn.textContent = 'ادامه';
            }
        });
    });

    if (otpContainer) {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', () => { if (input.value && index < otpInputs.length - 1) otpInputs[index + 1].focus(); });
            input.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !input.value && index > 0) otpInputs[index - 1].focus(); });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = e.clipboardData.getData('text');
                if (pasteData.length === otpInputs.length) {
                    otpInputs.forEach((box, i) => { box.value = pasteData[i] || ''; });
                    otpInputs[otpInputs.length - 1].focus();
                }
            });
        });
    }

    if (googleSignInRedirectBtn) { googleSignInRedirectBtn.addEventListener('click', () => signInWithGoogle()); }

    if (setPasswordRedirectBtn) {
        setPasswordRedirectBtn.addEventListener('click', async () => {
            hideStatus(statusBox);
            otpContext = 'reset';
            const { error } = await sendPasswordResetOtp(currentEmail);
            if (error) {
                showStatus(statusBox, getFriendlyAuthError(error));
            } else {
                showStep(otpStep);
                startOtpTimer();
                showStatus(statusBox, 'کد بازنشانی رمز برای ایجاد رمز جدید به ایمیل شما ارسال شد.', 'success');
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const activeStep = e.submitter.closest('div[id$="-step"]');
        if (!activeStep) return;
        const submitBtn = e.submitter;
        submitBtn.disabled = true;
        hideStatus(statusBox);
        switch (activeStep.id) {
            case 'email-step':
                submitBtn.textContent = 'در حال بررسی...';
                const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value;
                if (!turnstileToken) {
                    showStatus(statusBox, 'تایید هویت انجام نشد. لطفاً لحظه‌ای صبر کنید.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'ادامه';
                    return;
                }
                const verification = await verifyTurnstile(turnstileToken);
                if (!verification.success) {
                    showStatus(statusBox, 'تایید هویت با خطا مواجه شد. لطفاً صفحه را رفرش کنید.');
                    if (typeof turnstile !== 'undefined') turnstile.reset('#turnstile-widget');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'ادامه';
                    return;
                }
                currentEmail = form.querySelector('#auth-email').value;
                const status = await checkUserStatus(currentEmail);
                if (status === 'exists_and_confirmed') {
                    const { data: provider } = await getUserProvider(currentEmail);
                    if (provider === 'google') {
                        // <<-- START: EDITED SECTION -->>
                        hideStatus(statusBox);
                        // ایمیل کاربر را به عنوان راهنما به تابع پاس می‌دهیم
                        const { error } = await signInWithGoogle(currentEmail);
                        if (error) {
                            showStatus(statusBox, getFriendlyAuthError(error));
                            submitBtn.textContent = 'ادامه';
                            submitBtn.disabled = false;
                        }
                        // <<-- END: EDITED SECTION -->>
                    } else {
                        displayEmailPassword.textContent = currentEmail;
                        showStep(passwordStep);
                        submitBtn.textContent = 'ادامه';
                        submitBtn.disabled = false;
                    }
                } else if (status === 'does_not_exist' || status === 'exists_unconfirmed') {
                    otpContext = 'signup';
                    const { error } = await sendSignupOtp(currentEmail);
                    if (error) {
                        showStatus(statusBox, getFriendlyAuthError(error));
                        if (error.status === 429) {
                            startEmailCooldown();
                        } else {
                            submitBtn.textContent = 'ادامه';
                            submitBtn.disabled = false;
                        }
                    } else {
                        displayEmailOtp.textContent = currentEmail;
                        showStep(otpStep);
                        startOtpTimer();
                        showStatus(statusBox, 'کد تایید به ایمیل شما ارسال شد.', 'success');
                        
                        startEmailCooldown(); 
                    }
                } else {
                    showStatus(statusBox, 'خطا در بررسی وضعیت کاربر.');
                    submitBtn.textContent = 'ادامه';
                    submitBtn.disabled = false;
                }
                break;
            case 'password-step':
                submitBtn.textContent = 'در حال ورود...';
                const password = form.querySelector('#auth-password').value;
                const { error: signInError } = await signInWithPassword(currentEmail, password);
                if (signInError) {
                    showStatus(statusBox, getFriendlyAuthError(signInError));
                    submitBtn.textContent = 'ورود';
                    submitBtn.disabled = false;
                } else {
                    handleSuccessfulLogin();
                }
                break;
            
            case 'otp-step':
                submitBtn.textContent = 'در حال تایید...';
                const otp = otpInputs.map(input => input.value).join('');
                if (otp.length !== 6) {
                    showStatus(statusBox, 'کد تایید باید ۶ رقم باشد.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'تایید کد';
                    return;
                }
                
                const otpType = (otpContext === 'reset') ? 'recovery' : 'email';
                const { data, error: otpError } = await verifyOtp(currentEmail, otp, otpType);

                if (otpError || !data.session) {
                    showStatus(statusBox, getFriendlyAuthError(otpError || { message: 'Code is invalid' }));
                } else {
                    if (otpContext === 'reset') {
                        showStep(setPasswordStep);
                        showStatus(statusBox, 'کد تایید شد. لطفاً رمز عبور جدید خود را تعیین کنید.', 'success');
                    } else {
                        showStep(setNameStep);
                        showStatus(statusBox, 'کد تایید شد. لطفاً نام خود را وارد کنید.', 'success');
                    }
                }
                submitBtn.textContent = 'تایید کد';
                submitBtn.disabled = false;
                break;

            case 'set-name-step':
                tempFullName = form.querySelector('#full-name-signup').value;
                if (tempFullName.trim().length < 3) {
                    showStatus(statusBox, 'لطفاً نام معتبری وارد کنید.');
                    submitBtn.disabled = false;
                    return;
                }
                showStep(setPasswordStep);
                showStatus(statusBox, 'عالی! اکنون رمز عبور خود را تعیین کنید.', 'success');
                submitBtn.disabled = false;
                break;
            case 'set-password-step':
                submitBtn.textContent = 'در حال ذخیره...';
                const newPassword = form.querySelector('#new-password').value;
                if (newPassword.length < 6) {
                    showStatus(statusBox, 'رمز عبور باید حداقل ۶ کاراکتر باشد.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'ذخیره و ورود';
                    return;
                }
                const { error: updateError } = await updateUserPassword(newPassword);
                if (updateError) {
                    showStatus(statusBox, getFriendlyAuthError(updateError));
                    submitBtn.disabled = false;
                } else {
                    if (tempFullName) {
                        await updateProfile({ full_name: tempFullName });
                    }
                    await getProfile();
                    handleSuccessfulLogin();
                }
                submitBtn.textContent = 'ذخیره و ورود';
                break;
        }
    });

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            hideStatus(statusBox);
            otpContext = 'reset';
            const { error } = await sendPasswordResetOtp(currentEmail);
            if (error) {
                showStatus(statusBox, getFriendlyAuthError(error));
            } else {
                displayEmailOtp.textContent = currentEmail;
                showStep(otpStep);
                startOtpTimer();
                showStatus(statusBox, 'کد بازنشانی رمز به ایمیل شما ارسال شد.', 'success');
            }
        });
    }

    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', async () => {
            hideStatus(statusBox);
            resendOtpBtn.disabled = true;
            const apiCall = otpContext === 'signup' ? sendSignupOtp : sendPasswordResetOtp;
            const { error } = await apiCall(currentEmail);
            if (error) {
                showStatus(statusBox, getFriendlyAuthError(error));
                resendOtpBtn.disabled = false;
            } else {
                showStatus(statusBox, 'کد جدید با موفقیت ارسال شد.', 'success');
                startOtpTimer();
            }
        });
    }

    form.dataset.listenerAttached = 'true';
};

export const updateUserUI = (user, profile) => {
    const authLink = document.getElementById('login-register-btn');
    const userInfo = document.getElementById('user-info');
    const welcomeMsg = document.getElementById('user-welcome-message'); // فعال‌سازی دوباره این متغیر
    const adminLink = document.getElementById('admin-panel-link');
    const userAvatar = document.getElementById('user-avatar');

    if (user) {
        if (authLink) authLink.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';

        if (welcomeMsg) {
            const displayName = profile?.full_name || user.email.split('@')[0];
            welcomeMsg.textContent = displayName; // نمایش نام، بدون "سلام"
        }
                
        if (userAvatar) {
            userAvatar.src = profile?.avatar_url || user.user_metadata?.avatar_url || DEFAULT_AVATAR_URL;
            userAvatar.style.display = 'block';
        }
        
        if (adminLink) {
            adminLink.style.display = (profile?.role === 'admin') ? 'flex' : 'none';
        }
    } else {
        if (authLink) authLink.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (userAvatar) userAvatar.style.display = 'none';
    }
};

const showMemberModal = (memberId) => {
    const member = state.membersMap.get(parseInt(memberId, 10));
    if (!member) return;

    const template = document.getElementById('member-card-template');
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!template || !genericModal || !genericModalContent) return;

    const cardClone = template.content.cloneNode(true);
    const closeBtnInCard = cardClone.querySelector('.close-modal-incard');
    if (closeBtnInCard) {
        closeBtnInCard.addEventListener('click', () => {
            dom.body.classList.remove('modal-is-open');
            genericModal.classList.remove('is-open');
        });
    }
    cardClone.querySelector('.member-card').classList.add('in-modal');
    cardClone.querySelector('.member-photo').src = member.imageUrl || DEFAULT_AVATAR_URL;
    cardClone.querySelector('.member-photo').alt = member.name;
    cardClone.querySelector('.member-name').textContent = member.name;
    cardClone.querySelector('.role').textContent = member.role || 'عضو انجمن';
    cardClone.querySelector('.description').textContent = member.description;

    const tagsContainer = cardClone.querySelector('.card-tags');
    tagsContainer.innerHTML = '';
    if (member.tags && Array.isArray(member.tags)) {
        member.tags.forEach(tagText => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tagText;
            tagsContainer.appendChild(tagElement);
        });
    }

    const socials = cardClone.querySelector('.card-socials');
    if (member.social) {
        const socialLinks = {
            linkedin: cardClone.querySelector('.social-linkedin'),
            telegram: cardClone.querySelector('.social-telegram'),
            github: cardClone.querySelector('.social-github')
        };
        let hasSocial = false;
        for (const key in socialLinks) {
            if (member.social[key] && socialLinks[key]) {
                socialLinks[key].href = member.social[key];
                socialLinks[key].style.display = 'inline-block';
                hasSocial = true;
            }
        }
        if (!hasSocial) socials.style.display = 'none';
    } else {
        socials.style.display = 'none';
    }

    genericModal.classList.remove('wide-modal');
    genericModalContent.innerHTML = '';
    genericModalContent.appendChild(cardClone);
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');
};


export const showEventModal = async (path) => {
    const eventLink = `#${path}`;
    const event = state.allEvents.find(e => e.detailPage === eventLink);
    if (!event) return;

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;
    
const parseInlineMarkdown = (text) => {
    if (!text) return '';
        const sanitizer = document.createElement('div');
        sanitizer.textContent = text;
        let sanitizedText = sanitizer.innerHTML;
        sanitizedText = sanitizedText.replace(/(?<!\\)\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        sanitizedText = sanitizedText.replace(/(?<!\\)\*(.*?)\*/g, '<em>$1</em>');
        sanitizedText = sanitizedText.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
            if (url.startsWith('javascript:')) return `[${linkText}]()`;
            if (url.startsWith('@')) return `<a href="#/${url.substring(1)}">${linkText}</a>`;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        });
        sanitizedText = sanitizedText.replace(/\\(\*)/g, '$1');
        return sanitizedText;
    };

    const renderJsonContent = (blocks) => {
        if (!Array.isArray(blocks)) return '<p>محتوای این رویداد به درستی بارگذاری نشد.</p>';
        let html = '';
        blocks.forEach(block => {
            switch (block.type) {
                case 'header': html += `<h${block.data.level}>${block.data.text}</h${block.data.level}>`; break;
                case 'paragraph': html += `<p>${parseInlineMarkdown(block.data.text)}</p>`; break;
                case 'list':
                    const listItems = block.data.items.map(item => `<li>${parseInlineMarkdown(item)}</li>`).join('');
                    html += `<${block.data.style === 'ordered' ? 'ol' : 'ul'}>${listItems}</${block.data.style === 'ordered' ? 'ol' : 'ul'}>`;
                    break;
                case 'image': html += `<figure><img src="${block.data.url}" alt="${block.data.caption || 'Image'}">${block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ''}</figure>`; break;
                case 'quote': html += `<blockquote><p>${block.data.text}</p>${block.data.caption ? `<cite>${block.data.caption}</cite>` : ''}</blockquote>`; break;
                default: console.warn('Unknown block type:', block.type);
            }
        });
        return html;
    };
    
    const detailHtml = renderJsonContent(event.content);
    
    const isUnlimited = event.capacity === -1;
    const remainingCapacity = isUnlimited ? 'نامحدود' : toPersianNumber(event.capacity - event.registrations_count);
    const isFull = !isUnlimited && (event.capacity - event.registrations_count <= 0);
    
    const now = new Date();
    const regStartDate = event.registrationStartDate ? new Date(event.registrationStartDate) : null;

    const regEndDate = event.registrationEndDate ? new Date(event.registrationEndDate) : null;
    if (regEndDate) {
        regEndDate.setHours(23, 59, 59, 999); // تاریخ پایان را به انتهای روز منتقل می‌کنیم
    }

    let regStatus = 'open';
    if (regStartDate && now < regStartDate) {
        regStatus = 'not_started';
    } else if (regEndDate && now > regEndDate) {
        regStatus = 'ended';
    }

    const capacityHTML = `
        <span class="event-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            ظرفیت باقی‌مانده: ${isFull ? 'تکمیل' : remainingCapacity}
        </span>`;

    const costHTML = event.cost ? `
        <span class="event-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
            ${event.cost}
        </span>` : '';

    let actionsHTML = '';
    const isPastEvent = new Date(event.endDate) < new Date();
    const userHasRegistered = state.userRegistrations.has(event.id);

    let mainButtonHTML = '';
    if (userHasRegistered) {
        const registrationStatus = state.userRegistrations.get(event.id);
        mainButtonHTML = `
            <button class="btn btn-event-register btn-status-${registrationStatus}" data-event-id="${event.id}" style="flex-grow: 2;">
                پیگیری ثبت‌نام
            </button>`;
    } else {
        let buttonText = 'ثبت‌نام در این رویداد';
        let buttonDisabled = '';

        if (isPastEvent) {
            buttonText = 'رویداد پایان یافته';
            buttonDisabled = 'disabled';
        } else if (isFull) {
            buttonText = 'ظرفیت تکمیل';
            buttonDisabled = 'disabled';
        } else if (regStatus === 'not_started') {
            buttonText = 'ثبت‌نام به‌زودی';
            buttonDisabled = 'disabled';
        } else if (regStatus === 'ended') {
            buttonText = 'ثبت‌نام بسته شد';
            buttonDisabled = 'disabled';
        }
        mainButtonHTML = `<button class="btn btn-primary btn-event-register" data-event-id="${event.id}" style="flex-grow: 2;" ${buttonDisabled}>${buttonText}</button>`;
    }
    // *** END: پایان منطق جدید ***

    let contactInfo = null;
    try {
        if (event.contact_link && typeof event.contact_link === 'string') {
            contactInfo = JSON.parse(event.contact_link);
        } else {
            contactInfo = event.contact_link;
        }
    } catch (e) { console.error("Could not parse contact info JSON:", e); }

    const contactButtonDisabled = isPastEvent ? 'disabled' : '';
    const contactButton = (contactInfo && Object.keys(contactInfo).length > 0)
        ? `<div class="contact-widget-trigger-wrapper">
               <button id="contact-for-event-btn" class="btn btn-secondary" ${contactButtonDisabled}>پرسش درباره رویداد</button>
           </div>`
        : `<div class="contact-widget-trigger-wrapper">
               <button class="btn btn-secondary disabled" disabled>اطلاعات تماس موجود نیست</button>
           </div>`;
    
    actionsHTML = `
        <div class="event-modal-actions">
            ${mainButtonHTML}
            ${contactButton}
        </div>
    `;


    const modalHtml = `
        <div class="content-box">
            <div class="event-content-area">
                <h1>${event.title}</h1>
                <div class="event-modal-meta">
                     <span class="event-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${event.displayDate}
                    </span>
                    <span class="event-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${event.location}
                    </span>
                    ${costHTML}
                    ${capacityHTML}
                </div>
                <br>
                ${detailHtml}
                ${actionsHTML}
            </div>
        </div>
    `;
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = modalHtml;

    const registerBtnInModal = genericModalContent.querySelector('.btn-event-register');
    if (registerBtnInModal) {
        registerBtnInModal.addEventListener('click', (e) => {
            e.preventDefault();
            const eventId = registerBtnInModal.dataset.eventId;
            genericModal.classList.remove('is-open');
            dom.body.classList.remove('modal-is-open');
            showEventRegistrationModal(eventId);
        });
    }

    const contactBtn = genericModalContent.querySelector('#contact-for-event-btn');
    if (contactBtn && !contactBtn.disabled) {
        contactBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wrapper = contactBtn.parentElement;
            const existingWidget = wrapper.querySelector('.contact-widget');
            if (existingWidget) {
                existingWidget.remove();
                return;
            }
            let contactInfo = null;
            try {
                contactInfo = (typeof event.contact_link === 'string') ? JSON.parse(event.contact_link) : event.contact_link;
            } catch (err) { console.error("Invalid contact JSON:", err); return; }
            if (!contactInfo) return;
            let contactItemsHTML = '';
            if (contactInfo.phone) { contactItemsHTML += `<a href="tel:${contactInfo.phone}" class="contact-widget-item"><div class="contact-widget-icon phone-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div><div class="contact-widget-info"><strong>تلفن</strong><span>${contactInfo.phone}</span></div></a>`; }
            if (contactInfo.telegram) { contactItemsHTML += `<a href="${contactInfo.telegram}" target="_blank" rel="noopener noreferrer" class="contact-widget-item"><div class="contact-widget-icon telegram-icon"><svg fill="#ffffff" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.114,9.291c.552-.552,1.1-1.84-1.2-.276-3.268,2.255-6.489,4.372-6.489,4.372a2.7,2.7,0,0,1-2.117.046c-1.38-.414-2.991-.966-2.991-.966s-1.1-.691.783-1.427c0,0,7.961-3.267,10.722-4.418,1.058-.46,4.647-1.932,4.647-1.932s1.657-.645,1.519.92c-.046.644-.414,2.9-.782,5.338-.553,3.451-1.151,7.225-1.151,7.225s-.092,1.058-.874,1.242a3.787,3.787,0,0,1-2.3-.828c-.184-.138-3.451-2.209-4.648-3.221a.872.872,0,0,1,.046-1.473C12.939,12.375,14.918,10.488,16.114,9.291Z"/></svg></div><div class="contact-widget-info"><strong>تلگرام</strong><span>ارسال پیام</span></div></a>`; }
            if (contactInfo.whatsapp) { contactItemsHTML += `<a href="${contactInfo.whatsapp}" target="_blank" rel="noopener noreferrer" class="contact-widget-item"><div class="contact-widget-icon whatsapp-icon"><svg fill="#ffffff" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="24" viewBox="0 0 30.667 30.667" xml:space="preserve"><g><path d="M30.667,14.939c0,8.25-6.74,14.938-15.056,14.938c-2.639,0-5.118-0.675-7.276-1.857L0,30.667l2.717-8.017 c-1.37-2.25-2.159-4.892-2.159-7.712C0.559,6.688,7.297,0,15.613,0C23.928,0.002,30.667,6.689,30.667,14.939z M15.61,2.382 c-6.979,0-12.656,5.634-12.656,12.56c0,2.748,0.896,5.292,2.411,7.362l-1.58,4.663l4.862-1.545c2,1.312,4.393,2.076,6.963,2.076 c6.979,0,12.658-5.633,12.658-12.559C28.27,8.016,22.59,2.382,15.61,2.382z M23.214,18.38c-0.094-0.151-0.34-0.243-0.708-0.427 c-0.367-0.184-2.184-1.069-2.521-1.189c-0.34-0.123-0.586-0.185-0.832,0.182c-0.243,0.367-0.951,1.191-1.168,1.437 c-0.215,0.245-0.43,0.276-0.799,0.095c-0.369-0.186-1.559-0.57-2.969-1.817c-1.097-0.972-1.838-2.169-2.052-2.536 c-0.217-0.366-0.022-0.564,0.161-0.746c0.165-0.165,0.369-0.428,0.554-0.643c0.185-0.213,0.246-0.364,0.369-0.609 c0.121-0.245,0.06-0.458-0.031-0.643c-0.092-0.184-0.829-1.984-1.138-2.717c-0.307-0.732-0.614-0.611-0.83-0.611 c-0.215,0-0.461-0.03-0.707-0.03S9.897,8.215,9.56,8.582s-1.291,1.252-1.291,3.054c0,1.804,1.321,3.543,1.506,3.787 c0.186,0.243,2.554,4.062,6.305,5.528c3.753,1.465,3.753,0.976,4.429,0.914c0.678-0.062,2.184-0.885,2.49-1.739 C23.307,19.268,23.307,18.533,23.214,18.38z"></path></g></svg></div><div class="contact-widget-info"><strong>واتساپ</strong><span>ارسال پیام</span></div></a>`; }
            
            const widget = document.createElement('div');
            widget.className = 'contact-widget';
            widget.innerHTML = `<div class="contact-widget-container">${contactItemsHTML}</div>`;
            wrapper.appendChild(widget);

            setTimeout(() => widget.classList.add('is-visible'), 10);

            const closeListener = (event) => {
                if (!wrapper.contains(event.target)) {
                    widget.classList.remove('is-visible');
                    setTimeout(() => widget.remove(), 300);
                    document.removeEventListener('click', closeListener, true);
                }
            };
            document.addEventListener('click', closeListener, true);
        });
    }

    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');
};

// START: این تابع را به طور کامل جایگزین کنید
export const showEventScheduleModal = (eventId) => {
    const event = state.allEvents.find(e => e.id == eventId);
    if (!event) return;

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    if (genericModalContent.currentHandler) {
        genericModalContent.removeEventListener('click', genericModalContent.currentHandler);
        genericModalContent.currentHandler = null;
    }

    let scheduleData = [];
    try {
        scheduleData = typeof event.schedule === 'string' ? JSON.parse(event.schedule) : event.schedule;
    } catch (e) {
        console.error("Could not parse event schedule JSON:", e);
        genericModalContent.innerHTML = `<div class="content-box"><p>خطا در بارگذاری جزئیات جلسات.</p></div>`;
        genericModal.classList.add('is-open'); dom.body.classList.add('modal-is-open');
        return;
    }

    if (!Array.isArray(scheduleData) || scheduleData.length === 0) return;

    const userHasRegistered = state.userRegistrations.has(event.id);
    const registrationStatus = userHasRegistered ? state.userRegistrations.get(event.id) : null;
    const canViewLinks = registrationStatus === 'confirmed';

    const scheduleTitle = event.schedule_title || 'برنامه رویداد';
    
    let scheduleHtml = `
        <div class="content-box" style="padding: 1.5rem;">
            <div class="modal-header-actions">
                <h2 class="modal-title-breakable">
                    <span class="modal-title-main">${scheduleTitle}:</span>
                    <span class="modal-title-event">${event.title}</span>
                </h2>
            </div>
            <div class="schedule-cards-container">
    `;

    scheduleData.forEach((session, index) => {
        let linkSectionHTML = '';
        if (canViewLinks && session.link) {
            linkSectionHTML = `
                <div class="session-link-container">
                    <strong class="session-link-label">لینک جلسه:</strong>
                    <div class="session-link-actions">
                        <button class="btn-copy-link" data-link="${session.link}" title="کپی کردن لینک">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <a href="${session.link}" target="_blank" rel="noopener noreferrer" class="btn-join-session">
                            <span>ورود</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                    </div>
                </div>
            `;
        }

        // *** START: ساختار HTML جدید ***
        scheduleHtml += `
            <div class="schedule-card">
                <div class="schedule-card-session-name">
                    ${session.session || `جلسه ${index + 1}`}
                </div>
                <div class="schedule-card-body">
                    <div class="schedule-card-details">
                        <div class="schedule-card-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span>${session.date || '---'}</span>
                        </div>
                        <div class="schedule-card-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>${session.time || '---'}</span>
                        </div>
                        <div class="schedule-card-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>${session.venue || '---'}</span>
                        </div>
                    </div>
                    ${linkSectionHTML}
                </div>
            </div>
        `;
        // *** END: پایان ساختار HTML جدید ***
    });
    
    scheduleHtml += `</div></div>`;

    genericModal.classList.add('wide-modal', 'schedule-modal');
    genericModalContent.innerHTML = scheduleHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    genericModalContent.currentHandler = (e) => handleModalClick(e, event, scheduleData);
    genericModalContent.addEventListener('click', genericModalContent.currentHandler);
};
// END: پایان تابع جایگزین شده
const handleModalClick = async (e, eventData, scheduleData) => {
    const copyBtn = e.target.closest('.btn-copy-link');
    if (copyBtn) {
        const linkToCopy = copyBtn.dataset.link;
        navigator.clipboard.writeText(linkToCopy).then(() => {
            copyBtn.classList.add('copied');
            const checkmarkSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            const originalSVG = copyBtn.innerHTML;
            copyBtn.innerHTML = checkmarkSVG;
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = originalSVG;
            }, 2000);
        });
    }
};
// END: پایان تابع جایگزین شده
export const initializeGlobalUI = () => {
    const header = document.querySelector('.sticky-container');
    if (header) {
        let lastScrollY = window.scrollY;
        const headerHeight = header.offsetHeight;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY && currentScrollY > headerHeight) {
                // Scrolling Down
                header.classList.add('is-hidden');
            } else {
                // Scrolling Up
                header.classList.remove('is-hidden');
            }

            lastScrollY = currentScrollY;
        });
    }
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    if (mobileMenuToggle && mobileDropdownMenu) {
        mobileMenuToggle.addEventListener('click', (e) => { e.stopPropagation(); mobileDropdownMenu.classList.toggle('is-open'); });
        
        document.addEventListener('click', (e) => {
            if (mobileDropdownMenu.classList.contains('is-open') && !mobileDropdownMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                mobileDropdownMenu.classList.remove('is-open');
            }
        });

        mobileDropdownMenu.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                mobileDropdownMenu.classList.remove('is-open');
            }
        });
    }

    // *** کد جدید برای ذخیره آدرس صفحه قبل از ورود ***
    const loginRegisterBtn = document.getElementById('login-register-btn');
    if (loginRegisterBtn) {
        loginRegisterBtn.addEventListener('click', () => {
            // آدرس فعلی را ذخیره می‌کنیم، به شرطی که خود صفحه لاگین نباشد
            if (location.hash && location.hash !== '#/login') {
                sessionStorage.setItem('redirectAfterLogin', location.hash);
            }
        });
    }

    const genericModal = document.getElementById('generic-modal');
    if (genericModal) {
        const closeGenericModalBtn = genericModal.querySelector('.close-modal');
        const closeGenericModal = () => { dom.body.classList.remove('modal-is-open'); genericModal.classList.remove('is-open'); };
        closeGenericModalBtn.addEventListener('click', closeGenericModal);
        genericModal.addEventListener('click', (e) => { if (e.target === genericModal) closeGenericModal(); });
    }

    if (dom.mainContent) {
        dom.mainContent.addEventListener('click', (e) => {
            const authorTrigger = e.target.closest('.clickable-author');
            if (authorTrigger && authorTrigger.dataset.authorId) {
                e.preventDefault();
                showMemberModal(authorTrigger.dataset.authorId);
                return;
            }

            const scheduleBtn = e.target.closest('.btn-view-schedule');
            if (scheduleBtn && !scheduleBtn.disabled) {
                e.preventDefault();
                const eventId = scheduleBtn.dataset.eventId;
                showEventScheduleModal(eventId);
                return;
            }

            const eventCard = e.target.closest('.event-card');
            if (eventCard && !eventCard.classList.contains('past-event')) {
                if (!e.target.closest('.event-actions button, .event-actions a')) {
                    e.preventDefault();
                    const detailLink = eventCard.querySelector('a[href*="#/events/"]');
                    if (detailLink && detailLink.hash) {
                        const path = detailLink.hash.substring(1);
                        showEventModal(path);
                    }
                }
            }

            const courseHeader = e.target.closest('.course-card-chart.is-expandable .course-main-info');
            if (courseHeader) {
                e.preventDefault();
                const courseCard = courseHeader.closest('.course-card-chart');
                courseCard.classList.toggle('is-expanded');
            }

            const registerBtn = e.target.closest('.btn-event-register');
            if (registerBtn && !registerBtn.disabled) {
                e.preventDefault();
                const eventId = registerBtn.dataset.eventId;
                showEventRegistrationModal(eventId);
            }
        });
    }
    
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.addEventListener('click', (e) => {
            if (e.target.closest('#logout-btn')) {
                return;
            }
            showProfileModal();
        });
    }
};

export const initializeContactForm = () => {
    const contactForm = dom.mainContent.querySelector('#contact-form');
    if (!contactForm || contactForm.dataset.listenerAttached) return;

    const nameInput = contactForm.querySelector('#contact-name');
    const emailInput = contactForm.querySelector('#contact-email');

    // تابعی برای پر کردن خودکار اطلاعات کاربر
    const prefillUserInfo = () => {
        if (state.user) {
            const displayName = state.profile?.full_name || state.user.email.split('@')[0];
            nameInput.value = displayName;
            emailInput.value = state.user.email;
            nameInput.readOnly = true;
            emailInput.readOnly = true;
            nameInput.classList.add('prefilled');
            emailInput.classList.add('prefilled');
        }
    };

    prefillUserInfo(); // اجرای اولیه هنگام بارگذاری صفحه

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusBox = contactForm.querySelector('.form-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const formData = new FormData(contactForm);
        const formProps = Object.fromEntries(formData);

        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = 'در حال ارسال...';

        const { error } = await supabaseClient
            .from('contacts')
            .insert({ name: formProps.نام, email: formProps.ایمیل, message: formProps.پیام });

        submitBtn.disabled = false;
        submitBtn.textContent = 'ارسال پیام';

        if (error) {
            const errorMessage = error.message.includes('network') 
                ? 'ارسال پیام با مشکل مواجه شد. لطفاً اتصال اینترنت خود را بررسی کنید.'
                : 'خطایی در سرور رخ داده است. لطفاً بعداً تلاش کنید.';
            showStatus(statusBox, errorMessage, 'error');
        } else {
            showStatus(statusBox, 'پیام شما با موفقیت ارسال شد.', 'success');
            contactForm.reset();
            // **تغییر اصلی اینجاست**
            // پس از ریست کردن فرم، اطلاعات کاربر لاگین شده را دوباره پر می‌کنیم.
            prefillUserInfo();
        }
    });
    contactForm.dataset.listenerAttached = 'true';
};

export const initializeAdminForms = () => {
    const journalForm = document.getElementById('add-journal-form');
    if (!journalForm || journalForm.dataset.listenerAttached) return;

    const formTitle = document.getElementById('journal-form-title');
    const submitBtn = document.getElementById('journal-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const hiddenIdInput = document.getElementById('journal-id');
    const adminListContainer = document.getElementById('journal-admin-list');

    const resetForm = () => {
        journalForm.reset();
        hiddenIdInput.value = '';
        formTitle.textContent = 'درج نشریه جدید';
        submitBtn.textContent = 'افزودن نشریه';
        cancelBtn.style.display = 'none';
        journalForm.scrollIntoView({ behavior: 'smooth' });
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const statusBox = journalForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;

        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال ویرایش...' : 'در حال افزودن...';
        hideStatus(statusBox);

        const formData = new FormData(journalForm);
        const entryData = {
            title: formData.get('title'),
            issueNumber: formData.get('issueNumber') ? parseInt(formData.get('issueNumber'), 10) : null,
            date: formData.get('date'),
            summary: formData.get('summary'),
            coverUrl: formData.get('coverUrl'),
            fileUrl: formData.get('fileUrl')
        };

        try {
            if (isEditing) {
                await updateJournalEntry(isEditing, entryData);
                showStatus(statusBox, 'نشریه با موفقیت ویرایش شد.', 'success');
            } else {
                await addJournalEntry(entryData);
                showStatus(statusBox, 'نشریه با موفقیت افزوده شد.', 'success');
            }
            state.allJournalIssues = []; // Clear cache
            await supabaseClient.from('journal').select('*').then(({ data }) => {
                state.allJournalIssues = data || [];
                components.renderJournalAdminList();
            });
            resetForm();
        } catch (error) {
            showStatus(statusBox, 'عملیات با خطا مواجه شد.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    };
    
    const handleListClick = async (event) => {
        const editBtn = event.target.closest('.edit-journal-btn');
        const deleteBtn = event.target.closest('.delete-journal-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const issue = state.allJournalIssues.find(j => j.id == id);
            if (!issue) return;

            hiddenIdInput.value = issue.id;
            document.getElementById('journal-title').value = issue.title || '';
            document.getElementById('journal-issue').value = issue.issueNumber || '';
            document.getElementById('journal-date').value = issue.date || '';
            document.getElementById('journal-summary').value = issue.summary || '';
            document.getElementById('journal-cover').value = issue.coverUrl || '';
            document.getElementById('journal-file').value = issue.fileUrl || '';

            formTitle.textContent = 'ویرایش نشریه';
            submitBtn.textContent = 'ذخیره تغییرات';
            cancelBtn.style.display = 'inline-block';
            journalForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('آیا از حذف این نشریه مطمئن هستید؟ این عملیات غیرقابل بازگشت است.')) {
                try {
                    deleteBtn.textContent = '...';
                    deleteBtn.disabled = true;
                    await deleteJournalEntry(id);
                    state.allJournalIssues = state.allJournalIssues.filter(j => j.id != id);
                    components.renderJournalAdminList();
                } catch (error) {
                    alert('خطا در حذف نشریه.');
                    deleteBtn.textContent = 'حذف';
                    deleteBtn.disabled = false;
                }
            }
        }
    };

    journalForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    if (adminListContainer) {
        adminListContainer.addEventListener('click', handleListClick);
    }
    journalForm.dataset.listenerAttached = 'true';
};

const showTimePickerModal = (callback) => {
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    const modalHtml = `
        <div class="content-box" style="text-align: center; padding-top: 4rem;">
            <h2>انتخاب ساعت</h2>
            <p>لطفا ساعت دقیق واریز وجه را انتخاب کنید.</p>
            <div class="form-group" style="margin-top: 2rem;">
                <label for="time-picker-input" class="visually-hidden">ساعت واریز</label>
                <input type="time" id="time-picker-input" name="time-picker" required style="width: 100%; max-width: 250px;">
            </div>
            <div class="form-actions">
                <button id="confirm-time-btn" class="btn btn-primary btn-full">تایید</button>
            </div>
        </div>
    `;
    
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = modalHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    const confirmBtn = genericModalContent.querySelector('#confirm-time-btn');
    confirmBtn.addEventListener('click', () => {
        const selectedTime = genericModalContent.querySelector('#time-picker-input').value;
        if (selectedTime) {
            callback(selectedTime);
            genericModal.classList.remove('is-open');
            dom.body.classList.remove('modal-is-open');
        }
    });
};

// src/assets/js/modules/ui.js

export const showEventRegistrationModal = async (eventId) => {
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    if (!state.user) {
        const modalHtml = `<div class="content-box" style="text-align: center;"><h2>ابتدا وارد شوید</h2><p>برای ثبت‌نام در رویدادها، باید وارد حساب کاربری خود شوید.</p><br><div class="form-actions"><a href="#/login" id="go-to-login-btn" class="btn btn-primary btn-full">ورود یا ثبت‌نام</a></div></div>`;
        genericModalContent.innerHTML = modalHtml;
        genericModalContent.querySelector('#go-to-login-btn')?.addEventListener('click', () => {
            genericModal.classList.remove('is-open');
            dom.body.classList.remove('modal-is-open');
        });
        genericModal.classList.add('wide-modal');
        dom.body.classList.add('modal-is-open');
        genericModal.classList.add('is-open');
        return;
    }

    genericModalContent.innerHTML = `<div class="content-box" style="text-align: center;"><p>در حال بررسی وضعیت ثبت‌نام شما...</p></div>`;
    genericModal.classList.add('wide-modal');
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    const { data: existingRegistration, error: fetchError } = await getEventRegistration(eventId, state.user.id);

    if (fetchError && fetchError.code !== 'PGRST116') {
        genericModalContent.innerHTML = `<div class="content-box" style="text-align: center;"><p>خطا در بررسی وضعیت. لطفاً دوباره تلاش کنید.</p></div>`;
        return;
    }

    if (existingRegistration) {
        let paymentInfoHTML = '';
        if (existingRegistration.card_last_four_digits) {
            paymentInfoHTML = `<div class="info-row"><span>چهار رقم آخر کارت:</span><strong>${existingRegistration.card_last_four_digits}</strong></div><div class="info-row"><span>ساعت واریز:</span><strong>${existingRegistration.transaction_time}</strong></div>`;
        }
        
        if (existingRegistration.status === 'rejected') {
            const rejectedModalHtml = `
                <div class="content-box">
                    <h2 style="color: #dc3545;">وضعیت ثبت‌نام: رد شده</h2>
                    <p>متاسفانه ثبت‌نام شما تایید نشده است. این معمولاً به دلیل اطلاعات ناقص یا نادرست در بخش پرداخت است.</p>
                    <p style="margin-top: 1rem;"><strong>اطلاعات ثبت شده شما:</strong></p>
                    <div class="registration-status-details">
                        <div class="info-row"><span>نام:</span><strong>${existingRegistration.full_name}</strong></div>
                        <div class="info-row"><span>کد دانشجویی:</span><strong>${existingRegistration.student_id}</strong></div>
                        ${paymentInfoHTML}
                    </div>
                    <p style="margin-top: 1rem;">می‌توانید اطلاعات خود را ویرایش کرده و مجدداً برای بررسی ارسال کنید یا با پشتیبانی تماس بگیرید.</p>
                    
                    <div class="form-actions rejected-modal-actions">
                        <a href="tel:09339170324" class="btn btn-secondary btn-contact-support">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span>تماس</span>
                            <span class="support-phone-number">09339170324</span>
                        </a>
                        <button id="edit-rejected-registration-btn" class="btn btn-primary">ویرایش اطلاعات</button>
                    </div>
                    </div>`;
            genericModalContent.innerHTML = rejectedModalHtml;

            const editBtn = genericModalContent.querySelector('#edit-rejected-registration-btn');
            if (editBtn) {
                editBtn.addEventListener('click', async () => {
                    if (confirm("برای ویرایش، اطلاعات قبلی شما حذف و فرم ثبت‌نام مجدداً نمایش داده می‌شود. آیا ادامه می‌دهید؟")) {
                        editBtn.disabled = true;
                        editBtn.textContent = 'لطفا صبر کنید...';
                        const { success } = await deleteEventRegistration(existingRegistration.id);
                        if (success) {
                            state.userRegistrations.delete(parseInt(eventId, 10));
                            await showEventRegistrationModal(eventId);
                        } else {
                            alert('خطا در پردازش درخواست. لطفاً دوباره تلاش کنید.');
                            editBtn.disabled = false;
                            editBtn.textContent = 'ویرایش اطلاعات';
                        }
                    }
                });
            }
            return;
        }

        const statusText = existingRegistration.status === 'pending' ? 'در انتظار تایید' : 'تایید شده';
        const statusClass = existingRegistration.status === 'pending' ? 'status-pending' : 'status-confirmed';

        const editButtonHTML = existingRegistration.status === 'pending' 
            ? `<button id="edit-registration-btn" class="btn btn-primary" style="flex-grow: 1;">ویرایش اطلاعات</button>` 
            : '';

        const statusModalHtml = `
            <div class="content-box">
                <h2>وضعیت ثبت‌نام شما</h2>
                <p>شما قبلاً در این رویداد ثبت‌نام کرده‌اید. اطلاعات شما به شرح زیر است:</p>
                <div class="registration-status-details">
                    <div class="info-row"><span>وضعیت:</span><strong class="${statusClass}">${statusText}</strong></div><hr>
                    <div class="info-row"><span>نام:</span><strong>${existingRegistration.full_name}</strong></div>
                    <div class="info-row"><span>کد دانشجویی:</span><strong>${existingRegistration.student_id}</strong></div>
                    <div class="info-row"><span>تلفن:</span><strong>${existingRegistration.phone_number}</strong></div>
                    ${paymentInfoHTML}
                </div>
                
                <div class="form-actions" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button id="close-status-modal" class="btn btn-secondary" style="flex-grow: 1;">بستن</button>
                    ${editButtonHTML}
                </div>
            </div>`;

        genericModalContent.innerHTML = statusModalHtml;

        genericModalContent.querySelector('#close-status-modal').addEventListener('click', () => {
            genericModal.classList.remove('is-open');
            dom.body.classList.remove('modal-is-open');
        });
        
        const editBtn = genericModalContent.querySelector('#edit-registration-btn');
        if (editBtn) {
            editBtn.addEventListener('click', async () => {
                if (confirm("برای ویرایش، اطلاعات قبلی شما حذف و فرم ثبت‌نام مجدداً نمایش داده می‌شود. آیا ادامه می‌دهید؟")) {
                    editBtn.disabled = true;
                    editBtn.textContent = 'لطفا صبر کنید...';
                    const { success } = await deleteEventRegistration(existingRegistration.id);
                    if (success) {
                        state.userRegistrations.delete(parseInt(eventId, 10));
                        await showEventRegistrationModal(eventId);
                    } else {
                        alert('خطا در پردازش درخواست. لطفاً دوباره تلاش کنید.');
                        editBtn.disabled = false;
                        editBtn.textContent = 'ویرایش اطلاعات';
                    }
                }
            });
        }
    } else {
        const event = state.allEvents.find(e => e.id == eventId);
        if (!event) return;

        const profile = state.profile;
        const user = state.user;
        const paymentInfo = event.payment_card_number;
        const isPaidEvent = event.cost && event.cost.toLowerCase() !== 'رایگان' && paymentInfo && paymentInfo.number;
        
        let paymentSectionHTML = '';
        let paymentFieldsHTML = '';
        
        const now = new Date();
        const defaultHour = String(now.getHours()).padStart(2, '0');
        const defaultMinute = String(now.getMinutes()).padStart(2, '0');
        let transactionTime = `${defaultHour}:${defaultMinute}`;

        if (isPaidEvent) {
            const cardHolderName = paymentInfo.name || 'انجمن علمی';
            const cardNumber = paymentInfo.number || 'شماره کارتی ثبت نشده';
            paymentSectionHTML = `<div class="payment-info-section"><p>هزینه: <strong>${event.cost}</strong></p><p>لطفاً مبلغ را به کارت زیر واریز نمایید:</p><div class="payment-details-box" style="text-align: center; padding: 1rem; border: 1px dashed gray; margin: 1rem 0; border-radius: 8px;"><p style="margin:0;">به نام: <strong>${cardHolderName}</strong></p><div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 0.5rem; direction: ltr;"><strong id="card-to-copy">${cardNumber}</strong><button type="button" id="copy-card-btn" class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">کپی</button></div></div></div>`;
            
            paymentFieldsHTML = `
                <br>
                <hr>
                <br>
                <div class="form-row">
                    <div class="form-group">
                        <label for="reg-card-digits">۴ رقم آخر کارت پرداختی</label>
                        <input type="text" id="reg-card-digits" name="card_digits" inputmode="numeric" pattern="[0-9]{4}" required dir="ltr">
                    </div>
                    <div class="form-group time-picker-container" style="position: relative;">
                        <label for="open-time-picker-btn">ساعت واریز</label>
                        <button type="button" id="open-time-picker-btn" class="time-picker-btn" dir="ltr">
                            <span id="reg-tx-time-display">${transactionTime}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="time-icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>
                        <div id="time-picker-widget" class="time-picker-widget" style="display: none;">
                            <div class="time-picker-inputs">
                                <div class="time-column">
                                    <button type="button" class="time-stepper-btn" data-unit="minute" data-step="-1">▲</button>
                                    <div class="time-picker-label">دقیقه</div>
                                    <div class="time-scroll-container" id="minute-scroll"></div>
                                    <button type="button" class="time-stepper-btn" data-unit="minute" data-step="1">▼</button>
                                </div>
                                <span class="time-separator">:</span>
                                <div class="time-column">
                                    <button type="button" class="time-stepper-btn" data-unit="hour" data-step="-1">▲</button>
                                    <div class="time-picker-label">ساعت</div>
                                    <div class="time-scroll-container" id="hour-scroll"></div>
                                    <button type="button" class="time-stepper-btn" data-unit="hour" data-step="1">▼</button>
                                </div>
                            </div>
                            <button type="button" id="confirm-time-btn" class="btn btn-primary btn-full">تایید</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            paymentSectionHTML = `<div class="payment-info-section"><p>هزینه شرکت در رویداد: <strong>رایگان</strong></p></div>`;
        }

        const modalHtml = `
            <div class="content-box">
                <h2>ثبت‌نام در: ${event.title}</h2>${paymentSectionHTML}
                <form id="event-registration-form" style="margin-top: ${isPaidEvent ? '2rem' : '1rem'};">
                    <div class="form-row"><div class="form-group"><label for="reg-name">نام و نام خانوادگی</label><input type="text" id="reg-name" name="name" value="${profile?.full_name || ''}" required></div><div class="form-group"><label for="reg-email">ایمیل</label><input type="email" id="reg-email" name="email" value="${user?.email || ''}" required disabled style="background-color: rgba(128,128,128,0.1);" dir="ltr"></div></div>
                    <div class="form-row"><div class="form-group"><label for="reg-student-id">کد دانشجویی</label><input type="text" id="reg-student-id" name="student_id" inputmode="numeric" required dir="ltr"></div><div class="form-group"><label for="reg-phone">شماره تلفن</label><input type="tel" id="reg-phone" name="phone_number" inputmode="tel" required></div></div>
                    ${paymentFieldsHTML}
                    <div class="form-group" style="margin-top: 1.5rem;"><label style="display: flex; align-items: center; cursor: pointer;"><input type="checkbox" id="reg-confirm" name="confirm" required style="width: auto; margin-left: 0.5rem;"><span>اطلاعات وارد شده را تایید می‌کنم ${isPaidEvent ? ' و پرداخت را انجام داده‌ام.' : '.'}</span></label></div>
                    <div class="form-status"></div><br>
                    <button type="submit" class="btn btn-primary btn-full">${isPaidEvent ? 'ارسال و ثبت‌نام موقت' : 'ثبت‌نام نهایی'}</button>
                </form>
            </div>`;
        
        genericModalContent.innerHTML = modalHtml;

        // --- START: COPY BUTTON & TIME PICKER LOGIC ---
        const copyCardBtn = genericModalContent.querySelector('#copy-card-btn');
        if (copyCardBtn) {
            copyCardBtn.addEventListener('click', () => {
                const cardNumberElement = genericModalContent.querySelector('#card-to-copy');
                if (cardNumberElement) {
                    const cardNumber = cardNumberElement.textContent.replace(/-/g, '');
                    navigator.clipboard.writeText(cardNumber).then(() => {
                        const originalText = copyCardBtn.textContent;
                        copyCardBtn.textContent = 'کپی شد!';
                        setTimeout(() => {
                            copyCardBtn.textContent = originalText;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy card number: ', err);
                        alert('خطا در کپی کردن شماره کارت.');
                    });
                }
            });
        }

// --- START: TIME PICKER LOGIC (with Magnetic Scroll & Centering) ---
        const openTimePickerBtn = genericModalContent.querySelector('#open-time-picker-btn');
        const timePickerWidget = genericModalContent.querySelector('#time-picker-widget');

        if (openTimePickerBtn && timePickerWidget) {
            const hourScroll = timePickerWidget.querySelector('#hour-scroll');
            const minuteScroll = timePickerWidget.querySelector('#minute-scroll');
            const timeDisplay = openTimePickerBtn.querySelector('#reg-tx-time-display');

            let currentHour = parseInt(defaultHour, 10);
            let currentMinute = parseInt(defaultMinute, 10);
            const itemHeight = 40;
            const containerHeight = 120;
            const paddingHeight = (containerHeight - itemHeight) / 2;
            const paddingDiv = `<div style="height: ${paddingHeight}px; flex-shrink: 0;"></div>`;

            // Populate hour and minute scrolls with padding
            let hourHTML = paddingDiv;
            for (let i = 0; i < 24; i++) { hourHTML += `<div class="scroll-item">${String(i).padStart(2, '0')}</div>`; }
            hourHTML += paddingDiv;
            hourScroll.innerHTML = hourHTML;

            let minuteHTML = paddingDiv;
            for (let i = 0; i < 60; i++) { minuteHTML += `<div class="scroll-item">${String(i).padStart(2, '0')}</div>`; }
            minuteHTML += paddingDiv;
            minuteScroll.innerHTML = minuteHTML;

            const updateActiveItems = () => {
                hourScroll.querySelectorAll('.scroll-item').forEach((item, i) => item.classList.toggle('active', i === currentHour));
                minuteScroll.querySelectorAll('.scroll-item').forEach((item, i) => item.classList.toggle('active', i === currentMinute));
            };

            const scrollToTime = (container, value, smooth = true) => {
                container.scrollTo({ top: value * itemHeight, behavior: smooth ? 'smooth' : 'auto' });
            };
            
            const debounce = (func, delay) => {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), delay);
                };
            };

            const snapToTime = (container, isHour) => {
                const index = Math.round(container.scrollTop / itemHeight);
                scrollToTime(container, index);
                
                if (isHour) currentHour = index;
                else currentMinute = index;
                
                setTimeout(updateActiveItems, 150);
            };

            const debouncedSnapHour = debounce(() => snapToTime(hourScroll, true), 150);
            const debouncedSnapMinute = debounce(() => snapToTime(minuteScroll, false), 150);

            hourScroll.addEventListener('scroll', debouncedSnapHour);
            minuteScroll.addEventListener('scroll', debouncedSnapMinute);

            // Initial positioning
            scrollToTime(hourScroll, currentHour, false);
            scrollToTime(minuteScroll, currentMinute, false);
            updateActiveItems();

            timePickerWidget.addEventListener('click', (e) => {
                const stepper = e.target.closest('.time-stepper-btn');
                if (stepper) {
                    const unit = stepper.dataset.unit;
                    const step = parseInt(stepper.dataset.step, 10);
                    if (unit === 'hour') {
                        currentHour = (currentHour + 24 - step) % 24;
                        scrollToTime(hourScroll, currentHour);
                    } else if (unit === 'minute') {
                        currentMinute = (currentMinute + 60 - step) % 60;
                        scrollToTime(minuteScroll, currentMinute);
                    }
                    setTimeout(updateActiveItems, 150);
                }

                if (e.target.closest('#confirm-time-btn')) {
                    transactionTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
                    timeDisplay.textContent = transactionTime;
                    timePickerWidget.style.display = 'none';
                }
            });

            openTimePickerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = timePickerWidget.style.display === 'none' || timePickerWidget.style.display === '';
                
                if (isHidden) {
                    timePickerWidget.classList.add('show-above'); // Always open upwards
                    timePickerWidget.style.display = 'block';
                    
                    scrollToTime(hourScroll, currentHour, false);
                    scrollToTime(minuteScroll, currentMinute, false);
                    updateActiveItems();
                } else {
                    timePickerWidget.style.display = 'none';
                }
            });
            
            const closeListener = (e) => {
                if (!timePickerWidget.contains(e.target) && !openTimePickerBtn.contains(e.target)) {
                    timePickerWidget.style.display = 'none';
                    document.removeEventListener('click', closeListener);
                }
            };
            
            openTimePickerBtn.addEventListener('click', () => {
                if (timePickerWidget.style.display === 'block') {
                    setTimeout(() => document.addEventListener('click', closeListener), 0);
                }
            });
       
            
            document.addEventListener('click', (e) => {
                if (!timePickerWidget.contains(e.target) && !openTimePickerBtn.contains(e.target)) {
                    timePickerWidget.style.display = 'none';
                }
            }, { once: true });
        }
        // --- END: LOGIC ---

        const registrationForm = genericModalContent.querySelector('#event-registration-form');
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = registrationForm.querySelector('button[type="submit"]');
            const statusBox = registrationForm.querySelector('.form-status');
            hideStatus(statusBox);

            if (isPaidEvent && !transactionTime) {
                showStatus(statusBox, 'لطفاً ساعت واریز را انتخاب کنید.', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'در حال ثبت ...';
            const formData = new FormData(registrationForm);

            const registrationData = { 
                event_id: event.id, 
                user_id: user.id, 
                full_name: formData.get('name'), 
                student_id: formData.get('student_id'), 
                email: user.email, 
                phone_number: formData.get('phone_number'), 
                status: isPaidEvent ? 'pending' : 'confirmed', 
                card_last_four_digits: isPaidEvent ? formData.get('card_digits') : null, 
                transaction_time: isPaidEvent ? transactionTime : null 
            };
            
            const { data: newRegistration, error } = await supabaseClient
                .from('event_registrations')
                .insert(registrationData)
                .select()
                .single();

            if (error) {
                showStatus(statusBox, 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = isPaidEvent ? 'ارسال و ثبت‌نام موقت' : 'ثبت‌نام نهایی';
            } else {
                state.userRegistrations.set(newRegistration.event_id, newRegistration.status);
                const successMessage = isPaidEvent ? 'اطلاعات شما با موفقیت ثبت شد و پس از بررسی توسط ادمین، نهایی خواهد شد.' : 'ثبت‌نام شما در این رویداد رایگان با موفقیت انجام شد!';
                genericModalContent.innerHTML = `<div class="content-box" style="text-align: center;"><h2>ثبت‌نام دریافت شد!</h2><p>${successMessage}</p></div>`;
                setTimeout(() => { 
                    genericModal.classList.remove('is-open'); 
                    dom.body.classList.remove('modal-is-open');
                    if (location.hash.startsWith('#/events')) {
                        components.renderEventsPage();
                    }
                }, 4000);
            }
        });
    }
};


// این دو تابع را در انتهای فایل ui.js جایگزین کنید

const buildCommentTree = (comments) => {
    const commentMap = new Map();
    const rootComments = [];
    if (!comments) return rootComments;

    comments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
    });

    comments.forEach(comment => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
            commentMap.get(comment.parent_id).replies.push(comment);
        } else {
            rootComments.push(comment);
        }
    });
    return rootComments;
};

const renderComment = (comment) => {
    // تابع کمکی برای بررسی اینکه آیا یک کامنت، پاسخی دارد که حذف نشده باشد
    const hasVisibleReplies = (c) => {
        // اگر کامنت پاسخی ندارد، نتیجه منفی است
        if (!c.replies || c.replies.length === 0) {
            return false;
        }
        // بررسی می‌کند که آیا حداقل یکی از پاسخ‌ها یا قابل مشاهده است (حذف نشده)
        // یا خودش پاسخی قابل مشاهده دارد (بررسی بازگشتی)
        return c.replies.some(reply => reply.user_id !== null || hasVisibleReplies(reply));
    };

    // اگر کامنت حذف شده باشد
    if (comment.user_id === null) {
        // فقط در صورتی آن را نمایش بده که پاسخ قابل مشاهده‌ای داشته باشد
        if (hasVisibleReplies(comment)) {
            return `
        <div class="comment-item is-deleted" id="comment-${comment.id}" data-comment-id="${comment.id}">
            <div class="comment-main">
                <div class="comment-content">
                    <p><em>[این دیدگاه حذف شده است]</em></p>
                </div>
            </div>
            <div class="comment-replies">
                ${(comment.replies || []).map(reply => renderComment(reply)).join('')}
            </div>
        </div>
    `;
        } else {
            // در غیر این صورت، کامنت حذف شده را اصلا نمایش نده
            return '';
        }
    }

    // بقیه کدهای تابع برای نمایش کامنت‌های عادی بدون تغییر باقی می‌ماند
    const userVote = comment.user_vote;
    const authorName = comment.author?.full_name || 'یک کاربر';
    const authorAvatar = (state.user?.id === comment.user_id ? state.user.user_metadata?.avatar_url : null) || DEFAULT_AVATAR_URL;
    
    const deleteButtonHTML = (state.user && state.user.id === comment.user_id)
        ? `<button class="btn-text delete-btn" title="حذف">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
           </button>`
        : '';

    const sanitizedContent = sanitizeHTML(comment.content);

    return `
        <div class="comment-item" id="comment-${comment.id}" data-comment-id="${comment.id}">
            <div class="comment-main">
                <div class="comment-header">
                    <img src="${authorAvatar}" alt="${authorName}" class="comment-avatar">
                    <strong>${authorName}</strong>
                    <span class="comment-date">${formatTimeAgo(comment.created_at)}</span>
                </div>
                <div class="comment-content">
                    <p>${sanitizedContent}</p>
                </div>
                <div class="comment-actions">
                    <button class="btn-text reply-btn" title="پاسخ" ${!state.user ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                    </button>
                    ${deleteButtonHTML}
                    <div class="comment-votes">
                        <button class="vote-btn like-comment ${userVote === 1 ? 'active' : ''}" data-vote="1" ${!state.user ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            <span class="like-count">${comment.likes || 0}</span>
                        </button>
                    </div>
                </div>
                <div class="reply-form-container" style="display: none;"></div>
            </div>
            <div class="comment-replies">
                ${(comment.replies || []).map(reply => renderComment(reply)).join('')}
            </div>
        </div>
    `;
};

export const renderInteractionsSection = (newsId, likeStatus, comments) => {
    const commentTree = buildCommentTree(comments);
    const commentCount = comments ? comments.filter(c => c.user_id !== null && c.parent_id === null).length : 0;
    const isLiked = likeStatus?.is_liked || false;
    const likeCount = likeStatus?.like_count || 0;

    const commentFormHTML = state.user ? `
        <form id="comment-form" data-news-id="${newsId}">
            <h4>دیدگاه خود را بنویسید</h4>
            <div class="form-group">
                <textarea id="comment-content" placeholder="نظر شما..." required></textarea>
            </div>
            <div class="form-actions" style="justify-content: flex-end; flex-direction: row;">
                <button type="submit" class="btn btn-primary">ارسال دیدگاه</button>
            </div>
            <div class="form-status"></div>
        </form>
    ` : `
        <div class="login-prompt">
            <p>برای ثبت دیدگاه یا پسندیدن این مطلب، لطفاً <a href="#/login">وارد شوید</a>.</p>
        </div>
    `;

    const commentsHTML = commentTree.length > 0 ? commentTree.map(comment => renderComment(comment)).join('') : '<p>هنوز دیدگاهی برای این مطلب ثبت نشده است.</p>';

    return `
        <div class="interactions-section">
            <div class="interactions-header">
                <h3>دیدگاه‌ها (${toPersianNumber(commentCount)})</h3>
                <button id="like-btn" class="btn btn-secondary like-btn ${isLiked ? 'liked' : ''}" ${!state.user ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span id="like-count">${toPersianNumber(likeCount)}</span>
                </button>
            </div>
            <div class="comments-list">
                ${commentsHTML}
            </div>
            <hr class="post-divider">
            ${commentFormHTML}
        </div>
    `;
};


export const initializeInteractions = (newsId) => {
    const container = document.querySelector('.interactions-section');
    if (!container) return;

    const toEnglishNumber = (str) => {
        return String(str).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    };
    

    // <<-- تابع جدید برای مدیریت نمایش کامنت‌های حذف شده -->>
    const cleanupDeletedComments = (element) => {
        let current = element;
        while (current && current.classList.contains('is-deleted')) {
            const repliesContainer = current.querySelector('.comment-replies');
            const hasVisibleChildren = repliesContainer && repliesContainer.querySelector('.comment-item');
            
            if (hasVisibleChildren) {
                break; // اگر فرزند فعال دارد، متوقف شو
            }
            
            const parent = current.parentElement.closest('.comment-item');
            current.remove();
            current = parent;
        }
    };

    // ... (بخش‌های مربوط به لایک و ارسال کامنت اصلی بدون تغییر باقی می‌مانند) ...
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
            if (!state.user) return;
            likeBtn.disabled = true;
            const { data, error } = await toggleLike(newsId, state.user.id);
            if (error) { console.error("Failed to toggle like"); }
            else {
                likeBtn.classList.toggle('liked', data.is_liked);
                document.getElementById('like-count').textContent = toPersianNumber(data.like_count);
            }
            likeBtn.disabled = false;
        });
    }

    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contentEl = document.getElementById('comment-content');
            const content = contentEl.value;
            if (!content.trim()) return;

            const submitBtn = commentForm.querySelector('button[type="submit"]');
            const statusBox = commentForm.querySelector('.form-status');
            
            submitBtn.disabled = true;
            hideStatus(statusBox);

            try {
                const { data: newCommentData, error } = await addComment(newsId, state.user.id, content);
                
                if (error) {
                    showStatus(statusBox, 'خطا در ارسال دیدگاه.');
                } else {
                    const newCommentForRender = { ...newCommentData, author: { full_name: state.profile?.full_name || state.user.email.split('@')[0], avatar_url: state.profile?.avatar_url || state.user.user_metadata?.avatar_url }, likes: 0, user_vote: null, replies: [] };
                    const commentsList = document.querySelector('.comments-list');
                    const noCommentMessage = commentsList.querySelector('p');
                    if (noCommentMessage) noCommentMessage.remove();
                    
                    commentsList.insertAdjacentHTML('beforeend', renderComment(newCommentForRender));
                    
                    contentEl.value = '';
                    const commentCountEl = document.querySelector('.interactions-header h3');
                    const countText = toEnglishNumber(commentCountEl.textContent.match(/[۰-۹0-9]+/)?.[0] || '0');
                    const currentCount = parseInt(countText, 10);
                    commentCountEl.textContent = `دیدگاه‌ها (${toPersianNumber(currentCount + 1)})`;
                }
            } finally {
                submitBtn.disabled = false;
            }
        });
    }


    const commentsList = document.querySelector('.comments-list');
    if (commentsList) {
        commentsList.addEventListener('click', async (e) => {
            // ... (بخش مربوط به لایک کامنت و نمایش فرم پاسخ بدون تغییر) ...
            const voteBtn = e.target.closest('.vote-btn');
            if (voteBtn && state.user) {
                const commentItem = voteBtn.closest('.comment-item');
                const commentId = commentItem.dataset.commentId;
                const voteType = parseInt(voteBtn.dataset.vote, 10);
                commentItem.querySelectorAll('.vote-btn').forEach(b => b.disabled = true);
                const { data, error } = await toggleCommentVote(commentId, state.user.id, voteType);
                if (error) { console.error("Failed to vote on comment"); }
                else {
                    commentItem.querySelector('.like-count').textContent = toPersianNumber(data.likes);
                    const likeButton = commentItem.querySelector('.like-comment');
                    likeButton.classList.toggle('active', data.user_vote === 1);
                }
                commentItem.querySelectorAll('.vote-btn').forEach(b => b.disabled = false);
            }

            const replyBtn = e.target.closest('.reply-btn');
            if (replyBtn) {
                const commentItem = replyBtn.closest('.comment-item');
                const replyContainer = commentItem.querySelector('.reply-form-container');
                if (replyContainer.style.display === 'none') {
                    replyContainer.innerHTML = `<form class="reply-form"><div class="form-group"><textarea placeholder="پاسخ شما..." required></textarea></div><div class="form-actions" style="justify-content: flex-end; flex-direction: row;"><button type="button" class="btn btn-secondary cancel-reply">انصراف</button><button type="submit" class="btn btn-primary">ارسال پاسخ</button></div><div class="form-status"></div></form>`;
                    replyContainer.style.display = 'block';
                    replyContainer.querySelector('textarea').focus();
                } else {
                    replyContainer.style.display = 'none';
                    replyContainer.innerHTML = '';
                }
            }

            const cancelBtn = e.target.closest('.cancel-reply');
            if (cancelBtn) {
                const replyContainer = cancelBtn.closest('.reply-form-container');
                replyContainer.style.display = 'none';
                replyContainer.innerHTML = '';
            }

            // <<-- منطق نهایی و جدید برای دکمه حذف -->>
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                if (confirm('آیا از حذف این دیدگاه مطمئن هستید؟')) {
                    const commentItem = deleteBtn.closest('.comment-item');
                    const commentId = commentItem.dataset.commentId;
                    
                    deleteBtn.disabled = true;
                    const { success } = await deleteComment(commentId, state.user.id);

                    if (success) {
                        const commentMain = commentItem.querySelector('.comment-main');
                        if (commentMain) {
                            commentMain.innerHTML = `
                                <div class="comment-content">
                                    <p><em>[این دیدگاه حذف شده است]</em></p>
                                </div>`;
                            commentItem.classList.add('is-deleted');
                        }
                        
                        // تابع جدید را برای تمیزکاری فراخوانی می‌کنیم
                        cleanupDeletedComments(commentItem);

                        const commentCountEl = document.querySelector('.interactions-header h3');
                        const countText = toEnglishNumber(commentCountEl.textContent.match(/[۰-۹0-9]+/)?.[0] || '1');
                        const currentCount = parseInt(countText, 10);
                        commentCountEl.textContent = `دیدگاه‌ها (${toPersianNumber(Math.max(0, currentCount - 1))})`;
                    } else {
                        alert('خطا در حذف دیدگاه. شما دسترسی لازم را ندارید.');
                        deleteBtn.disabled = false;
                    }
                }
            }
        });
        
        // ... (بخش مربوط به ارسال پاسخ بدون تغییر) ...
        commentsList.addEventListener('submit', async (e) => {
            if (!e.target.classList.contains('reply-form')) return;
            e.preventDefault();
            const form = e.target;
            const commentItem = form.closest('.comment-item');
            const parentId = commentItem.dataset.commentId;
            const content = form.querySelector('textarea').value;
            if (!content.trim()) return;
            const submitBtn = form.querySelector('button[type="submit"]');
            const statusBox = form.querySelector('.form-status');
            submitBtn.disabled = true;
            hideStatus(statusBox);
            try {
                const { data: newReplyData, error } = await addComment(newsId, state.user.id, content, parentId);
                if (error) {
                    showStatus(statusBox, 'خطا در ارسال پاسخ.');
                } else {
                     const newReplyForRender = { ...newReplyData, author: { full_name: state.profile?.full_name || state.user.email.split('@')[0], avatar_url: state.profile?.avatar_url || state.user.user_metadata?.avatar_url }, likes: 0, user_vote: null, replies: [] };
                    const repliesContainer = commentItem.querySelector('.comment-replies');
                    repliesContainer.insertAdjacentHTML('beforeend', renderComment(newReplyForRender));
                    form.parentElement.style.display = 'none';
                    form.parentElement.innerHTML = '';
                    const commentCountEl = document.querySelector('.interactions-header h3');
                    const countText = toEnglishNumber(commentCountEl.textContent.match(/[۰-۹0-9]+/)?.[0] || '0');
                    const currentCount = parseInt(countText, 10);
                    commentCountEl.textContent = `دیدگاه‌ها (${toPersianNumber(currentCount + 1)})`;
                }
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
};