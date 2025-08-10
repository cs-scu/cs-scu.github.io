// src/assets/js/modules/admin.js

import { state } from './state.js';
import { supabaseClient, getProfile, loadContacts, loadJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry } from './api.js';
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
                <thead><tr><th>عنوان</th><th>تاریخ</th><th>عملیات</th></tr></thead>
                <tbody>
                    ${sortedIssues.map(issue => `
                        <tr>
                            <td>${issue.title}</td>
                            <td style="white-space: nowrap;">${issue.date}</td>
                            <td style="white-space: nowrap;">
                                <button class="btn btn-secondary btn-sm edit-journal-btn" data-id="${issue.id}">ویرایش</button>
                                <button class="btn btn-secondary btn-sm delete-journal-btn" data-id="${issue.id}" style="--bs-btn-bg: #dc3545; --bs-btn-border-color: #dc3545; --bs-btn-hover-bg: #bb2d3b; --bs-btn-hover-border-color: #b02a37; color: white;">حذف</button>
                            </td>
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
    
    ['cover', 'pdf'].forEach(type => {
        const wrapper = document.getElementById(`${type === 'pdf' ? 'pdf' : 'cover'}-upload-wrapper`);
        if (!wrapper) return; // <-- اضافه کردن یک گارد برای اطمینان
        const input = wrapper.querySelector('input[type="file"]');
        const nameDisplay = wrapper.querySelector('.file-name-display');
        const clearBtn = wrapper.querySelector('.file-clear-btn');

        const updateFileName = () => {
            if (input.files && input.files[0]) {
                nameDisplay.textContent = input.files[0].name;
                nameDisplay.style.opacity = 1;
                clearBtn.style.display = 'block';
            } else {
                nameDisplay.textContent = 'هیچ فایلی انتخاب نشده';
                nameDisplay.style.opacity = 0.8;
                clearBtn.style.display = 'none';
            }
        };

        input.addEventListener('change', () => {
            if (type === 'pdf' && input.files[0] && input.files[0].type !== 'application/pdf') {
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
            wrapper.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            wrapper.addEventListener(eventName, () => wrapper.classList.add('is-dragging'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            wrapper.addEventListener(eventName, () => wrapper.classList.remove('is-dragging'));
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

            let coverUrl = isEditing ? state.allJournalIssues.find(j => j.id == isEditing)?.coverUrl : null;
            let fileUrl = isEditing ? state.allJournalIssues.find(j => j.id == isEditing)?.fileUrl : null;

            const uploadFile = async (file, folder) => {
                if (!file || file.size === 0) return null;
                const fileName = `${folder}/${title.replace(/ /g, '-')}-${Date.now()}.${file.name.split('.').pop()}`;
                
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
                coverUrl = await uploadFile(coverFile, 'covers');
            }
            if (journalFile && journalFile.size > 0) {
                fileUrl = await uploadFile(journalFile, 'files');
            }

            if (!coverUrl || !fileUrl) {
                throw new Error("آپلود فایل‌ها با مشکل مواجه شد.");
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

            const { data } = await supabaseClient.from('journal').select('*');
            state.allJournalIssues = data || [];
            renderJournalList(state.allJournalIssues);
            resetForm();

        } catch (error) {
            console.error("Error during journal submission:", error);
            showStatus(statusBox, 'عملیات با خطا مواجه شد. لطفاً کنسول را بررسی کنید.', 'error');
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
            if (confirm('آیا از حذف این نشریه مطمئن هستید؟ این عملیات غیرقابل بازگشت است.')) {
                try {
                    deleteBtn.textContent = '...';
                    deleteBtn.disabled = true;
                    await deleteJournalEntry(id);
                    state.allJournalIssues = state.allJournalIssues.filter(j => j.id != id);
                    renderJournalList(state.allJournalIssues);
                } catch (error) {
                    alert('خطا در حذف نشریه.');
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
    mainContent.innerHTML = await response.text();

    const data = await route.loader();
    route.renderer(data);
    
    // START: تغییر اصلی اینجاست
    // ما مطمئن می‌شویم که این تابع فقط بعد از اینکه تمام به‌روزرسانی‌های DOM انجام شد، اجرا می‌شود.
    if (route.initializer) {
        requestAnimationFrame(() => {
            route.initializer();
        });
    }
    // END: تغییر
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