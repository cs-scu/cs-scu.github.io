// src/assets/js/modules/ui.js
import { state, dom } from './state.js';
import { supabaseClient, checkUserExists, sendSignupOtp, sendPasswordResetOtp, verifyOtp, signInWithPassword, updateUserPassword, updateProfile, getProfile, connectTelegramAccount, verifyTurnstile } from './api.js';

let currentEmail = '';
const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

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
    const user = state.user;

    let telegramConnectHTML = '';

    if (profile?.telegram_id) {
        telegramConnectHTML = `
            <div class="telegram-connected-info" style="text-align: center; padding: 1rem; margin-top: 1.5rem; border-radius: 8px; background-color: rgba(0, 255, 100, 0.1); color: #96ff6f;">
                <p style="margin:0;">✅ حساب تلگرام شما با نام کاربری <strong>@${profile.telegram_username}</strong> متصل است.</p>
            </div>
        `;
    } else {
        telegramConnectHTML = `
            <h4>اتصال حساب تلگرام</h4>
            <p>حساب تلگرام خود را برای تکمیل خودکار پروفایل متصل کنید.</p>
            <div id="telegram-login-widget-container" style="margin-top: 1.5rem;"></div>
        `;
    }

    const formattedPhone = user.phone ? `0${user.phone.substring(2)}` : 'هنوز ثبت نشده';

    const modalHtml = `
        <div class="content-box" style="padding-top: 4rem;">
            <h2>پروفایل کاربری</h2>
            <p>اطلاعات خود را تکمیل یا ویرایش کنید.</p>
            <form id="profile-form">
                <div class="form-group">
                    <label for="full-name">نام و نام خانوادگی</label>
                    <input type="text" id="full-name" name="full-name" value="${profile?.full_name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="phone-display">شماره تلفن (از طریق تلگرام)</label>
                    <input type="tel" id="phone-display" name="phone-display" value="${formattedPhone}" disabled style="background-color: rgba(128,128,128,0.1); cursor: not-allowed;">
                </div>
                <div class="form-status"></div>
                <br>
                <button type="submit" class="btn btn-primary">ذخیره تغییرات</button>
            </form>
            <hr style="margin: 2rem 0;">
            ${telegramConnectHTML}
        </div>
    `;
    
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = modalHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');

    if (!profile?.telegram_id) {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', 'scu_cs_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '10');
        script.setAttribute('data-auth-url', 'https://www.cs-scu.ir/#/telegram-auth'); 
        script.setAttribute('data-request-access', 'write');

        const container = document.getElementById('telegram-login-widget-container');
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(script);
        }
    }

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

export const handleTelegramAuth = async () => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
    const urlParams = new URLSearchParams(queryString);
    const authData = Object.fromEntries(urlParams.entries());
    const mainContent = dom.mainContent;

    if (!authData.hash) {
        mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا: اطلاعات احراز هویت تلگرام ناقص است.</p></div>`;
        return;
    }

    mainContent.innerHTML = `
        <div class="container" style="text-align:center; padding: 5rem 0;">
            <h2>در حال اتصال حساب تلگرام...</h2>
            <p>لطفاً منتظر بمانید، در حال تأیید و ذخیره اطلاعات شما هستیم.</p>
        </div>
    `;

    const { success, error } = await connectTelegramAccount(authData);

    if (!success) {
        mainContent.innerHTML = `
            <div class="container" style="text-align:center; padding: 5rem 0;">
                <h2>خطا در اتصال</h2>
                <p>${error || 'یک خطای ناشناخته رخ داد. لطفاً دوباره تلاش کنید.'}</p>
                <a href="#/" class="btn btn-secondary" style="margin-top: 1rem;">بازگشت به صفحه اصلی</a>
            </div>
        `;
    } else {
        mainContent.innerHTML = `
            <div class="container" style="text-align:center; padding: 5rem 0;">
                <h2>اتصال موفق!</h2>
                <p>حساب تلگرام شما با موفقیت به پروفایل کاربری‌تان متصل شد.</p>
                <p>در حال بازگشت...</p>
            </div>
        `;
        await getProfile();
        updateUserUI(state.user, state.profile);
        
        setTimeout(() => {
            location.hash = '#/profile-updated';
        }, 1500);
    }
};

export const initializeAuthForm = () => {
    const form = dom.mainContent.querySelector('#auth-form');
    if (!form || form.dataset.listenerAttached) return;

    let otpTimerInterval = null;
    let otpContext = 'signup';

    const emailStep = form.querySelector('#email-step');
    const passwordStep = form.querySelector('#password-step');
    const otpStep = form.querySelector('#otp-step');
    const setPasswordStep = form.querySelector('#set-password-step');
    
    const statusBox = form.querySelector('.form-status');
    const forgotPasswordBtn = form.querySelector('#forgot-password-btn');
    const editEmailBtns = form.querySelectorAll('.edit-email-btn');
    const resendOtpBtn = form.querySelector('#resend-otp-btn');
    const otpTimerSpan = form.querySelector('#otp-timer');

    const displayEmailPassword = form.querySelector('#display-email-password');
    const displayEmailOtp = form.querySelector('#display-email-otp');

    const otpContainer = form.querySelector('#otp-container');
    const otpInputs = otpContainer ? Array.from(otpContainer.children) : [];

    const turnstileWidget = form.querySelector('#turnstile-widget');
    if (turnstileWidget && typeof turnstile !== 'undefined') {
        turnstile.render('#turnstile-widget', {
            sitekey: '0x4AAAAAABoNEi1N70S2VODl',
            theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
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

    const showStep = (step) => {
        emailStep.style.display = 'none';
        passwordStep.style.display = 'none';
        otpStep.style.display = 'none';
        setPasswordStep.style.display = 'none';
        step.style.display = 'block';
        if (step === otpStep) {
            otpInputs[0]?.focus();
        }
    };

    editEmailBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hideStatus(statusBox);
            showStep(emailStep);
        });
    });

    if (otpContainer) {
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
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = e.clipboardData.getData('text');
                if (pasteData.length === otpInputs.length) {
                    otpInputs.forEach((box, i) => {
                        box.value = pasteData[i] || '';
                    });
                    otpInputs[otpInputs.length - 1].focus();
                }
            });
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
                if(displayEmailPassword) displayEmailPassword.textContent = currentEmail;
                if(displayEmailOtp) displayEmailOtp.textContent = currentEmail;

                const exists = await checkUserExists(currentEmail);
                if (exists) {
                    showStep(passwordStep);
                } else {
                    otpContext = 'signup';
                    const { error } = await sendSignupOtp(currentEmail);
                    if (error) {
                        showStatus(statusBox, 'خطا در ارسال کد.');
                        showStep(emailStep);
                    } else {
                        showStep(otpStep);
                        startOtpTimer();
                        showStatus(statusBox, 'کد تایید به ایمیل شما ارسال شد.', 'success');
                    }
                }
                submitBtn.textContent = 'ادامه';
                break;
            case 'password-step':
                submitBtn.textContent = 'در حال ورود...';
                const password = form.querySelector('#auth-password').value;
                const { error: signInError } = await signInWithPassword(currentEmail, password);
                if (signInError) {
                    showStatus(statusBox, 'رمز عبور اشتباه است.');
                } else {
                    location.hash = '#/';
                }
                submitBtn.textContent = 'ورود';
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
                    showStatus(statusBox, 'کد وارد شده صحیح نیست.');
                } else {
                    showStep(setPasswordStep);
                    showStatus(statusBox, 'کد تایید شد. اکنون رمز عبور خود را تعیین کنید.', 'success');
                }
                submitBtn.textContent = 'تایید کد';
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
                    showStatus(statusBox, 'خطا در ذخیره رمز عبور.');
                } else {
                    await getProfile();
                    dom.mainContent.innerHTML = '';
                    showProfileModal();
                }
                submitBtn.textContent = 'ذخیره و ورود';
                break;
        }
        if (submitBtn) submitBtn.disabled = false;
    });

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            hideStatus(statusBox);
            otpContext = 'reset';
            const { error } = await sendPasswordResetOtp(currentEmail);
            if (error) {
                showStatus(statusBox, 'خطا در ارسال کد بازنشانی.');
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
                showStatus(statusBox, 'خطا در ارسال مجدد کد.');
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
    const welcomeMsg = document.getElementById('user-welcome-message');
    const adminLink = document.getElementById('admin-panel-link');
    const userAvatar = document.getElementById('user-avatar');

    if (user) {
        if (authLink) authLink.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';

        if (welcomeMsg) {
            const displayName = profile?.full_name || user.email.split('@')[0];
            welcomeMsg.textContent = `سلام، ${displayName}`;
        }
        
        if (userAvatar) {
            userAvatar.src = profile?.avatar_url || DEFAULT_AVATAR_URL;
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
                // showMemberModal(authorTrigger.dataset.authorId);
                return;
            }
            const eventCard = e.target.closest('.event-card');
            if (eventCard) {
                if (!e.target.closest('a.btn')) {
                    e.preventDefault();
                    const detailLink = eventCard.querySelector('a[href*="#/events/"]');
                    if (detailLink && detailLink.hash) {
                        const path = detailLink.hash.substring(1);
                        // showEventModal(path);
                    }
                }
            }
            const courseHeader = e.target.closest('.course-card-chart.is-expandable .course-main-info');
            if (courseHeader) {
                e.preventDefault();
                const courseCard = courseHeader.closest('.course-card-chart');
                courseCard.classList.toggle('is-expanded');
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
