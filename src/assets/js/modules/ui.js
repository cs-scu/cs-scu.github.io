// src/assets/js/modules/ui.js
import { state, dom } from './state.js';
import { supabaseClient, checkUserExists, sendSignupOtp, sendPasswordResetOtp, verifyOtp, signInWithPassword, updateUserPassword, updateProfile, getProfile, connectTelegramAccount } from './api.js';

let currentEmail = '';
const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

const showStatus = (statusBox, message, type = 'error') => {
    statusBox.textContent = message;
    statusBox.className = `form-status ${type}`;
    statusBox.style.display = 'block';
};

const hideStatus = (statusBox) => {
    statusBox.style.display = 'none';
    statusBox.textContent = '';
};

export const showProfileModal = async () => { // Make function async
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    // --- START CHANGE: Fetch fresh user data before opening modal ---
    const { data: { user: freshUser }, error: refreshError } = await supabaseClient.auth.refreshSession();
    if (refreshError || !freshUser) {
        console.error("Could not refresh user data:", refreshError);
        // Optionally show an error to the user
        return;
    }
    // Update the global state with the fresh user object
    state.user = freshUser;
    // --- END CHANGE ---

    const profile = state.profile;
    const user = state.user; // This is now guaranteed to be fresh

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

    const formattedPhone = user.phone ? `0${user.phone.substring(3)}` : 'هنوز ثبت نشده';

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
        updateUserUI(state.user, state.profile);
        
        setTimeout(() => {
            location.hash = '#/profile-updated';
        }, 1500);
    }
};

export const initializeAuthForm = () => {
    const form = dom.mainContent.querySelector('#auth-form');
    if (!form || form.dataset.listenerAttached) return;

    const emailStep = form.querySelector('#email-step');
    const passwordStep = form.querySelector('#password-step');
    const otpStep = form.querySelector('#otp-step');
    const setPasswordStep = form.querySelector('#set-password-step');
    const statusBox = form.querySelector('.form-status');
    const forgotPasswordLink = form.querySelector('#forgot-password-link');

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
                currentEmail = form.querySelector('#auth-email').value;
                const exists = await checkUserExists(currentEmail);
                emailStep.style.display = 'none';
                if (exists) {
                    passwordStep.style.display = 'block';
                } else {
                    const { error } = await sendSignupOtp(currentEmail);
                    if (error) {
                        showStatus(statusBox, 'خطا در ارسال کد.');
                        emailStep.style.display = 'block';
                    } else {
                        otpStep.style.display = 'block';
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
                const otp = form.querySelector('#auth-otp').value;
                const { data, error: otpError } = await verifyOtp(currentEmail, otp);
                if (otpError || !data.session) {
                    showStatus(statusBox, 'کد وارد شده صحیح نیست.');
                } else {
                    otpStep.style.display = 'none';
                    setPasswordStep.style.display = 'block';
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

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            hideStatus(statusBox);
            const { error } = await sendPasswordResetOtp(currentEmail);
            if (error) {
                showStatus(statusBox, 'خطا در ارسال کد بازنشانی.');
            } else {
                passwordStep.style.display = 'none';
                otpStep.style.display = 'block';
                showStatus(statusBox, 'کد بازنشانی رمز به ایمیل شما ارسال شد.', 'success');
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
                showMemberModal(authorTrigger.dataset.authorId);
                return;
            }
            const eventCard = e.target.closest('.event-card');
            if (eventCard) {
                if (!e.target.closest('a.btn')) {
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
            showStatus(statusBox, 'خطایی در ارسال پیام رخ داد.');
        } else {
            showStatus(statusBox, 'پیام شما با موفقیت ارسال شد.', 'success');
            contactForm.reset();
        }
    });
    contactForm.dataset.listenerAttached = 'true';
};

export const showEventModal = async (path) => {
    const eventLink = `#${path}`;
    const event = state.allEvents.find(e => e.detailPage === eventLink);
    if (!event) return;

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    const detailHtml = event.content || '<p>محتوای جزئیات برای این رویداد یافت نشد.</p>';

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
                </div>
                <hr>
                ${detailHtml}
            </div>
        </div>
    `;
    genericModal.classList.add('wide-modal');
    genericModalContent.innerHTML = modalHtml;
    dom.body.classList.add('modal-is-open');
    genericModal.classList.add('is-open');
};

const showMemberModal = (memberId) => {
    const member = state.membersMap.get(parseInt(memberId, 10));
    if (!member) return;

    const template = document.getElementById('member-card-template');
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!template || !genericModal || !genericModalContent) return;

    const cardClone = template.content.cloneNode(true);
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
