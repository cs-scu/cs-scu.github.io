// src/assets/js/modules/ui.js
import { state, dom } from './state.js';
// START: Imports corrected
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
    deleteComment
} from './api.js';
// END: Imports corrected
let currentEmail = '';
const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

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
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

// Helper functions for status messages
const showStatus = (statusBox, message, type = 'error') => {
    statusBox.textContent = message;
    statusBox.className = `form-status ${type}`;
    statusBox.style.display = 'block';
};

const hideStatus = (statusBox) => {
    statusBox.style.display = 'none';
    statusBox.textContent = '';
};

export const showProfileModal = async () => {
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    const { data: { user: freshUser }, error: refreshError } = await supabaseClient.auth.refreshSession();
    if (refreshError || !freshUser) {
        console.error("Could not refresh user data:", refreshError);
        return;
    }
    state.user = freshUser;

    const profile = state.profile;

    const modalHtml = `
        <div class="content-box" style="padding-top: 4rem;">
            <h2>پروفایل کاربری</h2>
            <p>اطلاعات خود را تکمیل یا ویرایش کنید.</p>
            <form id="profile-form">
                <div class="form-group">
                    <label for="full-name">نام و نام خانوادگی</label>
                    <input type="text" id="full-name" name="full-name" value="${profile?.full_name || ''}" required>
                </div>
                <div class="form-status"></div>
                <br>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">ذخیره تغییرات</button>
                </div>
            </form>
        </div>
    `;
    
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = modalHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    const profileForm = genericModalContent.querySelector('#profile-form');
    const statusBox = profileForm.querySelector('.form-status');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = profileForm.querySelector('#full-name').value;
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const { error } = await updateProfile({ full_name: fullName });
        if (error) {
            showStatus(statusBox, 'خطا در ذخیره اطلاعات.');
            submitBtn.disabled = false;
        } else {
            showStatus(statusBox, 'اطلاعات با موفقیت ذخیره شد.', 'success');
            await getProfile();
            updateUserUI(state.user, state.profile);
            setTimeout(() => {
                genericModal.classList.remove('is-open');
                dom.body.classList.remove('modal-is-open');
            }, 1500);
        }
    });
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
    let otpContext = 'signup';
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
                        displayEmailLinking.textContent = currentEmail;
                        showStep(linkingStep);
                    } else {
                        displayEmailPassword.textContent = currentEmail;
                        showStep(passwordStep);
                    }
                    submitBtn.textContent = 'ادامه';
                    submitBtn.disabled = false;
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
                        submitBtn.textContent = 'ادامه';
                        submitBtn.disabled = false;
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
                const { data, error: otpError } = await verifyOtp(currentEmail, otp);
                if (otpError || !data.session) {
                    showStatus(statusBox, getFriendlyAuthError(otpError || { message: 'Code is invalid' }));
                } else {
                    showStep(setNameStep);
                    showStatus(statusBox, 'کد تایید شد. لطفاً نام خود را وارد کنید.', 'success');
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


// تابع اصلی نمایش مودال رویداد (اصلاح‌شده)
export const showEventModal = async (path) => {
    const eventLink = `#${path}`;
    const event = state.allEvents.find(e => e.detailPage === eventLink);
    if (!event) return;

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    const detailHtml = event.content || '<p>محتوای جزئیات برای این رویداد یافت نشد.</p>';

    const costHTML = event.cost ? `
        <span class="event-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                <path d="M12 18V6"></path>
            </svg>
            ${event.cost}
        </span>` : '';

    let actionsHTML = '';
    if (event.registrationLink) {
        const isPastEvent = new Date(event.endDate) < new Date();

        let contactInfo = null;
        try {
            if (event.contact_link && typeof event.contact_link === 'string') {
                contactInfo = JSON.parse(event.contact_link);
            } else {
                contactInfo = event.contact_link;
            }
        } catch (e) { console.error("Could not parse contact info JSON:", e); }

        const contactButton = (contactInfo && Object.keys(contactInfo).length > 0)
            ? `
                <div class="contact-widget-trigger-wrapper">
                    <button id="contact-for-event-btn" class="btn btn-secondary" ${isPastEvent ? 'disabled' : ''}>پرسش درباره رویداد</button>
                </div>
            `
            : `
                <div class="contact-widget-trigger-wrapper">
                    <button class="btn btn-secondary disabled" disabled>اطلاعات تماس موجود نیست</button>
                </div>
            `;

        actionsHTML = `
            <div class="event-modal-actions">
                <button
                    class="btn btn-primary btn-event-register"
                    data-event-id="${event.id}"
                    style="flex-grow: 2;"
                    ${isPastEvent ? 'disabled' : ''}>
                    ${isPastEvent ? 'رویداد پایان یافته' : 'ثبت‌نام در این رویداد'}
                </button>
                ${contactButton}
            </div>
        `;
    }

    const modalHtml = `
        <div class="content-box">
            <div class="event-content-area">
                <h1>${event.title}</h1>
                <div class="event-modal-meta">
                     <span class="event-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${event.displayDate}
                    </span>
                    <span class="event-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${event.location}
                    </span>
                    ${costHTML}
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
            if (contactInfo.telegram) { contactItemsHTML += `<a href="${contactInfo.telegram}" target="_blank" rel="noopener noreferrer" class="contact-widget-item"><div class="contact-widget-icon telegram-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 L11 13 L2 9 L22 2 Z M22 2 L15 22 L11 13 L2 9 L22 2 Z"></path></svg></div><div class="contact-widget-info"><strong>تلگرام</strong><span>ارسال پیام</span></div></a>`; }
            if (contactInfo.whatsapp) { contactItemsHTML += `<a href="${contactInfo.whatsapp}" target="_blank" rel="noopener noreferrer" class="contact-widget-item"><div class="contact-widget-icon whatsapp-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></div><div class="contact-widget-info"><strong>واتساپ</strong><span>ارسال پیام</span></div></a>`; }

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

const handleModalClick = async (e, eventData, scheduleData) => {
    const header = e.target.closest('.accordion-header');
    if (header) {
        header.parentElement.classList.toggle('is-open');
        return;
    }

    const copyBtn = e.target.closest('.btn-copy-schedule-link');
    if (copyBtn) {
        const copyBtnSpan = copyBtn.querySelector('span');
        if (!copyBtnSpan) return;
        const originalText = copyBtnSpan.textContent;
        const linkToCopy = copyBtn.dataset.link;
        navigator.clipboard.writeText(linkToCopy).then(() => {
            copyBtnSpan.textContent = 'کپی شد!';
            copyBtn.classList.add('btn-success');
            setTimeout(() => {
                copyBtnSpan.textContent = originalText;
                copyBtn.classList.remove('btn-success');
            }, 2000);
        });
        return;
    }

    const downloadBtn = e.target.closest('.btn-download-schedule');
    if (downloadBtn) {
        downloadBtn.disabled = true;
        const downloadBtnSpan = downloadBtn.querySelector('span');
        downloadBtnSpan.textContent = 'در حال آماده‌سازی...';

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // --- تعریف رنگ‌ها و استایل‌ها ---
            const primaryColor = '#1a5c5d';
            const textColor = '#2c3e50';
            const mutedColor = '#7f8c8d';
            const cardBgColor = '#ffffff'; // پس زمینه سفید خالص برای کارت
            const pageBgColor = '#f4f7f6';
            const headerBgColor = '#eaf0f0'; // <<-- اصلاح کلیدی: جایگزینی گرادیان با رنگ ثابت و زیبا

            // --- بارگذاری منابع (لوگو و فونت) ---
            const logoUrl = 'https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/ui/icons/favicon.png';
            const logoResponse = await fetch(logoUrl);
            if (!logoResponse.ok) throw new Error('فایل لوگو یافت نشد');
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.readAsDataURL(logoBlob);
                reader.onloadend = () => resolve(reader.result);
            });

            const fontResponse = await fetch('assets/fonts/Vazirmatn-Regular.ttf');
            const fontBlob = await fontResponse.blob();
            const fontBase64 = await new Promise(resolve => {
                const fontReader = new FileReader();
                fontReader.readAsDataURL(fontBlob);
                fontReader.onloadend = () => resolve(fontReader.result.split(',')[1]);
            });

            doc.addFileToVFS('Vazirmatn-Regular.ttf', fontBase64);
            doc.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
            doc.setFont('Vazirmatn');

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;

            // --- تابع برای افزودن هدر، فوتر و پس‌زمینه به هر صفحه ---
            const addPageLayout = (pageNumber) => {
                // پس‌زمینه کلی صفحه
                doc.setFillColor(pageBgColor);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');

                // هدر با رنگ ثابت
                doc.setFillColor(headerBgColor);
                doc.rect(0, 0, pageWidth, 30, 'F');
                
                // واترمارک لوگو
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.04 }));
                doc.addImage(logoBase64, 'PNG', (pageWidth / 2) - 50, (pageHeight / 2) - 50, 100, 100);
                doc.restoreGraphicsState();
                
                // محتوای هدر
                doc.addImage(logoBase64, 'PNG', pageWidth - margin - 12, 9, 12, 12);
                doc.setTextColor(textColor);
                doc.setFontSize(10);
                doc.text('انجمن علمی علوم کامپیوتر دانشگاه شهید چمران اهواز', pageWidth - margin - 15, 13, { align: 'right' });
                doc.setFontSize(14);
                doc.setTextColor(primaryColor);
                doc.text(eventData.title, pageWidth - margin - 15, 22, { align: 'right' });

                // فوتر
                const footerY = pageHeight - 15;
                doc.setDrawColor('#dddddd'); // رنگ خط جداکننده ملایم‌تر
                doc.setLineWidth(0.2);
                doc.line(margin, footerY, pageWidth - margin, footerY);
                const footerText = 'cs-scu.ir';
                const today = new Date().toLocaleDateString('fa-IR');
                doc.setFontSize(9);
                doc.setTextColor(mutedColor);
                doc.text(footerText, margin, footerY + 5, { align: 'left' });
                doc.text(`صفحه ${pageNumber}`, pageWidth / 2, footerY + 5, { align: 'center' });
                doc.text(`تاریخ تهیه: ${today}`, pageWidth - margin, footerY + 5, { align: 'right' });
            };
            
            let currentPage = 1;
            addPageLayout(currentPage);
            let y = 45; // نقطه شروع محتوا بعد از هدر

            // --- تابع برای رسم کارت هر جلسه ---
            const drawSessionCard = (session, index) => {
                const cardHeight = 58;
                if (y + cardHeight > pageHeight - 25) {
                    doc.addPage();
                    currentPage++;
                    addPageLayout(currentPage);
                    y = 45;
                }

                // سایه کارت
                doc.setFillColor('#000000');
                doc.setGState(new doc.GState({ opacity: 0.05 }));
                doc.roundedRect(margin + 0.5, y + 0.5, pageWidth - (2 * margin), cardHeight, 3, 3, 'F');
                doc.setGState(new doc.GState({ opacity: 1 }));

                // پس‌زمینه کارت
                doc.setFillColor(cardBgColor);
                doc.setDrawColor('#e0e0e0');
                doc.setLineWidth(0.2);
                doc.roundedRect(margin, y, pageWidth - (2 * margin), cardHeight, 3, 3, 'FD');

                // خط رنگی کنار کارت
                doc.setFillColor(primaryColor);
                doc.roundedRect(pageWidth - margin - 3, y, 3, cardHeight, 1.5, 1.5, 'F');

                // عنوان جلسه
                doc.setFontSize(12);
                doc.setTextColor(textColor);
                const sessionTitle = session.session_name || `جلسه ${index + 1}`;
                doc.text(sessionTitle, pageWidth - margin - 8, y + 12, { align: 'right' });
                
                // تابع ترسیم ردیف اطلاعات با جداسازی کامل اجزا
                const drawInfoRow = (label, value, yOffset, icon) => {
                    const iconMap = { topic: '🗒️', speaker: '👤', time: '🕒', location: '📍', link: '🔗' };
                    const labelPart = `${iconMap[icon] || ''} ${label}`;
                    const colonPart = ":";
                    const valuePart = value || '---';
                    const rightEdge = pageWidth - margin - 8;
                    const spacing = 1.5;
                    doc.setFontSize(9);
                    doc.setTextColor(mutedColor);
                    doc.text(labelPart, rightEdge, y + yOffset, { align: 'right' });
                    const labelWidth = doc.getTextWidth(labelPart);
                    const colonX = rightEdge - labelWidth;
                    doc.text(colonPart, colonX, y + yOffset, { align: 'right' });
                    const colonWidth = doc.getTextWidth(colonPart);
                    const valueX = colonX - colonWidth - spacing;
                    const availableWidth = valueX - margin;
                    doc.setTextColor(textColor);
                    doc.text(valuePart, valueX, y + yOffset, { align: 'right', maxWidth: availableWidth });
                };
                
                drawInfoRow('موضوع', session.topic, 24, 'topic');
                drawInfoRow('مدرس', session.speaker, 34, 'speaker');
                drawInfoRow('زمان', `${session.date || ''} ساعت ${session.time || ''}`, 44, 'time');
                
                const isUrl = (address) => { try { new URL(address); return true; } catch (_) { return false; } };
                if (session.addres) {
                    const label = (session.type === 'online' && isUrl(session.addres)) ? 'لینک' : 'مکان';
                    const icon = (session.type === 'online' && isUrl(session.addres)) ? 'link' : 'location';
                    drawInfoRow(label, session.addres, 54, 'location');
                }
                
                y += cardHeight + 8;
            };
            
            scheduleData.forEach(drawSessionCard);

            // ذخیره فایل PDF
            doc.save(`برنامه-${eventData.title.replace(/ /g, '-')}.pdf`);

        } catch (error) {
            console.error('خطا در ساخت فایل PDF:', error);
            alert('مشکلی در ساخت فایل PDF به وجود آمد.');
        } finally {
            downloadBtnSpan.textContent = 'دانلود';
            downloadBtn.disabled = false;
        }
    }
};

export const showEventScheduleModal = (eventId) => {
    const event = state.allEvents.find(e => e.id == eventId);
    if (!event) return;

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    if (genericModalContent.currentHandler) {
        genericModalContent.removeEventListener('click', genericModalContent.currentHandler);
    }

    let scheduleData = [];
    try {
        scheduleData = typeof event.schedule === 'string' ? JSON.parse(event.schedule) : event.schedule;
    } catch (e) {
        console.error("Could not parse event schedule JSON:", e);
        genericModalContent.innerHTML = `<div class="content-box"><p>خطا در بارگذاری برنامه زمانی.</p></div>`;
        genericModal.classList.add('is-open'); dom.body.classList.add('modal-is-open');
        return;
    }

    if (!Array.isArray(scheduleData) || scheduleData.length === 0) return;

    const scheduleTitle = event.schedule_title || 'برنامه زمانی جلسات';
    let scheduleHtml = `
        <div class="content-box" style="padding: 1.5rem;">
            <div class="modal-header-actions">
                <h2 class="modal-title-breakable">
                    <span class="modal-title-main">${scheduleTitle}:</span>
                    <span class="modal-title-event">${event.title}</span>
                </h2>
                <button class="btn btn-secondary btn-download-schedule" title="دانلود برنامه به صورت PDF">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>دانلود</span>
                </button>
            </div>
            <div class="accordion-container">
    `;

    scheduleData.forEach((session, index) => {
        let addresHtml = '';
        const isUrl = (address) => { try { new URL(address); return true; } catch (_) { return false; } }

        if (session.addres) {
            if (session.type === 'online' && isUrl(session.addres)) {
                addresHtml = `
                    <div class="accordion-row accordion-link-row">
                        <div class="accordion-label-actions">
                            <strong class="accordion-label">لینک جلسه:</strong>
                            <div class="accordion-link-buttons">
                                <button class="btn btn-secondary btn-copy-schedule-link" data-link="${session.addres}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    <span>کپی</span>
                                </button>
                                <a href="${session.addres}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    <span>ورود</span>
                                </a>
                            </div>
                        </div>
                        <span class="accordion-link-text">${session.addres}</span>
                    </div>
                `;
            } else {
                addresHtml = `
                    <div class="accordion-row">
                        <strong class="accordion-label">مکان جلسه:</strong>
                        <div class="accordion-content">${session.addres}</div>
                    </div>
                `;
            }
        }
        
        scheduleHtml += `
            <div class="accordion-item">
                <button class="accordion-header">
                    <span>${session.session_name || `جلسه ${index + 1}`}</span>
                    <svg class="accordion-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="accordion-body">
                    <div class="accordion-body-content">
                        <div class="accordion-row">
                            <strong class="accordion-label">موضوع:</strong>
                            <div class="accordion-content">${session.topic || '---'}</div>
                        </div>
                        <div class="accordion-row">
                            <strong class="accordion-label">مدرس:</strong>
                            <div class="accordion-content">${session.speaker || '---'}</div>
                        </div>
                        <div class="accordion-row">
                            <strong class="accordion-label">زمان:</strong>
                            <div class="accordion-content">${session.date || ''} ساعت ${session.time || ''}</div>
                        </div>
                        ${addresHtml}
                    </div>
                </div>
            </div>
        `;
    });
    
    scheduleHtml += `</div></div>`;
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = scheduleHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    genericModalContent.currentHandler = (e) => handleModalClick(e, event, scheduleData);
    genericModalContent.addEventListener('click', genericModalContent.currentHandler);
};

export const initializeGlobalUI = () => {
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

    // اگر کاربر وارد شده باشد، فیلدها را پر کرده و فقط-خواندنی می‌کند
    if (state.user) {
        const displayName = state.profile?.full_name || state.user.email.split('@')[0];
        nameInput.value = displayName;
        emailInput.value = state.user.email;
        
        // *** تغییر کلیدی: استفاده از readonly به جای disabled ***
        nameInput.readOnly = true;
        emailInput.readOnly = true;
        // افزودن کلاس برای استایل‌دهی
        nameInput.classList.add('prefilled');
        emailInput.classList.add('prefilled');
    }

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
        }
    });
    contactForm.dataset.listenerAttached = 'true';
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
        const statusText = existingRegistration.status === 'pending' ? 'در انتظار تایید' : 'تایید شده';
        const statusClass = existingRegistration.status === 'pending' ? 'status-pending' : 'status-confirmed';
        
        let paymentInfoHTML = '';
        if (existingRegistration.card_last_four_digits) {
            paymentInfoHTML = `<div class="info-row"><span>چهار رقم آخر کارت:</span><strong>${existingRegistration.card_last_four_digits}</strong></div><div class="info-row"><span>ساعت واریز:</span><strong>${existingRegistration.transaction_time}</strong></div>`;
        }

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
            paymentSectionHTML = `<div class="payment-info-section"><p>هزینه: <strong>${event.cost}</strong></p><p>لطفاً مبلغ را به کارت زیر واریز نمایید:</p><div class="payment-details-box" style="text-align: center; padding: 1rem; border: 1px dashed gray; margin: 1rem 0; border-radius: 8px;"><p style="margin:0;">به نام: <strong>${cardHolderName}</strong></p><div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 0.5rem; direction: ltr;"><strong id="card-to-copy">${cardNumber}</strong><button id="copy-card-btn" class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">کپی</button></div></div></div>`;
            
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

        if (isPaidEvent) {
            const copyBtn = genericModalContent.querySelector('#copy-card-btn');
            const cardText = genericModalContent.querySelector('#card-to-copy').innerText;
            copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(cardText.replace(/-/g, '')).then(() => { copyBtn.textContent = 'کپی شد!'; setTimeout(() => { copyBtn.textContent = 'کپی'; }, 2000); }); });

            const timePickerWidget = genericModalContent.querySelector('#time-picker-widget');
            const timeDisplaySpan = genericModalContent.querySelector('#reg-tx-time-display');
            const openTimePickerBtn = genericModalContent.querySelector('#open-time-picker-btn');
            const confirmTimeBtn = genericModalContent.querySelector('#confirm-time-btn');
            const hourScroll = genericModalContent.querySelector('#hour-scroll');
            const minuteScroll = genericModalContent.querySelector('#minute-scroll');

            let selectedHour = '00';
            let selectedMinute = '00';
            const itemHeight = 40;
            const scrollRepetitions = 3;

            const smoothScrollTo = (element, to, duration) => {
                const start = element.scrollTop;
                const change = to - start;
                let currentTime = 0;
                const increment = 20;

                const easeInOutQuad = (t, b, c, d) => {
                    t /= d / 2;
                    if (t < 1) return c / 2 * t * t + b;
                    t--;
                    return -c / 2 * (t * (t - 2) - 1) + b;
                };

                const animateScroll = () => {
                    currentTime += increment;
                    const val = easeInOutQuad(currentTime, start, change, duration);
                    element.scrollTop = val;
                    if (currentTime < duration) {
                        requestAnimationFrame(animateScroll);
                    }
                };
                animateScroll();
            };

            const updateHighlight = (container) => {
                const scrollTop = container.scrollTop;
                const middleIndex = Math.round(scrollTop / itemHeight) + 1;
                const selectedItem = container.children[middleIndex];
                
                container.querySelectorAll('.scroll-item.active').forEach(el => el.classList.remove('active'));

                if (selectedItem && selectedItem.dataset.value) {
                    const value = selectedItem.dataset.value;
                    const allItems = Array.from(container.children);
                    const activeElements = allItems.filter(el => el.dataset.value === value);
                    activeElements.forEach(el => el.classList.add('active'));
                }
            };
            
            const snapToItem = (container) => {
                const scrollTop = container.scrollTop;
                const middleIndex = Math.round(scrollTop / itemHeight) + 1;
                const snappedScrollTop = (middleIndex - 1) * itemHeight;

                smoothScrollTo(container, snappedScrollTop, 300);

                const selectedItem = container.children[middleIndex];
                if (selectedItem && selectedItem.dataset.value) {
                    container.dataset.selectedValue = selectedItem.dataset.value;
                    return selectedItem.dataset.value;
                }
                return container.dataset.selectedValue || '00';
            };

            const populateScroller = (container, max, initialValue) => {
                return new Promise(resolve => {
                    container.innerHTML = '';
                    const values = Array.from({ length: max }, (_, i) => String(i).padStart(2, '0'));
                    let fullList = [];
                    for (let i = 0; i < scrollRepetitions; i++) fullList = fullList.concat(values);
                    const emptyItems = [''];
                    fullList = [...emptyItems, ...fullList, ...emptyItems];
                    fullList.forEach(value => {
                        const item = document.createElement('div');
                        item.className = 'scroll-item';
                        item.textContent = value;
                        item.dataset.value = value;
                        container.appendChild(item);
                    });
                    const midPointOffset = values.length * Math.floor(scrollRepetitions / 2);
                    const initialIndexInList = values.indexOf(String(initialValue).padStart(2, '0'));
                    const targetIndex = initialIndexInList + midPointOffset + 1;
                    container.scrollTop = (targetIndex - 1) * itemHeight;
                    updateHighlight(container);
                    resolve();
                });
            };
            
            openTimePickerBtn.addEventListener('click', async () => {
                timePickerWidget.classList.add('show-above');
                
                const currentTime = timeDisplaySpan.textContent.split(':');
                timePickerWidget.style.display = 'block';

                await Promise.all([
                    populateScroller(hourScroll, 24, parseInt(currentTime[0], 10)),
                    populateScroller(minuteScroll, 60, parseInt(currentTime[1], 10))
                ]);
                
                selectedHour = hourScroll.dataset.selectedValue;
                selectedMinute = minuteScroll.dataset.selectedValue;
            });
            
            confirmTimeBtn.addEventListener('click', () => {
                selectedHour = snapToItem(hourScroll);
                selectedMinute = snapToItem(minuteScroll);
                if (selectedHour && selectedMinute) {
                    transactionTime = `${selectedHour}:${selectedMinute}`;
                    timeDisplaySpan.textContent = transactionTime;
                    timePickerWidget.style.display = 'none';
                }
            });

            const setupScrollListener = (container) => {
                let scrollTimeout;
                container.addEventListener('scroll', () => {
                    updateHighlight(container);
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => snapToItem(container), 250);
                });
            };
            
            setupScrollListener(hourScroll);
            setupScrollListener(minuteScroll);

            genericModalContent.querySelectorAll('.time-stepper-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const unit = btn.dataset.unit;
                    const step = parseInt(btn.dataset.step, 10);
                    const container = (unit === 'hour') ? hourScroll : minuteScroll;
                    const currentScrollTop = container.scrollTop;
                    const targetScrollTop = currentScrollTop + (step * itemHeight);
                    smoothScrollTo(container, targetScrollTop, 200);
                });
            });
            
            document.addEventListener('click', (e) => {
                if (!openTimePickerBtn.contains(e.target) && !timePickerWidget.contains(e.target)) {
                    if (timePickerWidget.style.display === 'block') {
                        timePickerWidget.style.display = 'none';
                    }
                }
            });
        }

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

            const { error } = await supabaseClient.from('event_registrations').insert(registrationData);
            if (error) {
                showStatus(statusBox, 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = isPaidEvent ? 'ارسال و ثبت‌نام موقت' : 'ثبت‌نام نهایی';
            } else {
                const successMessage = isPaidEvent ? 'اطلاعات شما با موفقیت ثبت شد و پس از بررسی توسط ادمین، نهایی خواهد شد.' : 'ثبت‌نام شما در این رویداد رایگان با موفقیت انجام شد!';
                genericModalContent.innerHTML = `<div class="content-box" style="text-align: center;"><h2>ثبت‌نام دریافت شد!</h2><p>${successMessage}</p></div>`;
                setTimeout(() => { genericModal.classList.remove('is-open'); dom.body.classList.remove('modal-is-open'); }, 4000);
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
    if (comment.user_id === null) {
        return `
        <div class="comment-item is-deleted" id="comment-${comment.id}" data-comment-id="${comment.id}">
            <div class="comment-main">
                <div class="comment-content">
                    <p><em>${sanitizeHTML(comment.content)}</em></p>
                </div>
            </div>
            <div class="comment-replies">
                ${(comment.replies || []).map(reply => renderComment(reply)).join('')}
            </div>
        </div>
    `;
    }

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
    const commentCount = comments?.length || 0;
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