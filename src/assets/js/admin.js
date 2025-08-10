// src/assets/js/admin.js

// --- وارد کردن ماژول‌های ضروری ---
// ما از همان فایل‌های state و api سایت اصلی استفاده می‌کنیم
import { state } from './modules/state.js';
import { supabaseClient, getProfile, loadContacts, loadJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry } from './modules/api.js';

// --- توابع کمکی برای نمایش پیام ---
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

// --- توابع رندرکننده (مخصوص پنل ادمین) ---

// رندر کردن لیست پیام‌ها
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

// رندر کردن لیست نشریه‌ها
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

// --- توابع مدیریت فرم‌ها و رویدادها ---

const initializeJournalModule = () => {
    const journalForm = document.getElementById('add-journal-form');
    if (!journalForm) return;
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

    journalForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const statusBox = journalForm.querySelector('.form-status');
        const isEditing = hiddenIdInput.value;
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال ویرایش...' : 'در حال افزودن...';
        hideStatus(statusBox);
        const formData = new FormData(journalForm);
        const entryData = { title: formData.get('title'), issueNumber: formData.get('issueNumber') ? parseInt(formData.get('issueNumber'), 10) : null, date: formData.get('date'), summary: formData.get('summary'), coverUrl: formData.get('coverUrl'), fileUrl: formData.get('fileUrl') };
        try {
            if (isEditing) await updateJournalEntry(isEditing, entryData);
            else await addJournalEntry(entryData);
            showStatus(statusBox, isEditing ? 'ویرایش با موفقیت انجام شد.' : 'نشریه با موفقیت افزوده شد.', 'success');
            const { data } = await supabaseClient.from('journal').select('*');
            state.allJournalIssues = data || [];
            renderJournalList(state.allJournalIssues);
            resetForm();
        } catch (error) { showStatus(statusBox, 'عملیات با خطا مواجه شد.', 'error');
        } finally { submitBtn.disabled = false; }
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
            document.getElementById('journal-cover').value = issue.coverUrl || '';
            document.getElementById('journal-file').value = issue.fileUrl || '';
            formTitle.textContent = 'ویرایش نشریه';
            submitBtn.textContent = 'ذخیره تغییرات';
            cancelBtn.style.display = 'inline-block';
            journalForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('آیا از حذف این نشریه مطمئن هستید؟')) {
                try {
                    deleteBtn.textContent = '...';
                    deleteBtn.disabled = true;
                    await deleteJournalEntry(id);
                    state.allJournalIssues = state.allJournalIssues.filter(j => j.id != id);
                    renderJournalList(state.allJournalIssues);
                } catch (error) { alert('خطا در حذف نشریه.'); deleteBtn.textContent = 'حذف'; deleteBtn.disabled = false; }
            }
        }
    });
};

const initializeMessagesModule = () => {
    const refreshBtn = document.getElementById('refresh-contacts-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            await loadContacts();
            renderMessages(state.allContacts);
            refreshBtn.disabled = false;
        });
    }
};

// --- روتر داخلی پنل ادمین ---
const adminRoutes = {
    '/admin/messages': {
        html: 'admin-messages.html',
        loader: loadContacts,
        renderer: renderMessages,
        initializer: initializeMessagesModule
    },
    '/admin/journal': {
        html: 'admin-journal.html',
        loader: loadJournal,
        renderer: renderJournalList,
        initializer: initializeJournalModule
    }
};

const loadAdminPage = async (path) => {
    const mainContent = document.getElementById('admin-main-content');
    const route = adminRoutes[path];
    if (!route) {
        mainContent.innerHTML = '<h2>صفحه یافت نشد</h2>';
        return;
    }

    mainContent.innerHTML = '<p class="loading-message">در حال بارگذاری...</p>';
    
    // ۱. واکشی HTML
    const response = await fetch(route.html);
    mainContent.innerHTML = await response.text();

    // ۲. واکشی داده‌ها و رندر کردن
    await route.loader();
    route.renderer(path === '/admin/messages' ? state.allContacts : state.allJournalIssues);
    
    // ۳. فعال‌سازی event listener ها
    if (route.initializer) {
        route.initializer();
    }
};

// --- تابع اصلی اجرا ---
document.addEventListener('DOMContentLoaded', async () => {
    // بررسی دسترسی کاربر
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '/#/login';
        return;
    }
    state.user = session.user;
    await getProfile();
    if (state.profile?.role !== 'admin') {
        alert('شما دسترسی لازم برای ورود به این بخش را ندارید.');
        window.location.href = '/#/';
        return;
    }

    // مدیریت ناوبری
    const handleAdminNavigation = () => {
        const path = location.hash.substring(1) || '/admin/messages';
        loadAdminPage(path);

        // فعال کردن لینک فعال در نوار کناری
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${path}`);
        });
    };

    window.addEventListener('hashchange', handleAdminNavigation);
    handleAdminNavigation(); // بارگذاری اولیه
});