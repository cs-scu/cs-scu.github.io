// src/assets/js/modules/admin.js

import { state } from './state.js';
import { supabaseClient, getProfile, loadContacts, loadJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteJournalFiles, loadEvents, addEvent, updateEvent, deleteEvent } from './api.js';
import { initializeAdminTheme } from './admin-theme.js';

// --- توابع کمکی ---
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

// --- توابع رندرکننده ---
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


// --- توابع مدیریت رویدادها ---
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
            route.renderer(data);
            
            refreshBtn.classList.remove('loading');
            refreshBtn.classList.add('success');
            refreshBtn.innerHTML = checkIconSVG;

        } catch (error) {
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
            const title = formData.get('title');

            const originalIssue = isEditing ? state.allJournalIssues.find(j => j.id == isEditing) : null;
            const oldFilesToDelete = [];

            let coverUrl = originalIssue ? originalIssue.coverUrl : null;
            let fileUrl = originalIssue ? originalIssue.fileUrl : null;

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
            
            if (coverFile && coverFile.size > 0) {
                if (originalIssue && originalIssue.coverUrl) {
                    oldFilesToDelete.push(originalIssue.coverUrl);
                }
                coverUrl = await uploadFile(coverFile, 'covers');
            }

            if (journalFile && journalFile.size > 0) {
                if (originalIssue && originalIssue.fileUrl) {
                    oldFilesToDelete.push(originalIssue.fileUrl);
                }
                fileUrl = await uploadFile(journalFile, 'files');
            }

            const entryData = {
                title: title,
                issueNumber: formData.get('issueNumber') ? parseInt(formData.get('issueNumber'), 10) : null,
                date: formData.get('date'),
                summary: formData.get('summary'),
                coverUrl: coverUrl,
                fileUrl: fileUrl
            };
            
            if (isEditing) {
                await updateJournalEntry(isEditing, entryData);
                showStatus(statusBox, 'نشریه با موفقیت ویرایش شد.', 'success');
            } else {
                await addJournalEntry(entryData);
                showStatus(statusBox, 'نشریه با موفقیت افزوده شد.', 'success');
            }
            
            if (oldFilesToDelete.length > 0) {
                await deleteJournalFiles(oldFilesToDelete);
            }

            const { data } = await supabaseClient.from('journal').select('*');
            state.allJournalIssues = data || [];
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

const initializeMessagesModule = () => {
    // No specific JS needed for this module anymore
};

const initializeEventsModule = () => {
    const eventForm = document.getElementById('add-event-form');
    if (!eventForm) return;

    const formTitle = document.getElementById('event-form-title');
    const submitBtn = document.getElementById('event-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const hiddenIdInput = document.getElementById('event-id');
    const adminListContainer = document.getElementById('events-admin-list');

    // --- START: NEW LOGIC FOR TOGGLE SWITCHES ---
    const locationInput = document.getElementById('event-location');
    const locationToggle = document.getElementById('toggle-location-online');
    const costInput = document.getElementById('event-cost');
    const costToggle = document.getElementById('toggle-cost-free');

    const setupToggleSwitch = (input, toggle, value) => {
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                input.value = value;
                input.disabled = true;
            } else {
                input.value = '';
                input.disabled = false;
                input.focus();
            }
        });
    };

    setupToggleSwitch(locationInput, locationToggle, 'آنلاین');
    setupToggleSwitch(costInput, costToggle, 'رایگان');
    // --- END: NEW LOGIC FOR TOGGLE SWITCHES ---

    const safeJsonStringify = (obj, indent = 2) => {
        try {
            if (obj === null || obj === undefined) return '';
            if (typeof obj === 'string') {
                JSON.parse(obj);
                return JSON.stringify(JSON.parse(obj), null, indent);
            }
            return JSON.stringify(obj, null, indent);
        } catch (e) {
            return obj;
        }
    };

    const resetForm = () => {
        eventForm.reset();
        hiddenIdInput.value = '';
        formTitle.textContent = 'درج رویداد جدید';
        submitBtn.textContent = 'افزودن رویداد';
        cancelBtn.style.display = 'none';
        
        // Reset toggle switches and inputs
        locationInput.disabled = false;
        locationToggle.checked = false;
        costInput.disabled = false;
        costToggle.checked = false;

        eventForm.scrollIntoView({ behavior: 'smooth' });
    };

    eventForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const statusBox = eventForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;
        
        const wasLocationDisabled = locationInput.disabled;
        const wasCostDisabled = costInput.disabled;
        locationInput.disabled = false;
        costInput.disabled = false;
        
        const formData = new FormData(eventForm);

        locationInput.disabled = wasLocationDisabled;
        costInput.disabled = wasCostDisabled;
        
        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال ویرایش...' : 'در حال افزودن...';

        try {
            const parseJsonField = (fieldName) => {
                const value = formData.get(fieldName);
                if (!value) return null;
                try {
                    return JSON.parse(value);
                } catch (e) {
                    throw new Error(`فرمت JSON در فیلد "${fieldName}" نامعتبر است.`);
                }
            };
            
            const paymentCardNumber = {
                name: formData.get('payment_name'),
                number: formData.get('payment_number')
            };

            const contactLink = {
                phone: formData.get('contact_phone'),
                telegram: formData.get('contact_telegram'),
                whatsapp: formData.get('contact_whatsapp')
            };

            const eventData = {
                title: formData.get('title'),
                summary: formData.get('summary'),
                location: formData.get('location'),
                cost: formData.get('cost'),
                displayDate: formData.get('displayDate'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                image: formData.get('image'),
                detailPage: formData.get('detailPage'),
                tags: parseJsonField('tags'),
                content: parseJsonField('content'),
                schedule: parseJsonField('schedule'),
                payment_card_number: (paymentCardNumber.name || paymentCardNumber.number) ? paymentCardNumber : null,
                contact_link: (contactLink.phone || contactLink.telegram || contactLink.whatsapp) ? contactLink : null,
            };

            if (isEditing) {
                await updateEvent(isEditing, eventData);
                showStatus(statusBox, 'رویداد با موفقیت ویرایش شد.', 'success');
            } else {
                await addEvent(eventData);
                showStatus(statusBox, 'رویداد با موفقیت افزوده شد.', 'success');
            }

            state.allEvents = [];
            await loadEvents();
            renderEventsList(state.allEvents);
            resetForm();

        } catch (error) {
            console.error("Error during event submission:", error);
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'ذخیره تغییرات' : 'افزودن رویداد';
        }
    });

    cancelBtn.addEventListener('click', resetForm);

    adminListContainer.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.edit-event-btn');
        const deleteBtn = event.target.closest('.delete-event-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const eventToEdit = state.allEvents.find(e => e.id == id);
            if (!eventToEdit) return;
            
            resetForm();

            hiddenIdInput.value = eventToEdit.id;
            document.getElementById('event-title').value = eventToEdit.title || '';
            document.getElementById('event-summary').value = eventToEdit.summary || '';
            document.getElementById('event-display-date').value = eventToEdit.displayDate || '';
            document.getElementById('event-start-date').value = eventToEdit.startDate || '';
            document.getElementById('event-end-date').value = eventToEdit.endDate || '';
            document.getElementById('event-image-url').value = eventToEdit.image || '';
            document.getElementById('event-detail-page').value = eventToEdit.detailPage || '';
            
            if (eventToEdit.location === 'آنلاین') {
                locationToggle.checked = true;
            } else {
                locationInput.value = eventToEdit.location || '';
            }
            locationToggle.dispatchEvent(new Event('change'));

            if (eventToEdit.cost === 'رایگان') {
                costToggle.checked = true;
            } else {
                costInput.value = eventToEdit.cost || '';
            }
            costToggle.dispatchEvent(new Event('change'));
            
            document.getElementById('event-tags').value = safeJsonStringify(eventToEdit.tags);
            document.getElementById('event-content').value = safeJsonStringify(eventToEdit.content);
            document.getElementById('event-schedule').value = safeJsonStringify(eventToEdit.schedule);
            
            document.getElementById('payment-name').value = eventToEdit.payment_card_number?.name || '';
            document.getElementById('payment-number').value = eventToEdit.payment_card_number?.number || '';
            
            document.getElementById('contact-phone').value = eventToEdit.contact_link?.phone || '';
            document.getElementById('contact-telegram').value = eventToEdit.contact_link?.telegram || '';
            document.getElementById('contact-whatsapp').value = eventToEdit.contact_link?.whatsapp || '';

            formTitle.textContent = 'ویرایش رویداد';
            submitBtn.textContent = 'ذخیره تغییرات';
            cancelBtn.style.display = 'inline-block';
            eventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('آیا از حذف این رویداد مطمئن هستید؟')) {
                try {
                    deleteBtn.disabled = true;
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

// --- روتر داخلی پنل ادمین ---
const adminRoutes = {
    '/admin/messages': {
        title: 'پیام‌ها',
        html: 'admin-messages.html',
        loader: async () => { state.allContacts = []; await loadContacts(); return state.allContacts; },
        renderer: renderMessages,
        initializer: initializeMessagesModule
    },
    '/admin/journal': {
        title: 'مدیریت نشریه',
        html: 'admin-journal.html',
        loader: async () => { state.allJournalIssues = []; await loadJournal(); return state.allJournalIssues; },
        renderer: renderJournalList,
        initializer: initializeJournalModule
    },
    '/admin/events': {
        title: 'مدیریت رویدادها',
        html: 'admin-events.html',
        loader: async () => { state.allEvents = []; await loadEvents(); return state.allEvents; },
        renderer: renderEventsList,
        initializer: initializeEventsModule
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
    
    const response = await fetch(route.html);
    const pageHtml = await response.text();
    
    const data = await route.loader();
    
    mainContent.innerHTML = pageHtml;

    route.renderer(data);
    
    if (route.initializer) {
        route.initializer();
    }
};

// --- تابع اصلی اجرا ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeAdminTheme();
    initializeAdminLayout();
    initializeGlobalRefreshButton();

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