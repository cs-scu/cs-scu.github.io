// js/modules/ui.js
import { state, dom } from './state.js';

const DEFAULT_AVATAR_URL = 'assets/img/defualt-avatar.png'; // مسیر جدید آواتار پیش‌فرض

// --- Private Modal Handlers ---
const showMemberModal = (memberId) => {
    const member = state.membersMap.get(parseInt(memberId, 10));
    if (!member) return;

    const template = document.getElementById('member-card-template');
    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!template || !genericModal || !genericModalContent) return;

    const cardClone = template.content.cloneNode(true);
    // ... (منطق کامل رندر مودال کارت اعضا) ...
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

const showEventModal = async (path) => {
    const event = state.allEvents.find(e => e.detailPage === `#${path}`);
    if (!event) return;

    const genericModal = document.getElementById('generic-modal');
    const genericModalContent = document.getElementById('generic-modal-content');
    if (!genericModal || !genericModalContent) return;

    const slug = path.substring(8); // removes `/events/`
    const eventHtmlPath = `../events/${slug}.html`; // مسیر جدید فایل رویداد

    try {
        const response = await fetch(eventHtmlPath);
        if (!response.ok) throw new Error('فایل جزئیات رویداد یافت نشد.');
        const detailHtml = await response.text();
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
    } catch (error) {
        console.error(error);
        genericModalContent.innerHTML = `<p>خطا در بارگذاری محتوا.</p>`;
    }
};

// --- Exported Initializers ---
export const initializeContactForm = () => {
    const contactForm = dom.mainContent.querySelector('#contact-form');
    if (!contactForm || contactForm.dataset.listenerAttached) return;

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const statusBox = contactForm.querySelector('.form-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const formspreeEndpoint = 'https://formspree.io/f/xgvzaead';

        if (statusBox) { statusBox.style.display = 'none'; statusBox.className = 'form-status'; }
        submitBtn.disabled = true;
        submitBtn.textContent = 'در حال ارسال...';

        fetch(formspreeEndpoint, { method: 'POST', body: new FormData(contactForm), headers: { 'Accept': 'application/json' } })
            .then(response => {
                if (response.ok) {
                    if (statusBox) {
                        statusBox.textContent = 'پیام شما با موفقیت ارسال شد. ✅';
                        statusBox.className = 'form-status success';
                        statusBox.style.display = 'block';
                    }
                    contactForm.reset();
                } else { throw new Error('Server error'); }
            })
            .catch(() => {
                if (statusBox) {
                    statusBox.textContent = 'خطای شبکه. لطفاً اتصال خود را بررسی کنید.';
                    statusBox.className = 'form-status error';
                    statusBox.style.display = 'block';
                }
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'ارسال پیام';
            });
    });
    contactForm.dataset.listenerAttached = 'true';
};

export const initializeGlobalUI = () => {
    // --- Mobile Menu ---
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

    // --- Generic Modal ---
    const genericModal = document.getElementById('generic-modal');
    if (genericModal) {
        const closeGenericModalBtn = genericModal.querySelector('.close-modal');
        const closeGenericModal = () => { dom.body.classList.remove('modal-is-open'); genericModal.classList.remove('is-open'); };
        closeGenericModalBtn.addEventListener('click', closeGenericModal);
        genericModal.addEventListener('click', (e) => { if (e.target === genericModal) closeGenericModal(); });
    }

    // --- Main Content Event Delegation for Modals ---
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
                if (!e.target.closest('a.btn-primary')) { // Don't trigger modal if registration button is clicked
                    e.preventDefault();
                    const detailLink = eventCard.querySelector('a[href*="#/events/"]');
                    if (detailLink && detailLink.href) {
                        const path = new URL(detailLink.href).hash.substring(1);
                        showEventModal(path);
                    }
                }
            }
        });
    }

    // --- Registration Modal and Form ---
    const registerModal = document.getElementById('register-modal');
    const openRegisterBtn = document.getElementById('open-register-btn');
    if (registerModal && openRegisterBtn) {
        const closeRegisterBtn = registerModal.querySelector('.close-modal');
        const openModal = () => { dom.body.classList.add('modal-is-open'); registerModal.classList.add('is-open'); };
        const closeModal = () => { dom.body.classList.remove('modal-is-open'); registerModal.classList.remove('is-open'); };

        openRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
        closeRegisterBtn.addEventListener('click', closeModal);
        registerModal.addEventListener('click', (e) => { if (e.target === registerModal) closeModal(); });

        const registrationForm = document.getElementById('registration-form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', function (e) {
                e.preventDefault();
                // ... (منطق ارسال فرم ثبت‌نام) ...
                const statusMessage = registrationForm.querySelector('.form-status');
                const submitButton = registrationForm.querySelector('button[type="submit"]');
                const formspreeEndpoint = 'https://formspree.io/f/xeozaqap';
    
                if (statusMessage) { statusMessage.style.display = 'none'; statusMessage.className = 'form-status'; }
                submitButton.disabled = true;
                submitButton.textContent = 'در حال ارسال...';
    
                fetch(formspreeEndpoint, { method: 'POST', body: new FormData(registrationForm), headers: { 'Accept': 'application/json' } })
                    .then(response => {
                        if (response.ok) {
                            document.getElementById('form-content-wrapper').style.display = 'none';
                            document.getElementById('success-message').style.display = 'block';
                        } else { throw new Error('Server error'); }
                    })
                    .catch(() => {
                        if (statusMessage) {
                            statusMessage.textContent = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
                            statusMessage.className = 'form-status error';
                            statusMessage.style.display = 'block';
                        }
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'ارسال درخواست';
                    });
            });
        }
    }
};