// src/assets/js/modules/admin.js

import { state } from './state.js';
import { supabaseClient, getProfile, loadContacts, loadJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteJournalFiles, loadEvents, addEvent, updateEvent, deleteEvent, loadTags, addTag, updateTag, deleteTag, uploadEventImage, deleteEventImage, renameEventImage ,loadRegistrations, updateRegistrationStatus, loadNews, addNews, updateNews, deleteNews, uploadNewsImage, deleteNewsImage, renameNewsImage, loadMembers } from './api.js';
import { initializeAdminTheme } from './admin-theme.js';

const toPersianNumber = (n) => {
    if (n === null || n === undefined) return '';
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/[0-9]/g, (digit) => persianNumbers[digit]);
};

// --- Helper Functions ---
const hideStatus = (statusBox) => {
    if (!statusBox) return;
    statusBox.style.display = 'none';
    statusBox.textContent = '';
};

const showStatus = (statusBox, message, type = 'error') => {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = `form-status ${type}`;
    statusBox.style.display = 'block';
};

const initializeSharedTagModal = () => {
    const modal = document.getElementById('admin-generic-modal');
    const modalContent = document.getElementById('admin-generic-modal-content');
    if (!modal || !modalContent) return;

    let activeSelectionCallback = null;

    const renderModalContent = (currentSelectedIds = []) => {
        const sortedTags = Array.from(state.tagsMap.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fa'));
        let tagsListHTML = sortedTags.map(([id, name]) => {
            const isChecked = currentSelectedIds.includes(id);
            return `
                <div class="tag-checkbox-item" data-tag-id="${id}" data-tag-name="${name.toLowerCase()}">
                    <div class="tag-list-item-actions">
                        <button type="button" class="tag-action-btn delete-tag-btn" title="حذف">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                        <button type="button" class="tag-action-btn edit-tag-btn" title="ویرایش">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="edit-tag-form"><input type="text" class="form-control" value="${name}"><button type="button" class="btn btn-primary btn-sm save-edit-btn">ذخیره</button><button type="button" class="btn btn-secondary btn-sm cancel-edit-btn">لغو</button></div>
                    <label class="tag-name" for="modal-tag-${id}">${name}</label>
                    <div class="modal-toggle-switch"><input type="checkbox" class="toggle-input" id="modal-tag-${id}" value="${id}" ${isChecked ? 'checked' : ''}><label for="modal-tag-${id}" class="toggle-label"></label></div>
                </div>`;
        }).join('');
        
        modalContent.innerHTML = `
            <div class="tags-modal-container">
                <h3>مدیریت و انتخاب تگ‌ها</h3>
                <div class="tags-modal-header"><input type="text" id="tag-search-input" class="form-control" placeholder="جستجوی تگ..."></div>
                <form class="add-tag-form" id="add-tag-form-modal"><input type="text" id="new-tag-name" class="form-control" placeholder="افزودن تگ جدید..."><button type="submit" class="btn btn-primary">افزودن</button></form>
                <div class="tags-modal-list">${tagsListHTML || '<p style="text-align:center; opacity:0.8; padding: 1rem;" id="no-tags-message">تگی یافت نشد.</p>'}</div>
                <div class="tags-modal-actions"><button type="button" class="btn btn-primary btn-full" id="confirm-tags-btn">تایید انتخاب</button></div>
            </div>`;
    };

    window.openTagsModal = (currentSelectedIds, callback) => {
        activeSelectionCallback = callback;
        renderModalContent(currentSelectedIds);
        modal.classList.add('is-open');
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.close-modal')) {
            modal.classList.remove('is-open');
        }
        if (e.target.id === 'confirm-tags-btn') {
            const checkedInputs = modal.querySelectorAll('input[type="checkbox"]:checked');
            const selectedIds = Array.from(checkedInputs).map(input => parseInt(input.value, 10));
            if (activeSelectionCallback) {
                activeSelectionCallback(selectedIds);
            }
            modal.classList.remove('is-open');
        }
    });

    modalContent.addEventListener('click', async (e) => {
        const item = e.target.closest('.tag-checkbox-item');
        if (!item) return;
        const tagId = parseInt(item.dataset.tagId, 10);
        if (e.target.closest('.delete-tag-btn')) {
            if (confirm(`آیا از حذف تگ «${state.tagsMap.get(tagId)}» مطمئن هستید؟`)) {
                try {
                    await deleteTag(tagId); await loadTags();
                    renderModalContent(Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value)));
                } catch { alert('خطا در حذف تگ.'); }
            }
        } else if (e.target.closest('.edit-tag-btn')) {
            item.classList.add('is-editing');
        } else if (e.target.closest('.cancel-edit-btn')) {
            item.classList.remove('is-editing');
        } else if (e.target.closest('.save-edit-btn')) {
            const newName = item.querySelector('input[type="text"]').value.trim();
            if (newName && newName !== state.tagsMap.get(tagId)) {
                try {
                    await updateTag(tagId, newName); await loadTags();
                    renderModalContent(Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value)));
                } catch { alert('خطا در ویرایش تگ.'); }
            } else { item.classList.remove('is-editing'); }
        }
    });
    
    // --- START: افزودن منطق جستجو ---
    modalContent.addEventListener('input', (e) => {
        if (e.target.id === 'tag-search-input') {
            const searchTerm = e.target.value.toLowerCase().trim();
            const tagsList = modalContent.querySelector('.tags-modal-list');
            const allTags = tagsList.querySelectorAll('.tag-checkbox-item');
            const noTagsMessage = tagsList.querySelector('#no-tags-message');
            let visibleCount = 0;

            allTags.forEach(tag => {
                const tagName = tag.dataset.tagName || '';
                const isMatch = tagName.includes(searchTerm);
                tag.style.display = isMatch ? 'flex' : 'none';
                if (isMatch) visibleCount++;
            });

            if (noTagsMessage) {
                noTagsMessage.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        }
    });
    // --- END: افزودن منطق جستجو ---

    modalContent.addEventListener('submit', async (e) => {
        if (e.target.id === 'add-tag-form-modal') {
            e.preventDefault();
            const input = document.getElementById('new-tag-name');
            const newName = input.value.trim();
            if (!newName) return;
            try {
                await addTag(newName);
                input.value = ''; await loadTags();
                renderModalContent(Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value)));
            } catch { alert('خطا در افزودن تگ.'); }
        }
    });
};

// --- Renderer Functions ---
const renderMessages = (contacts) => {
    const wrapper = document.getElementById('admin-content-wrapper');
    if (!wrapper) return;
    if (!contacts || contacts.length === 0) {
        wrapper.innerHTML = '<p style="text-align: center; opacity: 0.8;">پیام جدیدی یافت نشد.</p>';
        return;
    }
    let tableHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead><tr><th>نام</th><th>ایمیل</th><th>پیام</th><th>تاریخ ارسال</th></tr></thead>
                <tbody>
                    ${contacts.map(contact => {
                        const messageDate = new Date(contact.created_at).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const safeName = (contact.name || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const safeEmail = (contact.email || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const safeMessage = (contact.message || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        return `<tr><td>${safeName}</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td><td class="message-cell">${safeMessage}</td><td>${messageDate}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    wrapper.innerHTML = tableHTML;
};

const renderJournalList = (issues) => {
    const container = document.getElementById('journal-admin-list');
    if (!container) return;
    if (!issues || issues.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.8;">هنوز هیچ نشریه‌ای ثبت نشده است.</p>';
        return;
    }
    const sortedIssues = issues.sort((a, b) => b.id - a.id);
    container.innerHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th class="actions-header">عملیات</th>
                        <th>عنوان</th>
                        <th>تاریخ</th>
                        <th>خلاصه</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedIssues.map(issue => `
                        <tr>
                            <td class="actions-cell">
                                <button class="btn btn-secondary btn-sm edit-journal-btn" data-id="${issue.id}" title="ویرایش">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn btn-danger btn-sm delete-journal-btn" data-id="${issue.id}" title="حذف">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                            <td>${issue.title}</td>
                            <td>${issue.date}</td>
                            <td class="summary-cell" title="${issue.summary || ''}">${issue.summary || ''}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
};

const renderEventsList = (events) => {
    const container = document.getElementById('events-admin-list');
    if (!container) return;
    if (!events || events.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.8;">هنوز هیچ رویدادی ثبت نشده است.</p>';
        return;
    }
    const sortedEvents = events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    container.innerHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th class="actions-header">عملیات</th>
                        <th>عنوان</th>
                        <th>تاریخ نمایشی</th>
                        <th>هزینه</th>
                        <th>مکان</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedEvents.map(event => `
                        <tr>
                            <td class="actions-cell">
                                <button class="btn btn-secondary btn-sm edit-event-btn" data-id="${event.id}" title="ویرایش">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn btn-danger btn-sm delete-event-btn" data-id="${event.id}" title="حذف">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                            <td>${event.title}</td>
                            <td>${event.displayDate}</td>
                            <td>${event.cost || '---'}</td>
                            <td>${event.location || '---'}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
};

const renderNewsList = (newsItems) => {
    const container = document.getElementById('news-admin-list');
    if (!container) return;
    if (!newsItems || newsItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.8;">هنوز هیچ خبری ثبت نشده است.</p>';
        return;
    }
    container.innerHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th class="actions-header">عملیات</th>
                        <th>عنوان</th>
                        <th>نویسنده</th>
                        <th>تاریخ</th>
                        <th>خلاصه</th>
                    </tr>
                </thead>
                <tbody>
                    ${newsItems.map(item => {
                        const author = state.membersMap.get(item.authorId);
                        const authorName = author ? author.name : 'نامشخص';
                        return `
                        <tr>
                            <td class="actions-cell">
                                <button class="btn btn-secondary btn-sm edit-news-btn" data-id="${item.id}" title="ویرایش">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn btn-danger btn-sm delete-news-btn" data-id="${item.id}" title="حذف">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                            <td>${item.title}</td>
                            <td>${authorName}</td>
                            <td>${item.date}</td>
                            <td class="summary-cell" title="${item.summary || ''}">${item.summary || ''}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
};

const renderRegistrationRowHTML = (reg, isPast = false) => {
    const getStatusBadge = (status) => {
        const pastClass = isPast ? 'is-past' : '';
        switch (status) {
            case 'confirmed': return `<span class="tag ${pastClass}" style="background-color: #28a745; color: white;">تایید شده</span>`;
            case 'pending': return `<span class="tag ${pastClass}" style="background-color: #ffc107; color: #333;">در انتظار</span>`;
            case 'rejected': return `<span class="tag ${pastClass}" style="background-color: #dc3545; color: white;">رد شده</span>`;
            default: return `<span class="tag ${pastClass}">${status}</span>`;
        }
    };

    const eventTitle = reg.events ? reg.events.title : 'رویداد حذف شده';

    let actionsHTML = '';
    if (isPast) {
        actionsHTML = `<span class="actions-not-available">عملیات در دسترس نیست</span>`;
    } else {
        if (reg.status === 'pending') {
            actionsHTML = `
                <button class="btn btn-success btn-sm update-status-btn" data-status="confirmed" title="تایید ثبت‌نام">✔️</button>
                <button class="btn btn-danger btn-sm update-status-btn" data-status="rejected" title="رد ثبت‌نام">✖️</button>
            `;
        } else {
            actionsHTML = `
                <button class="btn btn-secondary btn-sm-text update-status-btn" data-status="pending" title="بازگردانی به حالت انتظار">بازگردانی</button>
            `;
        }
    }

    return `
        <td style="white-space: nowrap;">${reg.full_name || '---'}</td>
        <td>${eventTitle}</td>
        <td>${reg.student_id || '---'}</td>
        <td>${reg.card_last_four_digits || '---'}</td>
        <td>${reg.transaction_time || '---'}</td>
        <td class="status-cell">${getStatusBadge(reg.status)}</td>
        <td class="actions-cell">${actionsHTML}</td>
    `;
};


const renderRegistrationsList = (registrations) => {
    const container = document.getElementById('registrations-admin-list');
    if (!container) return;

    if (!registrations || registrations.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.8; padding: 2rem;">هیچ ثبت‌نامی برای نمایش یافت نشد.</p>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.innerHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>نام کامل</th>
                        <th>رویداد</th>
                        <th>کد دانشجویی</th>
                        <th>۴ رقم کارت</th>
                        <th>زمان واریز</th>
                        <th>وضعیت</th>
                        <th class="actions-header">عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map(reg => {
                        const event = state.allEvents.find(e => e.id === reg.event_id);
                        const isPastEvent = event ? new Date(event.endDate) < today : false;

                        const eventTitle = reg.events ? reg.events.title : 'رویداد حذف شده';
                        const searchTerms = `${(reg.full_name || '').toLowerCase()} ${eventTitle.toLowerCase()} ${(reg.email || '').toLowerCase()} ${reg.student_id || ''} ${reg.card_last_four_digits || ''} ${reg.transaction_time || ''}`;
                        
                        return `<tr data-registration-id="${reg.id}" data-status="${reg.status}" data-search-terms="${searchTerms.trim()}" data-event-id="${reg.event_id}">
                                    ${renderRegistrationRowHTML(reg, isPastEvent)}
                                </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
};

// src/assets/js/modules/admin.js

const initializeRegistrationsModule = () => {
    const container = document.getElementById('admin-main-content');
    if (!container) return;

    const listContainer = container.querySelector('#registrations-admin-list');
    const searchInput = container.querySelector('#registration-search');
    const statusFilter = container.querySelector('#status-filter');
    const eventFilter = container.querySelector('#event-filter');

    const populateEventFilter = () => {
        if (!eventFilter || !state.allEvents) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = state.allEvents
            .filter(event => new Date(event.endDate) >= today)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        const pastEvents = state.allEvents
            .filter(event => new Date(event.endDate) < today)
            .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

        let optionsHTML = '<option value="all">همه رویدادها</option>';

        if (upcomingEvents.length > 0) {
            optionsHTML += '<optgroup label="رویدادهای در حال اجرا">';
            upcomingEvents.forEach(event => {
                optionsHTML += `<option value="${event.id}">${event.title}</option>`;
            });
            optionsHTML += '</optgroup>';
        }

        if (pastEvents.length > 0) {
            optionsHTML += '<optgroup label="رویدادهای گذشته">';
            pastEvents.forEach(event => {
                optionsHTML += `<option value="${event.id}">${event.title}</option>`;
            });
            optionsHTML += '</optgroup>';
        }
        eventFilter.innerHTML = optionsHTML;
    };

    populateEventFilter();

    const filterAndRender = () => {
        const searchTerm = (searchInput.value || '').toLowerCase().trim();
        const status = statusFilter.value;
        const eventId = eventFilter.value;
        const allRows = listContainer.querySelectorAll('tbody tr');

        allRows.forEach(row => {
            const isSearchMatch = searchTerm === '' || (row.dataset.searchTerms || '').includes(searchTerm);
            const isStatusMatch = status === 'all' || row.dataset.status === status;
            const isEventMatch = eventId === 'all' || row.dataset.eventId == eventId;
            
            row.style.display = isSearchMatch && isStatusMatch && isEventMatch ? '' : 'none';
        });
    };
    
    if (searchInput) searchInput.addEventListener('input', filterAndRender);
    if (statusFilter) statusFilter.addEventListener('change', filterAndRender);
    if (eventFilter) eventFilter.addEventListener('change', filterAndRender);

    filterAndRender();

    if (listContainer) {
        listContainer.addEventListener('click', async (e) => {
            const button = e.target.closest('.update-status-btn');
            if (!button) return;

            const row = button.closest('tr');
            const registrationId = row.dataset.registrationId;
            const newStatus = button.dataset.status;
            
            const originalEventId = row.dataset.eventId; 
            const eventTitleCell = row.querySelector('td:nth-child(2)');
            const preservedEventTitle = eventTitleCell ? eventTitleCell.textContent : 'رویداد حذف شده';

            row.querySelectorAll('.update-status-btn').forEach(btn => {
                btn.innerHTML = '...';
                btn.disabled = true;
            });

            try {
                const { data: updatedRegistration, error } = await updateRegistrationStatus(registrationId, newStatus);
                if (error) throw error;
                if (!updatedRegistration) throw new Error("No data returned from server after update.");
                
                updatedRegistration.events = { title: preservedEventTitle };

                const searchTerms = `${(updatedRegistration.full_name || '').toLowerCase()} ${preservedEventTitle.toLowerCase()} ${(updatedRegistration.email || '').toLowerCase()} ${updatedRegistration.student_id || ''} ${updatedRegistration.card_last_four_digits || ''} ${updatedRegistration.transaction_time || ''}`;
                // **Corrected Block:** Re-render the entire row with all necessary data attributes
                row.outerHTML = `<tr data-registration-id="${updatedRegistration.id}" data-status="${updatedRegistration.status}" data-search-terms="${searchTerms.trim()}" data-event-id="${originalEventId}">
                                    ${renderRegistrationRowHTML(updatedRegistration)}
                                 </tr>`;

                                 
            } catch (error) {
                console.error("Update Error:", error);
                alert('خطا در به‌روزرسانی وضعیت. لطفاً کنسول را بررسی کنید.');
                const refreshedData = await loadRegistrations();
                renderRegistrationsList(refreshedData);
            }
        });
    }
};

// src/assets/js/modules/admin.js

const initializeGlobalRefreshButton = () => {
    const refreshBtn = document.getElementById('admin-global-refresh-btn');
    if (!refreshBtn) return;
    const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const errorIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    const originalBtnHTML = refreshBtn.innerHTML;

    refreshBtn.addEventListener('click', async () => {
        const currentPath = location.hash.substring(1) || '/admin/messages';
        const route = adminRoutes[currentPath];
        if (!route) return;

        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');
        refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;

        try {
            const data = await route.loader();
            
            const renderData = (currentPath === '/admin/events' || currentPath === '/admin/registrations' || currentPath === '/admin/news') 
                ? data[0] 
                : data;

            route.renderer(renderData);
            
            if (route.initializer) {
                route.initializer();
            }
            
            refreshBtn.classList.remove('loading');
            refreshBtn.classList.add('success');
            refreshBtn.innerHTML = checkIconSVG;

        } catch (error) {
            console.error(`Error refreshing page ${currentPath}:`, error);
            refreshBtn.classList.remove('loading');
            refreshBtn.classList.add('error');
            refreshBtn.innerHTML = errorIconSVG;
        } finally {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('success', 'error');
                refreshBtn.innerHTML = originalBtnHTML;
            }, 2000);
        }
    });
};


// src/assets/js/modules/admin.js
const initializeDatepicker = () => {
    const dateRangeInput = document.getElementById('event-date-range-flatpickr');
    const displayDateInput = document.getElementById('event-display-date');

    let rangeInstance = null;

    // Instance 1: For the main event date range (system date). This remains independent.
    if (dateRangeInput) {
        rangeInstance = flatpickr(dateRangeInput, {
            mode: "range",
            locale: "fa",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "Y/m/d"
        });
    }

    // Instance 2: For the display date, with logic to convert the selected range into a Persian text string.
    if (displayDateInput) {
        flatpickr(displayDateInput, {
            mode: "range",
            locale: "fa",
            altInput: true,
            altFormat: "j F Y",
            dateFormat: "Y-m-d",
            onClose: function(selectedDates, dateStr, instance) {
                if (selectedDates.length === 2) {
                    const [start, end] = selectedDates;

                    const areConsecutiveDays = (d1, d2) => {
                        const nextDay = new Date(d1.gregoriandate || d1);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const endDate = new Date(d2.gregoriandate || d2);
                        return nextDay.toDateString() === endDate.toDateString();
                    };
                    
                    // <<-- START: CHANGE -->>
                    // Convert numbers to Persian before creating the string
                    const startDay = toPersianNumber(instance.formatDate(start, "j"));
                    const endDay = toPersianNumber(instance.formatDate(end, "j"));
                    const startMonthName = instance.formatDate(start, "F");
                    const endMonthName = instance.formatDate(end, "F");
                    const startYear = toPersianNumber(instance.formatDate(start, "Y"));
                    const endYear = toPersianNumber(instance.formatDate(end, "Y"));
                    // <<-- END: CHANGE -->>
                    
                    let displayString = "";

                    if (startYear !== endYear) {
                        displayString = `${startDay} ${startMonthName} ${startYear} الی ${endDay} ${endMonthName} ${endYear}`;
                    } else if (startMonthName !== endMonthName) {
                        displayString = `${startDay} ${startMonthName} الی ${endDay} ${endMonthName} ${startYear}`;
                    } else {
                        if (startDay !== endDay && areConsecutiveDays(start, end)) {
                             displayString = `${startDay} و ${endDay} ${startMonthName} ${startYear}`;
                        } else if (startDay === endDay) {
                            displayString = `${startDay} ${startMonthName} ${startYear}`;
                        } else {
                            displayString = `${startDay} الی ${endDay} ${startMonthName} ${startYear}`;
                        }
                    }

                    instance.input.value = displayString;
                    if (instance.altInput) {
                        instance.altInput.value = displayString;
                    }
                }
            }
        });
    }
    
    return rangeInstance;
};



const initializeJournalModule = () => {
    const journalForm = document.getElementById('add-journal-form');
    if (!journalForm) return;

    const formTitle = document.getElementById('journal-form-title');
    const submitBtn = document.getElementById('journal-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const hiddenIdInput = document.getElementById('journal-id');
    const adminListContainer = document.getElementById('journal-admin-list');
    
    ['cover', 'file'].forEach(type => {
        const input = document.getElementById(`journal-${type}`);
        const wrapperId = type === 'cover' ? 'cover-upload-wrapper' : 'pdf-upload-wrapper';
        const wrapper = document.getElementById(wrapperId);
        if (!input || !wrapper) return;
        
        const nameDisplay = wrapper.querySelector('.file-name-display');
        const clearBtn = wrapper.querySelector('.file-clear-btn');

        const updateFileName = () => {
            if (input.files && input.files[0]) {
                const fullName = input.files[0].name;
                const maxChars = 10;
                let displayName = fullName;

                const lastDotIndex = fullName.lastIndexOf('.');
                if (lastDotIndex > 0) {
                    const nameWithoutExt = fullName.substring(0, lastDotIndex);
                    const extension = fullName.substring(lastDotIndex);
                    if (nameWithoutExt.length > maxChars) {
                        displayName = nameWithoutExt.substring(0, maxChars) + '...' + extension;
                    }
                } else {
                    if (fullName.length > maxChars) {
                        displayName = fullName.substring(0, maxChars) + '...';
                    }
                }
                
                nameDisplay.textContent = displayName;
                nameDisplay.style.opacity = 1;
                wrapper.classList.add('file-selected');
            } else {
                nameDisplay.textContent = 'هیچ فایلی انتخاب نشده';
                nameDisplay.style.opacity = 0.8;
                wrapper.classList.remove('file-selected');
            }
        };

        input.addEventListener('change', () => {
            if (type === 'file' && input.files[0] && input.files[0].type !== 'application/pdf') {
                alert('خطا: فقط فایل با فرمت PDF مجاز است.');
                input.value = '';
            }
            updateFileName();
        });
        
        clearBtn.addEventListener('click', () => {
            input.value = '';
            updateFileName();
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            wrapper.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            wrapper.addEventListener(eventName, () => wrapper.classList.add('is-dragging'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            wrapper.addEventListener(eventName, () => wrapper.classList.remove('is-dragging'));
        });
        wrapper.addEventListener('drop', (e) => {
            input.files = e.dataTransfer.files;
            if (type === 'file' && input.files[0] && input.files[0].type !== 'application/pdf') {
                alert('خطا: فقط فایل با فرمت PDF مجاز است.');
                input.value = '';
            }
            updateFileName();
        });
    });

    const coverFileInput = document.getElementById('journal-cover');
    const journalFileInput = document.getElementById('journal-file');

    const resetForm = () => {
        journalForm.reset();
        coverFileInput.dispatchEvent(new Event('change'));
        journalFileInput.dispatchEvent(new Event('change'));
        hiddenIdInput.value = '';
        formTitle.textContent = 'درج نشریه جدید';
        submitBtn.textContent = 'افزودن نشریه';
        cancelBtn.style.display = 'none';
        coverFileInput.required = true;
        journalFileInput.required = true;
        journalForm.scrollIntoView({ behavior: 'smooth' });
    };

    journalForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const statusBox = journalForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;
        const formData = new FormData(journalForm);
        
        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال آپلود و ویرایش...' : 'در حال آپلود و افزودن...';

        try {
            const coverFile = formData.get('coverFile');
            const journalFile = formData.get('journalFile');
            
            const originalIssue = isEditing ? state.allJournalIssues.find(j => j.id == isEditing) : null;
            const oldFilesToDelete = [];

            let finalCoverUrl = originalIssue ? originalIssue.coverUrl : null;
            let finalFileUrl = originalIssue ? originalIssue.fileUrl : null;

            const uploadFile = async (file, folder) => {
                if (!file || file.size === 0) return null;

                const issueNumber = formData.get('issueNumber') || 'NA';
                const now = new Date();
                const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                const extension = file.name.split('.').pop();
                const fileName = `${folder}/ju-${issueNumber}-${timestamp}.${extension}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('journal-assets')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabaseClient.storage
                    .from('journal-assets')
                    .getPublicUrl(fileName);
                
                return data.publicUrl;
            };
            
            // مرحله ۱: بررسی فایل کاور جدید
            if (coverFile && coverFile.size > 0) {
                // اگر فایل جدیدی انتخاب شده بود، URL قدیمی را به لیست حذف اضافه کن
                if (originalIssue && originalIssue.coverUrl) {
                    oldFilesToDelete.push(originalIssue.coverUrl);
                }
                // فایل جدید را آپلود و URL آن را در متغیر نهایی ذخیره کن
                finalCoverUrl = await uploadFile(coverFile, 'covers');
            }

            // مرحله ۲: بررسی فایل PDF جدید
            if (journalFile && journalFile.size > 0) {
                // اگر فایل جدیدی انتخاب شده بود، URL قدیمی را به لیست حذف اضافه کن
                if (originalIssue && originalIssue.fileUrl) {
                    oldFilesToDelete.push(originalIssue.fileUrl);
                }
                // فایل جدید را آپلود و URL آن را در متغیر نهایی ذخیره کن
                finalFileUrl = await uploadFile(journalFile, 'files');
            }

            // مرحله ۳: آماده‌سازی داده‌ها برای ارسال به دیتابیس
            const entryData = {
                title: formData.get('title'),
                issueNumber: formData.get('issueNumber') ? parseInt(formData.get('issueNumber'), 10) : null,
                date: formData.get('date'),
                summary: formData.get('summary'),
                coverUrl: finalCoverUrl, // استفاده از URL نهایی (جدید یا قدیمی)
                fileUrl: finalFileUrl   // استفاده از URL نهایی (جدید یا قدیمی)
            };
            
            // مرحله ۴: به‌روزرسانی یا درج در دیتابیس
            if (isEditing) {
                await updateJournalEntry(isEditing, entryData);
                showStatus(statusBox, 'نشریه با موفقیت ویرایش شد.', 'success');
            } else {
                await addJournalEntry(entryData);
                showStatus(statusBox, 'نشریه با موفقیت افزوده شد.', 'success');
            }
            
            // مرحله ۵: پس از موفقیت دیتابیس، فایل‌های قدیمی را از باکت حذف کن
            if (oldFilesToDelete.length > 0) {
                await deleteJournalFiles(oldFilesToDelete);
            }

            // مرحله ۶: به‌روزرسانی رابط کاربری
            state.allJournalIssues = await loadJournal();
            renderJournalList(state.allJournalIssues);
            resetForm();

        } catch (error) {
            console.error("Error during journal submission:", error);
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'ذخیره تغییرات' : 'افزودن نشریه';
        }
    });

    cancelBtn.addEventListener('click', resetForm);

    adminListContainer.addEventListener('click', async (event) => {
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
            
            coverFileInput.required = false;
            journalFileInput.required = false;

            formTitle.textContent = 'ویرایش نشریه';
            submitBtn.textContent = 'ذخیره تغییرات';
            cancelBtn.style.display = 'inline-block';
            journalForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const issueToDelete = state.allJournalIssues.find(j => j.id == id);
            if (!issueToDelete) return;

            if (confirm('آیا از حذف این نشریه مطمئن هستید؟ فایل‌های آن نیز برای همیشه از سرور پاک خواهند شد.')) {
                try {
                    deleteBtn.textContent = '...';
                    deleteBtn.disabled = true;

                    await deleteJournalEntry(id);

                    const filesToDelete = [issueToDelete.coverUrl, issueToDelete.fileUrl];
                    await deleteJournalFiles(filesToDelete);

                    state.allJournalIssues = state.allJournalIssues.filter(j => j.id != id);
                    renderJournalList(state.allJournalIssues);

                } catch (error) {
                    alert('خطا در حذف نشریه.');
                    console.error("Deletion Error:", error);
                    deleteBtn.textContent = 'حذف';
                    deleteBtn.disabled = false;
                }
            }
        }
    });
};

const initializeMessagesModule = () => { /* No specific JS needed */ };

const initializeNewsModule = async () => {
    const newsForm = document.getElementById('add-news-form');
    if (!newsForm) return;

    let selectedTagIds = [];
    let currentImageUrl = '';
    let imageUrlToDelete = null;

    const formTitle = document.getElementById('news-form-title');
    const submitBtn = document.getElementById('news-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const hiddenIdInput = document.getElementById('news-id');
    const adminListContainer = document.getElementById('news-admin-list');
    const imageUploadInput = document.getElementById('news-image-upload');
    const authorSelect = document.getElementById('news-author');
    const linkInput = document.getElementById('news-link');
    const dateInput = document.getElementById('news-date');
    const readingTimeInput = document.getElementById('news-reading-time');
    const openTagsModalBtn = document.getElementById('open-tags-modal-btn');
    const selectedTagsDisplay = document.getElementById('selected-tags-display');

    const populateAuthors = () => {
        if (!authorSelect) return;
        authorSelect.innerHTML = '<option value="" disabled>انتخاب نویسنده...</option>';
        const membersWithUsers = Array.from(state.membersMap.values()).filter(m => m.uuid);
        
        membersWithUsers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            authorSelect.appendChild(option);
        });

        const currentUserProfile = membersWithUsers.find(m => m.uuid === state.user.id);
        if (currentUserProfile) {
            authorSelect.value = currentUserProfile.id;
        } else {
            authorSelect.selectedIndex = 0;
        }
    };

    populateAuthors();
    
    if (dateInput) {
        flatpickr(dateInput, {
            locale: "fa",
            altInput: true,
            altFormat: "j F Y", 
            dateFormat: "Y/m/d", 
            onClose: function(selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const jalaliDate = new instance.l10n.date(selectedDates[0]);
                    const day = toPersianNumber(jalaliDate.getDate());
                    const monthName = instance.l10n.months.longhand[jalaliDate.getMonth()];
                    const year = toPersianNumber(jalaliDate.getFullYear());
                    instance.altInput.value = `${day} ${monthName} ${year}`;
                }
            }
        });
    }

    if (linkInput) {
        linkInput.addEventListener('blur', () => {
            let slug = linkInput.value.trim().toLowerCase()
                   .replace(/\s+/g, '-')
                   .replace(/[^a-z0-9-_]/g, '');
            linkInput.value = slug;
        });
    }

    const parseReadingTime = (value) => {
        const numericMatch = (value || '').match(/[\d۰-۹]+/);
        return numericMatch ? numericMatch[0].replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)) : '';
    };

    if(readingTimeInput) {
        readingTimeInput.addEventListener('focus', () => { readingTimeInput.value = parseReadingTime(readingTimeInput.value); });
        readingTimeInput.addEventListener('blur', () => {
            const value = readingTimeInput.value.trim();
            if (value && !isNaN(value)) {
                readingTimeInput.value = `${toPersianNumber(value)} دقیقه مطالعه`;
            } else {
                readingTimeInput.value = '';
            }
        });
    }
    
    const updateSelectedTagsDisplay = () => {
        if (!selectedTagsDisplay) return;
        selectedTagsDisplay.innerHTML = selectedTagIds.length > 0
            ? selectedTagIds.map(id => `<span class="tag">${state.tagsMap.get(id) || '?'}</span>`).join('')
            : 'هیچ تگی انتخاب نشده است.';
    };

    if (openTagsModalBtn) {
        openTagsModalBtn.addEventListener('click', () => {
            window.openTagsModal(selectedTagIds, (newSelectedIds) => {
                selectedTagIds = newSelectedIds;
                updateSelectedTagsDisplay();
            });
        });
    }

    const imageUploadControls = newsForm.querySelector('.image-upload-controls');
    const fileNameDisplay = imageUploadControls?.querySelector('.file-name-display');
    const fileClearBtn = imageUploadControls?.querySelector('.file-clear-btn');
    const fileSelectBtn = imageUploadControls?.querySelector('.file-select-btn');

    const updateImageUploadUI = (fileName) => {
        if (!fileNameDisplay || !fileSelectBtn || !fileClearBtn) return;
        const isEditing = !!hiddenIdInput.value;
        const hasFile = !!fileName;

        fileNameDisplay.textContent = hasFile ? fileName : 'فایلی انتخاب نشده';
        fileSelectBtn.textContent = isEditing && hasFile ? 'تغییر تصویر' : 'انتخاب تصویر';
        fileClearBtn.style.display = isEditing ? 'none' : (hasFile ? 'inline-block' : 'none');
    };

    if(imageUploadInput) { 
        imageUploadInput.addEventListener('change', () => { 
            const file = imageUploadInput.files[0]; 
            if (file) {
                if (currentImageUrl) {
                    imageUrlToDelete = currentImageUrl; 
                }
                updateImageUploadUI(file.name);
            }
        }); 
    }

    if(fileClearBtn) {
        fileClearBtn.addEventListener('click', () => {
            imageUploadInput.value = '';
            updateImageUploadUI('');
        });
    }

    const resetForm = () => {
        newsForm.reset();
        hiddenIdInput.value = '';
        currentImageUrl = '';
        imageUrlToDelete = null;
        updateImageUploadUI('');
        imageUploadInput.required = true;
        formTitle.textContent = 'درج خبر جدید';
        submitBtn.textContent = 'افزودن خبر';
        cancelBtn.style.display = 'none';
        selectedTagIds = [];
        updateSelectedTagsDisplay();
        populateAuthors(); 
        if (dateInput && dateInput._flatpickr) { 
            dateInput._flatpickr.clear(); 
        }
        newsForm.scrollIntoView({ behavior: 'smooth' });
    };

    newsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const statusBox = newsForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;
        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال ویرایش...' : 'در حال افزودن...';

        try {
            const formData = new FormData(newsForm);
            const slug = formData.get('link').trim();
            const imageFile = formData.get('imageFile');

            if (!slug) throw new Error("شناسه لینک (Slug) نمی‌تواند خالی باشد.");

            const readingTimeRawValue = formData.get('readingTime');
            const numericReadingTime = parseReadingTime(readingTimeRawValue);
            let formattedReadingTime = '';
            if (numericReadingTime && !isNaN(numericReadingTime)) {
                formattedReadingTime = `${toPersianNumber(numericReadingTime)} دقیقه مطالعه`;
            }
            
            const authorId = parseInt(formData.get('authorId'), 10);
            if (!authorId) throw new Error("نویسنده انتخاب نشده است.");

            const newsData = {
                title: formData.get('title'),
                summary: formData.get('summary'),
                readingTime: formattedReadingTime,
                authorId: authorId,
                tag_ids: selectedTagIds,
                content: JSON.parse(formData.get('content')),
            };

            if (isEditing) {
                const originalNewsItem = state.allNews.find(n => n.id == isEditing);
                const newDateValue = dateInput._flatpickr.altInput.value;

                if (newDateValue && newDateValue !== originalNewsItem.date) {
                    newsData.date = newDateValue;
                }

                let finalImageUrl = currentImageUrl;
                if (imageFile && imageFile.size > 0) {
                    finalImageUrl = await uploadNewsImage(imageFile, slug, isEditing);
                }
                
                newsData.image = finalImageUrl;
                newsData.link = `#/news/${isEditing}-${slug}`;
                await updateNews(isEditing, newsData);

                if (imageUrlToDelete && imageUrlToDelete !== finalImageUrl) {
                    await deleteNewsImage(imageUrlToDelete);
                }

                showStatus(statusBox, 'خبر با موفقیت ویرایش شد.', 'success');
            } else {
                const dateValue = dateInput._flatpickr.altInput.value;
                if (!dateValue) throw new Error("تاریخ خبر الزامی است.");
                newsData.date = dateValue;

                if (!imageFile) throw new Error("تصویر خبر الزامی است.");
                
                const { data: newNews } = await addNews(newsData);
                if (!newNews || !newNews.id) throw new Error("خطا در ایجاد رکورد اولیه خبر.");
                
                const finalImageUrl = await uploadNewsImage(imageFile, slug, newNews.id);
                
                const finalLink = `#/news/${newNews.id}-${slug}`;
                await updateNews(newNews.id, { image: finalImageUrl, link: finalLink });
                
                showStatus(statusBox, 'خبر با موفقیت افزوده شد.', 'success');
            }

            state.allNews = await loadNews();
            renderNewsList(state.allNews);
            resetForm();
        } catch (error) {
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'ذخیره تغییرات' : 'افزودن خبر';
        }
    });

    if(cancelBtn) cancelBtn.addEventListener('click', resetForm);

    adminListContainer.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.edit-news-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const newsItem = state.allNews.find(n => n.id == id);
            if (!newsItem) return;

            resetForm(); 
            
            hiddenIdInput.value = newsItem.id;
            currentImageUrl = newsItem.image || '';
            imageUploadInput.required = !currentImageUrl;
            updateImageUploadUI(currentImageUrl ? currentImageUrl.split('/').pop() : '');
            
            document.getElementById('news-title').value = newsItem.title || '';
            document.getElementById('news-summary').value = newsItem.summary || '';
            const slugToDisplay = (newsItem.link || '').replace(`#/news/${id}-`, '');
            document.getElementById('news-link').value = slugToDisplay;
            
            // The date field is now intentionally left blank on edit.
            // It is cleared by resetForm() and no longer repopulated.

            readingTimeInput.value = newsItem.readingTime || '';
            
            authorSelect.value = newsItem.authorId || '';

            document.getElementById('news-content').value = JSON.stringify(newsItem.content, null, 2);
            selectedTagIds = newsItem.tag_ids || [];
            updateSelectedTagsDisplay();
            formTitle.textContent = 'ویرایش خبر';
            submitBtn.textContent = 'ذخیره تغییرات';
            cancelBtn.style.display = 'inline-block';
            newsForm.scrollIntoView({ behavior: 'smooth' });
        }
        const deleteBtn = event.target.closest('.delete-news-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const newsToDelete = state.allNews.find(n => n.id == id);
            if (!newsToDelete) return;
            if (confirm('آیا از حذف این خبر مطمئن هستید؟ این عملیات غیرقابل بازگشت است.')) {
                try {
                    deleteBtn.disabled = true;
                    if (newsToDelete.image) await deleteNewsImage(newsToDelete.image);
                    await deleteNews(id);
                    state.allNews = state.allNews.filter(n => n.id != id);
                    renderNewsList(state.allNews);
                } catch (error) {
                    alert('خطا در حذف خبر.');
                    deleteBtn.disabled = false;
                }
            }
        }
    });
};

const initializeEventsModule = async () => {
    const eventForm = document.getElementById('add-event-form');
    if (!eventForm) return;

    let selectedTagIds = [];
    let currentImageUrl = '';
    let imageUrlToDelete = null;
    let dateRangePickerInstance = initializeDatepicker();
    let eventBeingEdited = null;

    const regDateRangeInput = document.getElementById('registration-date-range');
    let regDateRangePicker = null;

    if (regDateRangeInput) {
        regDateRangePicker = flatpickr(regDateRangeInput, {
            mode: "range",
            locale: "fa",
            altInput: true,
            altFormat: "Y/m/d",
            dateFormat: "Y-m-d"
        });
    }

    const formTitle = document.getElementById('event-form-title');
    const submitBtn = document.getElementById('event-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const hiddenIdInput = document.getElementById('event-id');
    const adminListContainer = document.getElementById('events-admin-list');
    const imageUploadInput = document.getElementById('event-image-upload');
    const locationInput = document.getElementById('event-location');
    const locationToggle = document.getElementById('toggle-location-online');
    const costInput = document.getElementById('event-cost');
    const costToggle = document.getElementById('toggle-cost-free');
    
    const capacityInput = document.getElementById('event-capacity');
    const capacityToggle = document.getElementById('toggle-capacity-unlimited');
    const detailPageInput = document.getElementById('event-detail-page');
    const instructorInput = document.getElementById('event-instructor');
    const paymentInfoSection = document.getElementById('payment-info-section');
    const paymentNumberInput = document.getElementById('payment-number');
    const contactPhoneInput = document.getElementById('contact-phone');
    const contactTelegramInput = document.getElementById('contact-telegram');
    const contactWhatsappInput = document.getElementById('contact-whatsapp');
    const imageUploadControls = eventForm.querySelector('.image-upload-controls');
    const fileNameDisplay = imageUploadControls ? imageUploadControls.querySelector('.file-name-display') : null;
    const fileClearBtn = imageUploadControls ? imageUploadControls.querySelector('.file-clear-btn') : null;
    const fileSelectBtn = imageUploadControls ? imageUploadControls.querySelector('.file-select-btn') : null;
    const openTagsModalBtn = document.getElementById('open-tags-modal-btn');
    const selectedTagsDisplay = document.getElementById('selected-tags-display');

    const toEnglishNumber = (str) => {
        if (str === null || str === undefined) return '';
        const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        return String(str).replace(/ تومان/g, '').replace(/٬|,/g, '').trim().split('').map(c => english[persian.indexOf(c)] || c).join('');
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '') return '';
        const number = Number(num);
        if (isNaN(number)) return '';
        return new Intl.NumberFormat('fa-IR').format(number);
    };

    if (costInput) {
        costInput.addEventListener('input', (e) => {
            if (costToggle.checked) return;
            const sanitizedValue = toEnglishNumber(e.target.value).replace(/[^0-9]/g, '');
            e.target.value = formatNumber(sanitizedValue);
        });
    
        costInput.addEventListener('focus', (e) => {
            if (costToggle.checked) return;
            e.target.value = toEnglishNumber(e.target.value);
        });
    
        costInput.addEventListener('blur', (e) => {
            if (costToggle.checked || !e.target.value) return;
            const numericValue = toEnglishNumber(e.target.value);
            if (numericValue && !isNaN(numericValue)) {
                e.target.value = `${formatNumber(numericValue)} تومان`;
            } else {
                e.target.value = '';
            }
        });
    }

    if (paymentNumberInput) {
        paymentNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9-]/g, '').replace(/-/g, '');
            let formattedValue = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += '-';
                }
                formattedValue += value[i];
            }
            e.target.value = formattedValue;
        });
    }

    const updateSelectedTagsDisplay = () => {
        if (!selectedTagsDisplay) return;
        selectedTagsDisplay.innerHTML = selectedTagIds.length > 0
            ? selectedTagIds.map(id => `<span class="tag">${state.tagsMap.get(id) || '?'}</span>`).join('')
            : 'هیچ تگی انتخاب نشده است.';
    };

    if (openTagsModalBtn) {
        openTagsModalBtn.addEventListener('click', () => {
            window.openTagsModal(selectedTagIds, (newSelectedIds) => {
                selectedTagIds = newSelectedIds;
                updateSelectedTagsDisplay();
            });
        });
    }

    const setupSmartContactInputs = () => {
        const sanitizePhoneNumber = (phone) => {
            let sanitized = phone.trim().replace(/[^\d+]/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
            if (sanitized.startsWith('+98')) return sanitized.substring(3);
            if (sanitized.startsWith('0098')) return sanitized.substring(4);
            if (sanitized.startsWith('0')) return sanitized.substring(1);
            return sanitized;
        };
        if (contactTelegramInput) {
            contactTelegramInput.addEventListener('blur', () => {
                let value = contactTelegramInput.value.trim();
                if (!value || value.startsWith('https://t.me/')) return;
                if (value.startsWith('@')) value = `https://t.me/${value.substring(1)}`;
                else { const phone = sanitizePhoneNumber(value); if (/^9\d{9}$/.test(phone)) value = `https://t.me/+98${phone}`; }
                contactTelegramInput.value = value;
            });
        }
        if (contactWhatsappInput) {
            contactWhatsappInput.addEventListener('blur', () => {
                let value = contactWhatsappInput.value.trim();
                if (!value || value.startsWith('https://wa.me/')) return;
                const phone = sanitizePhoneNumber(value);
                if (/^9\d{9}$/.test(phone)) value = `https://wa.me/98${phone}`;
                contactWhatsappInput.value = value;
            });
        }
    };
    setupSmartContactInputs();

    const togglePaymentFields = () => {
        if (!paymentInfoSection || !costToggle) return;
        paymentInfoSection.style.display = costToggle.checked ? 'none' : 'block';
    };
    if(costToggle) costToggle.addEventListener('change', togglePaymentFields);

    const updateImageUploadUI = (fileName) => {
        if (!fileNameDisplay || !fileSelectBtn || !fileClearBtn) return;
        const isEditing = !!hiddenIdInput.value;
        const hasFile = !!fileName;

        fileNameDisplay.textContent = hasFile ? fileName : 'فایلی انتخاب نشده';
        fileSelectBtn.textContent = isEditing && hasFile ? 'تغییر تصویر' : 'انتخاب تصویر';
        
        // Hide delete button if in edit mode. Otherwise, show it only if a file is selected.
        fileClearBtn.style.display = isEditing ? 'none' : (hasFile ? 'inline-block' : 'none');
    };

    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', () => {
            const file = imageUploadInput.files[0];
            if (file) {
                if (currentImageUrl) {
                    imageUrlToDelete = currentImageUrl; // Mark old image for deletion
                }
                updateImageUploadUI(file.name);
            }
        });
    }

    if (fileClearBtn) {
        fileClearBtn.addEventListener('click', () => {
            imageUploadInput.value = '';
            // No need to manage imageUrlToDelete here, as this button is hidden in edit mode
            updateImageUploadUI('');
        });
    }
    
    const setupToggleSwitch = (input, toggle, options = {}) => {
        if (!input || !toggle) return;
        const { placeholderOnCheck = '' } = options;
        const originalPlaceholder = input.placeholder;
        toggle.addEventListener('change', () => {
            input.disabled = toggle.checked;
            input.value = '';
            input.placeholder = toggle.checked ? placeholderOnCheck : originalPlaceholder;
            if (!toggle.checked) input.focus();
        });
    };
    
    setupToggleSwitch(locationInput, locationToggle, { placeholderOnCheck: 'آنلاین' });
    setupToggleSwitch(costInput, costToggle, { placeholderOnCheck: 'رایگان' });
    setupToggleSwitch(capacityInput, capacityToggle, { placeholderOnCheck: 'نامحدود' });

    if(detailPageInput) detailPageInput.addEventListener('blur', () => { detailPageInput.value = detailPageInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, ''); });
    
    const safeJsonStringify = (obj) => { try { return obj ? JSON.stringify(obj, null, 2) : ''; } catch (e) { return typeof obj === 'string' ? obj : ''; } };
    
    const resetForm = () => {
        eventForm.reset();
        hiddenIdInput.value = '';
        currentImageUrl = '';
        imageUrlToDelete = null;
        eventBeingEdited = null;
        updateImageUploadUI('');
        imageUploadInput.required = true;
        if (dateRangePickerInstance) dateRangePickerInstance.clear();
        if (regDateRangePicker) regDateRangePicker.clear();
        const displayDateInput = document.getElementById('event-display-date');
        if (displayDateInput && displayDateInput._flatpickr) displayDateInput._flatpickr.clear();
        formTitle.textContent = 'درج رویداد جدید';
        submitBtn.textContent = 'افزودن رویداد';
        cancelBtn.style.display = 'none';
        [locationToggle, costToggle, capacityToggle].forEach(toggle => { if (toggle) { toggle.checked = false; toggle.dispatchEvent(new Event('change')); } });
        selectedTagIds = [];
        updateSelectedTagsDisplay();
        togglePaymentFields();
        eventForm.scrollIntoView({ behavior: 'smooth' });
    };

    eventForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const statusBox = eventForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;
        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال ویرایش...' : 'در حال افزودن...';

        try {
            const getEventDataFromForm = () => {
                const formData = new FormData(eventForm);
                const formatForSupabase = (date) => date ? new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10) : null;
                
                let [startDate, endDate] = [null, null];
                if (dateRangePickerInstance.selectedDates.length === 2) {
                    [startDate, endDate] = [formatForSupabase(dateRangePickerInstance.selectedDates[0]), formatForSupabase(dateRangePickerInstance.selectedDates[1])];
                } else if (isEditing && eventBeingEdited) {
                    [startDate, endDate] = [eventBeingEdited.startDate, eventBeingEdited.endDate];
                }

                let [regStartDate, regEndDate] = [null, null];
                if (regDateRangePicker.selectedDates.length === 2) {
                    [regStartDate, regEndDate] = [formatForSupabase(regDateRangePicker.selectedDates[0]), formatForSupabase(regDateRangePicker.selectedDates[1])];
                } else if (isEditing && eventBeingEdited) {
                    [regStartDate, regEndDate] = [eventBeingEdited.registrationStartDate, eventBeingEdited.registrationEndDate];
                }
                
                let displayDateValue = formData.get('displayDate');
                if (!displayDateValue && isEditing && eventBeingEdited) {
                    displayDateValue = eventBeingEdited.displayDate;
                }

                if (!startDate || !endDate) throw new Error("بازه تاریخ اصلی رویداد الزامی است.");
                if (!displayDateValue) throw new Error("بازه برگزاری جلسات الزامی است.");

                const parseJsonField = (fieldName) => {
                    const value = formData.get(fieldName);
                    try { return value ? JSON.parse(value) : null; } catch (e) { throw new Error(`فرمت JSON در فیلد "${fieldName}" نامعتبر است.`); }
                };
                
                const capacityValue = capacityToggle.checked ? -1 : (parseInt(formData.get('capacity'), 10) || null);
                const contactInfo = { phone: formData.get('contact_phone').trim(), telegram: formData.get('contact_telegram').trim(), whatsapp: formData.get('contact_whatsapp').trim() };
                const paymentInfo = { name: formData.get('payment_name').trim(), number: formData.get('payment_number').trim() };
                
                let costValue = costToggle.checked ? 'رایگان' : costInput.value;
                if (!costToggle.checked) {
                    const numericValue = toEnglishNumber(costValue);
                    if (numericValue && !isNaN(numericValue)) costValue = `${formatNumber(numericValue)} تومان`;
                    else costValue = '';
                }
                
                const locationValue = locationToggle.checked ? 'آنلاین' : locationInput.value;

                return {
                    title: formData.get('title'), summary: formData.get('summary'),
                    instructor_name: formData.get('instructor_name').trim() || null,
                    location: locationValue, cost: costValue, capacity: capacityValue,
                    displayDate: displayDateValue, startDate, endDate,
                    registrationStartDate: regStartDate, registrationEndDate: regEndDate,
                    detailPage: formData.get('detailPage').trim(), tag_ids: selectedTagIds,
                    content: parseJsonField('content'), schedule: parseJsonField('schedule'),
                    contact_link: Object.values(contactInfo).some(v => v) ? contactInfo : null,
                    payment_card_number: (paymentInfo.name && paymentInfo.number) ? paymentInfo : null
                };
            };

            const eventData = getEventDataFromForm();
            const rawSlug = eventData.detailPage;
            const imageFile = imageUploadInput.files[0];

            if (!rawSlug) throw new Error("شناسه لینک (Slug) نمی‌تواند خالی باشد.");

            if (isEditing) {
                let finalImageUrl = currentImageUrl;
                if (imageFile && imageFile.size > 0) {
                    const { filePath: tempPath } = await uploadEventImage(imageFile, rawSlug);
                    finalImageUrl = await renameEventImage(tempPath, isEditing, rawSlug);
                }
                
                eventData.image = finalImageUrl;
                eventData.detailPage = `#/events/${isEditing}-${rawSlug}`;
                await updateEvent(isEditing, eventData);

                if (imageUrlToDelete) {
                    await deleteEventImage(imageUrlToDelete);
                }

                showStatus(statusBox, 'رویداد با موفقیت ویرایش شد.', 'success');
            } else {
                if (!imageFile) throw new Error("تصویر رویداد الزامی است.");
                const { publicUrl: tempUrl, filePath: tempPath } = await uploadEventImage(imageFile, rawSlug);
                eventData.image = tempUrl;
                delete eventData.detailPage;
                const { data: newEvent } = await addEvent(eventData);
                const finalImageUrl = await renameEventImage(tempPath, newEvent.id, rawSlug);
                await updateEvent(newEvent.id, { image: finalImageUrl, detailPage: `#/events/${newEvent.id}-${rawSlug}` });
                showStatus(statusBox, 'رویداد با موفقیت افزوده شد.', 'success');
            }
            state.allEvents = await loadEvents();
            renderEventsList(state.allEvents);
            resetForm();
        } catch (error) {
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'ذخیره تغییرات' : 'افزودن رویداد';
        }
    });

    if(cancelBtn) cancelBtn.addEventListener('click', resetForm);

    if (adminListContainer) {
        adminListContainer.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('.edit-event-btn');
            if (editBtn) {
                const id = editBtn.dataset.id;
                const eventToEdit = state.allEvents.find(e => e.id == id);
                if (!eventToEdit) return;
                
                resetForm();
                eventBeingEdited = eventToEdit;

                hiddenIdInput.value = eventToEdit.id;
                currentImageUrl = eventToEdit.image || '';
                imageUploadInput.required = !currentImageUrl;
                updateImageUploadUI(currentImageUrl ? currentImageUrl.split('/').pop() : '');

                document.getElementById('event-title').value = eventToEdit.title || '';
                document.getElementById('event-summary').value = eventToEdit.summary || '';
                instructorInput.value = eventToEdit.instructor_name || '';
                document.getElementById('event-detail-page').value = (eventToEdit.detailPage || '').replace(`#/events/${id}-`, '');
                
                const isOnline = eventToEdit.location === 'آنلاین';
                locationToggle.checked = isOnline;
                locationInput.disabled = isOnline;
                locationInput.value = isOnline ? '' : (eventToEdit.location || '');
                locationInput.placeholder = isOnline ? 'آنلاین' : 'مکان رویداد...';

                const isFree = eventToEdit.cost === 'رایگان';
                costToggle.checked = isFree;
                costInput.disabled = isFree;
                costInput.value = isFree ? '' : (eventToEdit.cost || '');
                costInput.placeholder = isFree ? 'رایگان' : 'هزینه رویداد (تومان)';

                const isUnlimited = eventToEdit.capacity === -1;
                capacityToggle.checked = isUnlimited;
                capacityInput.disabled = isUnlimited;
                capacityInput.value = isUnlimited ? '' : (eventToEdit.capacity || '');
                capacityInput.placeholder = isUnlimited ? 'نامحدود' : 'ظرفیت رویداد...';

                selectedTagIds = eventToEdit.tag_ids || [];
                updateSelectedTagsDisplay();
                document.getElementById('event-content').value = safeJsonStringify(eventToEdit.content);
                document.getElementById('event-schedule').value = safeJsonStringify(eventToEdit.schedule);
                const contactInfo = eventToEdit.contact_link || {};
                contactPhoneInput.value = contactInfo.phone || '';
                contactTelegramInput.value = contactInfo.telegram || '';
                contactWhatsappInput.value = contactInfo.whatsapp || '';
                const paymentInfo = eventToEdit.payment_card_number || {};
                document.getElementById('payment-name').value = paymentInfo.name || '';
                paymentNumberInput.value = paymentInfo.number || '';
                formTitle.textContent = 'ویرایش رویداد';
                submitBtn.textContent = 'ذخیره تغییرات';
                cancelBtn.style.display = 'inline-block';
                eventForm.scrollIntoView({ behavior: 'smooth' });
            }

            const deleteBtn = event.target.closest('.delete-event-btn');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                const eventToDelete = state.allEvents.find(e => e.id == id);
                if (!eventToDelete) return;
                if (confirm('آیا از حذف این رویداد مطمئن هستید؟ تصویر آن نیز حذف خواهد شد.')) {
                    try {
                        deleteBtn.disabled = true;
                        if (eventToDelete.image) await deleteEventImage(eventToDelete.image);
                        await deleteEvent(id);
                        state.allEvents = state.allEvents.filter(e => e.id != id);
                        renderEventsList(state.allEvents);
                    } catch (error) {
                        alert('خطا در حذف رویداد.');
                        console.error("Deletion Error:", error);
                        deleteBtn.disabled = false;
                    }
                }
            }
        });
    }

    togglePaymentFields();
};

const initializeAdminLayout = () => {
    const sidebar = document.getElementById('admin-sidebar');
    const menuToggle = document.getElementById('mobile-admin-menu-toggle');
    const body = document.body;

    if (!sidebar || !menuToggle) return;

    const closeMenu = () => {
        sidebar.classList.remove('is-open');
        body.classList.remove('admin-sidebar-is-open');
        body.removeEventListener('click', closeMenuOnBodyClick);
    };

    const closeMenuOnBodyClick = (e) => {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    };

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sidebar.classList.toggle('is-open');
        body.classList.toggle('admin-sidebar-is-open', isOpen);
        if (isOpen) {
            setTimeout(() => body.addEventListener('click', closeMenuOnBodyClick), 0);
        } else {
            body.removeEventListener('click', closeMenuOnBodyClick);
        }
    });

    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            closeMenu();
        }
    });
};

const adminRoutes = {
    '/admin/messages': {
        title: 'پیام‌ها',
        html: 'admin-messages.html',
        loader: () => loadContacts(),
        renderer: renderMessages, // مستقیم به تابع ارجاع می‌دهیم
        initializer: initializeMessagesModule
    },
    '/admin/news': {
        title: 'مدیریت اخبار',
        html: 'admin-news.html',
        loader: () => Promise.all([loadNews(), loadTags(), loadMembers()]),
        renderer: renderNewsList, // اصلاح شد: مستقیم به تابع ارجاع می‌دهیم
        initializer: initializeNewsModule
    },
    '/admin/journal': {
        title: 'مدیریت نشریه',
        html: 'admin-journal.html',
        loader: () => loadJournal(),
        renderer: renderJournalList, // مستقیم به تابع ارجاع می‌دهیم
        initializer: initializeJournalModule
    },
    '/admin/events': {
        title: 'مدیریت رویدادها',
        html: 'admin-events.html',
        loader: () => Promise.all([loadEvents(), loadTags()]),
        renderer: renderEventsList, // اصلاح شد: مستقیم به تابع ارجاع می‌دهیم
        initializer: initializeEventsModule
    },
    '/admin/registrations': {
        title: 'مدیریت ثبت‌نام‌ها',
        html: 'admin-registrations.html',
        loader: () => Promise.all([loadRegistrations(), loadEvents()]),
        renderer: renderRegistrationsList, // اصلاح شد: مستقیم به تابع ارجاع می‌دهیم
        initializer: initializeRegistrationsModule
    }
};

const loadAdminPage = async (path) => {
    const mainContent = document.getElementById('admin-main-content');
    const headerTitle = document.querySelector('.admin-header-title');
    const route = adminRoutes[path];
    if (!route) {
        location.hash = '/admin/messages';
        return;
    }
    
    if (headerTitle) headerTitle.textContent = route.title;
    mainContent.innerHTML = '<p class="loading-message">در حال بارگذاری...</p>';
    
    try {
        const pagePromise = fetch(route.html).then(res => res.text());
        const dataPromise = route.loader();

        const [pageHtml, data] = await Promise.all([pagePromise, dataPromise]);
        
        mainContent.innerHTML = pageHtml;

        setTimeout(() => {
            if (route.renderer) {
                // **منطق کلیدی اصلاح‌شده:**
                // بررسی می‌کنیم که آیا داده‌ی بازگشتی از لودر، آرایه‌ای است که خودش شامل آرایه‌های دیگر باشد
                // (این حالت مخصوص Promise.all است).
                if (Array.isArray(data) && (path === '/admin/news' || path === '/admin/events' || path === '/admin/registrations')) {
                    // برای اخبار، رویدادها و ثبت‌نام‌ها، اولین آرایه (data[0]) را به رندرکننده می‌فرستیم.
                    route.renderer(data[0]); 
                } else {
                    // برای بقیه صفحات (پیام‌ها، نشریه)، خود 'data' که یک آرایه ساده است را می‌فرستیم.
                    route.renderer(data);
                }
            }
            
            if (route.initializer) {
                route.initializer();
            }
        }, 0);

    } catch (error) {
        console.error(`Error loading page ${path}:`, error);
        mainContent.innerHTML = `<p style="text-align:center; color: red;">خطا در بارگذاری صفحه.</p>`;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    initializeAdminTheme();
    initializeAdminLayout();
    initializeGlobalRefreshButton();
    initializeSharedTagModal(); 


    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html#/login';
        return;
    }
    state.user = session.user;
    await getProfile();
    if (state.profile?.role !== 'admin') {
        alert('شما دسترسی لازم برای ورود به این بخش را ندارید.');
        window.location.href = 'index.html#/';
        return;
    }

    const handleAdminNavigation = () => {
        const path = location.hash.substring(1) || '/admin/messages';
        loadAdminPage(path);

        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${path}`);
        });
    };

    window.addEventListener('hashchange', handleAdminNavigation);
    handleAdminNavigation();
});