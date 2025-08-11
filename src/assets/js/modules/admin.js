// src/assets/js/modules/admin.js

import { state } from './state.js';
import { supabaseClient, getProfile, loadContacts, loadJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteJournalFiles, loadEvents, addEvent, updateEvent, deleteEvent, loadTags } from './api.js';
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

    let selectedTagIds = [];

    const formTitle = document.getElementById('event-form-title');
    const submitBtn = document.getElementById('event-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const hiddenIdInput = document.getElementById('event-id');
    const adminListContainer = document.getElementById('events-admin-list');
    
    const locationInput = document.getElementById('event-location');
    const locationToggle = document.getElementById('toggle-location-online');
    const costInput = document.getElementById('event-cost');
    const costToggle = document.getElementById('toggle-cost-free');
    const detailPageInput = document.getElementById('event-detail-page');
    const openTagsModalBtn = document.getElementById('open-tags-modal-btn');
    const selectedTagsDisplay = document.getElementById('selected-tags-display');

    const updateSelectedTagsDisplay = () => {
        if (!selectedTagsDisplay) return;
        if (selectedTagIds.length === 0) {
            selectedTagsDisplay.innerHTML = 'هیچ تگی انتخاب نشده است.';
            return;
        }
        selectedTagsDisplay.innerHTML = '';
        selectedTagIds.forEach(id => {
            const tagName = state.tagsMap.get(id);
            if (tagName) {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tagName;
                selectedTagsDisplay.appendChild(tagEl);
            }
        });
    };
    
    // تابع اصلی برای رندر کردن محتوای مودال یکپارچه
    const renderUnifiedTagsModal = () => {
        const modalContent = document.getElementById('admin-generic-modal-content');
        if (!modalContent) return;
        
        const sortedTags = Array.from(state.tagsMap.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fa'));

        let tagsListHTML = '';
        sortedTags.forEach(([id, name]) => {
            const isChecked = selectedTagIds.includes(id);
            tagsListHTML += `
                <div class="tag-checkbox-item" data-tag-id="${id}">
                    <div class="tag-selector">
                        <input type="checkbox" id="modal-tag-${id}" value="${id}" ${isChecked ? 'checked' : ''}>
                        <label for="modal-tag-${id}">${name}</label>
                    </div>
                    
                    <div class="edit-tag-form">
                        <input type="text" class="form-control" value="${name}">
                        <button type="button" class="btn btn-primary btn-sm save-edit-btn">ذخیره</button>
                        <button type="button" class="btn btn-secondary btn-sm cancel-edit-btn">لغو</button>
                    </div>

                    <div class="tag-list-item-actions">
                        <button class="tag-action-btn edit-tag-btn" title="ویرایش"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button class="tag-action-btn delete-tag-btn" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </div>`;
        });
        
        modalContent.innerHTML = `
            <div class="tags-modal-container">
                <h3>مدیریت و انتخاب تگ‌ها</h3>
                <form class="add-tag-form" id="add-tag-form-modal"><input type="text" id="new-tag-name" class="form-control" placeholder="افزودن تگ جدید..."><button type="submit" class="btn btn-primary">افزودن</button></form>
                <div class="tags-modal-list">${tagsListHTML || '<p style="text-align:center; opacity:0.8; padding: 1rem;">تگی یافت نشد.</p>'}</div>
                <div class="tags-modal-actions">
                    <button type="button" class="btn btn-primary btn-full" id="confirm-tags-btn">تایید انتخاب</button>
                </div>
            </div>`;
    };

    const openTagsModal = () => {
        renderUnifiedTagsModal();
        document.getElementById('admin-generic-modal').classList.add('is-open');
    };

    // مدیریت تمام رویدادهای داخل مودال
    document.getElementById('admin-generic-modal').addEventListener('click', async (e) => {
        const modal = document.getElementById('admin-generic-modal');
        if (e.target === modal || e.target.closest('.close-modal')) {
            modal.classList.remove('is-open');
        }
        if (e.target.id === 'confirm-tags-btn') {
            const checkedInputs = modal.querySelectorAll('input[type="checkbox"]:checked');
            selectedTagIds = Array.from(checkedInputs).map(input => parseInt(input.value, 10));
            updateSelectedTagsDisplay();
            modal.classList.remove('is-open');
        }
        
        const deleteBtn = e.target.closest('.delete-tag-btn');
        if (deleteBtn) {
            const item = deleteBtn.closest('.tag-checkbox-item');
            const tagId = parseInt(item.dataset.tagId, 10);
            const tagName = state.tagsMap.get(tagId);
            if (confirm(`آیا از حذف تگ «${tagName}» مطمئن هستید؟ این تگ از تمام رویدادها نیز حذف خواهد شد.`)) {
                try {
                    await deleteTag(tagId);
                    state.tagsMap.delete(tagId);
                    selectedTagIds = selectedTagIds.filter(id => id !== tagId);
                    updateSelectedTagsDisplay();
                    renderUnifiedTagsModal();
                } catch (error) { alert('خطا در حذف تگ.'); }
            }
        }

        const editBtn = e.target.closest('.edit-tag-btn');
        if (editBtn) {
            const item = editBtn.closest('.tag-checkbox-item');
            item.classList.add('is-editing');
        }

        const cancelEditBtn = e.target.closest('.edit-tag-form .cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.closest('.tag-checkbox-item').classList.remove('is-editing');
        }

        const saveBtn = e.target.closest('.save-edit-btn');
        if (saveBtn) {
            const item = saveBtn.closest('.tag-checkbox-item');
            const tagId = parseInt(item.dataset.tagId, 10);
            const newName = item.querySelector('input').value.trim();
            if (newName && newName !== state.tagsMap.get(tagId)) {
                try {
                    const updatedTag = await updateTag(tagId, newName);
                    state.tagsMap.set(updatedTag.id, updatedTag.name);
                    renderUnifiedTagsModal();
                } catch { alert('خطا در ویرایش تگ.'); }
            } else {
                item.classList.remove('is-editing');
            }
        }
    });

    document.getElementById('admin-generic-modal-content').addEventListener('submit', async (e) => {
        if (e.target.id === 'add-tag-form-modal') {
            e.preventDefault();
            const input = document.getElementById('new-tag-name');
            const newName = input.value.trim();
            if (!newName) return;
            try {
                const newTag = await addTag(newName);
                state.tagsMap.set(newTag.id, newTag.name);
                renderUnifiedTagsModal();
            } catch { alert('خطا در افزودن تگ.'); }
        }
    });

    if (openTagsModalBtn) {
        openTagsModalBtn.addEventListener('click', openTagsModal);
    }
    
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
    
    detailPageInput.addEventListener('blur', () => {
        if (hiddenIdInput.value) return; 
        let slug = detailPageInput.value.trim();
        if (slug && !slug.startsWith('#/events/')) {
            slug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const maxId = state.allEvents.reduce((max, event) => Math.max(max, event.id), 0);
            detailPageInput.value = `#/events/${maxId + 1}-${slug}`;
        }
    });

    const safeJsonStringify = (obj) => {
        try { return obj ? JSON.stringify(obj, null, 2) : ''; } catch (e) { return typeof obj === 'string' ? obj : ''; }
    };

    const resetForm = () => {
        eventForm.reset();
        hiddenIdInput.value = '';
        formTitle.textContent = 'درج رویداد جدید';
        submitBtn.textContent = 'افزودن رویداد';
        cancelBtn.style.display = 'none';
        locationInput.disabled = false;
        costInput.disabled = false;
        selectedTagIds = [];
        updateSelectedTagsDisplay();
        eventForm.scrollIntoView({ behavior: 'smooth' });
    };

    eventForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const statusBox = eventForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;
        const formData = new FormData(eventForm);
        
        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال ویرایش...' : 'در حال افزودن...';

        try {
            const parseJsonField = (fieldName) => {
                const value = formData.get(fieldName);
                try { return value ? JSON.parse(value) : null; }
                catch (e) { throw new Error(`فرمت JSON در فیلد "${fieldName}" نامعتبر است.`); }
            };

            const eventData = {
                title: formData.get('title'),
                summary: formData.get('summary'),
                location: locationInput.value,
                cost: costInput.value,
                displayDate: formData.get('displayDate'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                image: formData.get('image'),
                detailPage: formData.get('detailPage'),
                tag_ids: selectedTagIds,
                content: parseJsonField('content'),
                schedule: parseJsonField('schedule'),
                payment_card_number: (formData.get('payment_name') || formData.get('payment_number')) ? { name: formData.get('payment_name'), number: formData.get('payment_number') } : null,
                contact_link: (formData.get('contact_phone') || formData.get('contact_telegram') || formData.get('contact_whatsapp')) ? { phone: formData.get('contact_phone'), telegram: formData.get('contact_telegram'), whatsapp: formData.get('contact_whatsapp') } : null,
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
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'ذخیره تغییرات' : 'افزودن رویداد';
        }
    });

    cancelBtn.addEventListener('click', resetForm);

    adminListContainer.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.edit-event-btn');
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
            
            locationInput.value = eventToEdit.location || '';
            locationToggle.checked = eventToEdit.location === 'آنلاین';
            locationToggle.dispatchEvent(new Event('change'));

            costInput.value = eventToEdit.cost || '';
            costToggle.checked = eventToEdit.cost === 'رایگان';
            costToggle.dispatchEvent(new Event('change'));
            
            selectedTagIds = eventToEdit.tag_ids || [];
            updateSelectedTagsDisplay();

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
            eventForm.scrollIntoView({ behavior: 'smooth' });
        }

        const deleteBtn = event.target.closest('.delete-event-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('آیا از حذف این رویداد مطمئن هستید؟')) {
                deleteBtn.disabled = true;
                await deleteEvent(id);
                state.allEvents = state.allEvents.filter(e => e.id != id);
                renderEventsList(state.allEvents);
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
        loader: async () => { 
            state.allEvents = []; 
            state.tagsMap.clear();
            // تغییر اصلی اینجاست: هر دو به صورت همزمان بارگذاری می‌شوند
            await Promise.all([loadEvents(), loadTags()]); 
            return state.allEvents; 
        },
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
    
    await route.loader(); // Load data before rendering
    
    mainContent.innerHTML = pageHtml;

    route.renderer(state[route.loader.name.replace('load', 'all').toLowerCase()]); // Pass correct data
    
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