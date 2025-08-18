import { state } from './state.js';
import { supabaseClient, getProfile, loadContacts, loadJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteJournalFiles, loadEvents, addEvent, updateEvent, deleteEvent, loadTags, addTag, updateTag, deleteTag, uploadEventImage, deleteEventImage, renameEventImage ,loadRegistrations, updateRegistrationStatus, loadNews, addNews, updateNews, deleteNews, uploadNewsImage, deleteNewsImage, renameNewsImage, loadMembers } from './api.js';
import { initializeAdminTheme } from './admin-theme.js';

let adminPreviewInterval = null;

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

const debounce = (func, delay = 250) => {
    let timeoutId;
    return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); };
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

const initializeUploaderModal = () => {
    const BUCKET_NAME = 'assets';
    const uploaderModal = document.getElementById('admin-uploader-modal');
    const openUploaderBtn = document.getElementById('open-uploader-btn');
    if (!uploaderModal || !openUploaderBtn) return;

    // --- STATE ---
    let currentPath = '';
    let selectedItem = null;
    let sortOptions = { column: 'name', order: 'asc' };

    // --- DOM ELEMENTS ---
    const closeModalBtn = uploaderModal.querySelector('.close-modal');
    const breadcrumbsContainer = document.getElementById('file-browser-breadcrumbs');
    const fileListContainer = document.getElementById('file-browser-list');
    const createFolderBtn = document.getElementById('create-folder-btn');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const fileInput = document.getElementById('admin-file-input');
    const selectedFileInfo = document.getElementById('selected-file-info');
    const copySelectedLinkBtn = document.getElementById('copy-selected-link-btn');
    const contextMenu = document.getElementById('file-browser-context-menu');
    const uploadProgressArea = document.getElementById('upload-progress-area');
    const sortBySelect = document.getElementById('sort-by');
    const sortOrderBtn = document.getElementById('sort-order-btn');
    const lightboxOverlay = document.getElementById('image-lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCloseBtn = document.querySelector('.lightbox-close-btn');

    // --- ICONS & HELPERS ---
    const FOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    const FILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // --- CORE LOGIC ---
    const fetchFiles = async () => {
        fileListContainer.innerHTML = '<table class="list-view-table"><tbody><tr><td colspan="3" style="text-align:center;"><p class="loading-message">در حال بارگذاری...</p></td></tr></tbody></table>';
        const apiSortColumn = sortOptions.column === 'size' ? 'name' : sortOptions.column;

        const { data, error } = await supabaseClient.storage.from(BUCKET_NAME).list(currentPath, {
            sortBy: { column: apiSortColumn, order: sortOptions.order },
        });

        if (error) {
            fileListContainer.innerHTML = `<table class="list-view-table"><tbody><tr><td colspan="3"><p style="color:red;">خطا: ${error.message}</p></td></tr></tbody></table>`;
            return;
        }

        if (sortOptions.column === 'size') {
            data.sort((a, b) => {
                const sizeA = a.metadata?.size ?? 0;
                const sizeB = b.metadata?.size ?? 0;
                return sortOptions.order === 'asc' ? sizeA - sizeB : sizeB - sizeA;
            });
        }

        renderFiles(data);
        renderBreadcrumbs(currentPath);
    };

    const navigateTo = (path) => {
        currentPath = path;
        deselectItem();
        fetchFiles();
    };

    const deselectItem = () => {
        const selected = fileListContainer.querySelector('.selected');
        if (selected) selected.classList.remove('selected');
        selectedItem = null;
        selectedFileInfo.textContent = 'فایلی انتخاب نشده';
        copySelectedLinkBtn.disabled = true;
    };

    // --- RENDER LOGIC ---
    const renderBreadcrumbs = (path) => {
        const parts = path.split('/').filter(Boolean);
        let html = `<button type="button" class="breadcrumb-item" data-path="">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        <span>ریشه</span>
                    </button>`;
        let current = '';
        parts.forEach(part => {
            current += `${part}/`;
            html += `<span class="breadcrumb-separator">/</span><button type="button" class="breadcrumb-item" data-path="${current}">${part}</button>`;
        });
        breadcrumbsContainer.innerHTML = html;
    };

    const renderFiles = (files) => {
        if (!files || files.length === 0) {
            fileListContainer.innerHTML = '<table class="list-view-table"><tbody><tr><td colspan="3" style="text-align:center; opacity:0.8;">این پوشه خالی است.</td></tr></tbody></table>';
            return;
        }
        
        let tableRows = '';
        files.forEach(item => {
            const isFolder = item.id === null;
            const isImage = !isFolder && item.metadata?.mimetype?.startsWith('image/');
            const lastModified = isFolder ? '---' : new Date(item.updated_at).toLocaleDateString('fa-IR');
            const size = isFolder ? '---' : formatBytes(item.metadata?.size);
            const icon = isFolder ? FOLDER_ICON : FILE_ICON;

            tableRows += `
                <tr data-name="${item.name}" data-is-folder="${isFolder}" data-is-image="${isImage}">
                    <td><div class="list-view-item-name"><div class="item-icon">${icon}</div><span class="item-name">${item.name}</span></div></td>
                    <td>${lastModified}</td>
                    <td>${size}</td>
                </tr>`;
        });
        
        fileListContainer.innerHTML = `<table class="list-view-table"><thead><tr><th>نام</th><th>تاریخ ویرایش</th><th>حجم</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    };

    // --- HANDLERS ---
    const openModal = () => {
        uploaderModal.classList.add('is-open');
        uploadProgressArea.innerHTML = '';
        navigateTo('');
    };
    
    const closeModal = () => uploaderModal.classList.remove('is-open');

    const handleFileClick = (e) => {
        const target = e.target.closest('tr[data-name]');
        if (!target || e.detail > 1) return;

        deselectItem();
        selectedItem = {
            element: target,
            name: target.dataset.name,
            isFolder: target.dataset.isFolder === 'true',
            path: `${currentPath}${target.dataset.name}`
        };
        target.classList.add('selected');
        selectedFileInfo.textContent = selectedItem.name;
        copySelectedLinkBtn.disabled = selectedItem.isFolder;
    };

    const handleFileDoubleClick = (e) => {
        const target = e.target.closest('tr[data-name]');
        if (!target) return;

        if (target.dataset.isFolder === 'true') {
            navigateTo(`${currentPath}${target.dataset.name}/`);
        } else if (target.dataset.isImage === 'true') {
            const { data: { publicUrl } } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(`${currentPath}${target.dataset.name}`);
            lightboxImage.src = publicUrl;
            lightboxOverlay.classList.add('visible');
        }
    };
    
    const closeLightbox = () => {
        lightboxOverlay.classList.remove('visible');
        lightboxImage.src = '';
    };

    const handleCreateFolder = async () => {
        const folderName = prompt("نام پوشه جدید را وارد کنید:");
        if (!folderName || folderName.includes('/')) return;
        const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(`${currentPath}${folderName}/.placeholder`, new Blob(['']));
        if (error) alert(`خطا: ${error.message}`);
        else fetchFiles();
    };

    const handleFileUpload = async (files) => {
        for (const file of files) {
            const progressId = `progress-${file.name}-${Date.now()}`;
            const progressElement = document.createElement('div');
            progressElement.id = progressId;
            progressElement.className = 'upload-progress-container';
            progressElement.innerHTML = `<div class="file-info"><span>${file.name}</span><span class="upload-percentage">0%</span></div><div class="progress-bar"><div class="progress-bar-inner"></div></div>`;
            uploadProgressArea.appendChild(progressElement);

            const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(`${currentPath}${file.name}`, file, { upsert: false });
            
            const uploadedItem = document.getElementById(progressId);
            if (!uploadedItem) continue;
            const percentageSpan = uploadedItem.querySelector('.upload-percentage');
            const progressBarInner = uploadedItem.querySelector('.progress-bar-inner');

            if (error) {
                percentageSpan.textContent = 'خطا';
                percentageSpan.style.color = 'red';
            } else {
                percentageSpan.textContent = 'کامل شد';
                progressBarInner.style.width = '100%';
                progressBarInner.style.backgroundColor = 'var(--success-color)';
                setTimeout(() => uploadedItem.remove(), 5000);
            }
        }
        fetchFiles();
    };
    
    const handleSortChange = () => {
        sortOptions.column = sortBySelect.value;
        sortOptions.order = sortOrderBtn.classList.contains('asc') ? 'asc' : 'desc';
        fetchFiles();
    };
    
    const showContextMenu = (e) => {
        e.preventDefault();
        const target = e.target.closest('tr[data-name]');
        if (!target) return;
        handleFileClick({ target, detail: 1 });
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
    };
    
    const hideContextMenu = () => { if(contextMenu) contextMenu.style.display = 'none'; };

    // --- ATTACHING LISTENERS ---
    openUploaderBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    uploaderModal.addEventListener('click', (e) => { if (e.target === uploaderModal) closeModal(); });
    fileListContainer.addEventListener('click', handleFileClick);
    fileListContainer.addEventListener('dblclick', handleFileDoubleClick);
    fileListContainer.addEventListener('contextmenu', showContextMenu);
    breadcrumbsContainer.addEventListener('click', (e) => { if (e.target.classList.contains('breadcrumb-item')) navigateTo(e.target.dataset.path); });
    createFolderBtn.addEventListener('click', handleCreateFolder);
    uploadFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFileUpload(fileInput.files));
    copySelectedLinkBtn.addEventListener('click', () => {
        if (selectedItem && !selectedItem.isFolder) {
            const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(selectedItem.path);
            navigator.clipboard.writeText(data.publicUrl).then(() => alert('URL کپی شد.'));
        }
    });
    sortBySelect.addEventListener('change', handleSortChange);
    sortOrderBtn.addEventListener('click', () => {
        sortOrderBtn.classList.toggle('asc');
        handleSortChange();
    });
    document.addEventListener('click', hideContextMenu);
    contextMenu.addEventListener('click', (e) => { if(e.target.dataset.action) hideContextMenu(); });
    lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) closeLightbox(); });
    ['dragenter','dragover','dragleave','drop'].forEach(ev=>fileListContainer.addEventListener(ev, e=>{e.preventDefault();e.stopPropagation();}));
    ['dragenter','dragover'].forEach(ev=>fileListContainer.addEventListener(ev,()=>fileListContainer.classList.add('is-dragging')));
    ['dragleave','drop'].forEach(ev=>fileListContainer.addEventListener(ev,()=>fileListContainer.classList.remove('is-dragging')));
    fileListContainer.addEventListener('drop', (e) => handleFileUpload(e.dataTransfer.files));
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
    const itemsToRender = newsItems.sort((a, b) => b.id - a.id).slice(0, 10);

    if (!itemsToRender || itemsToRender.length === 0) {
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
                    </tr>
                </thead>
                <tbody>
                    ${itemsToRender.map(item => {
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

const initializeDatepicker = () => {
    const dateRangeInput = document.getElementById('event-date-range-flatpickr');
    const displayDateInput = document.getElementById('event-display-date');

    let rangeInstance = null;
    
    if (dateRangeInput) {
        rangeInstance = flatpickr(dateRangeInput, {
            mode: "range",
            locale: "fa",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "Y/m/d"
        });
    }

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
                    
                    const startDay = toPersianNumber(instance.formatDate(start, "j"));
                    const endDay = toPersianNumber(instance.formatDate(end, "j"));
                    const startMonthName = instance.formatDate(start, "F");
                    const endMonthName = instance.formatDate(end, "F");
                    const startYear = toPersianNumber(instance.formatDate(start, "Y"));
                    const endYear = toPersianNumber(instance.formatDate(end, "Y"));
                    
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

    let issueBeingEdited = null; 

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
        issueBeingEdited = null; 
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
        const isEditing = !!issueBeingEdited;
        const formData = new FormData(journalForm);
        
        hideStatus(statusBox);
        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? 'در حال آپلود و ویرایش...' : 'در حال آپلود و افزودن...';

        try {
            const coverFile = formData.get('coverFile');
            const journalFile = formData.get('journalFile');
            
            const oldFilesToDelete = [];

            let finalCoverUrl = isEditing ? issueBeingEdited.coverUrl : null;
            let finalFileUrl = isEditing ? issueBeingEdited.fileUrl : null;

            const uploadFile = async (file, folder) => {
                if (!file || file.size === 0) return null;
                const issueNumber = formData.get('issueNumber') || 'NA';
                const now = new Date();
                const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                const extension = file.name.split('.').pop();
                const fileName = `${folder}/ju-${issueNumber}-${timestamp}.${extension}`;
                const { error: uploadError } = await supabaseClient.storage.from('journal-assets').upload(fileName, file, { upsert: true });
                if (uploadError) throw uploadError;
                const { data } = supabaseClient.storage.from('journal-assets').getPublicUrl(fileName);
                return data.publicUrl;
            };
            
            if (coverFile && coverFile.size > 0) {
                if (isEditing && issueBeingEdited.coverUrl) {
                    oldFilesToDelete.push(issueBeingEdited.coverUrl);
                }
                finalCoverUrl = await uploadFile(coverFile, 'covers');
            }

            if (journalFile && journalFile.size > 0) {
                if (isEditing && issueBeingEdited.fileUrl) {
                    oldFilesToDelete.push(issueBeingEdited.fileUrl);
                }
                finalFileUrl = await uploadFile(journalFile, 'files');
            }

            const entryData = {
                title: formData.get('title'),
                issueNumber: formData.get('issueNumber') ? parseInt(formData.get('issueNumber'), 10) : null,
                date: formData.get('date'),
                summary: formData.get('summary'),
                coverUrl: finalCoverUrl,
                fileUrl: finalFileUrl
            };
            
            if (isEditing) {
                await updateJournalEntry(issueBeingEdited.id, entryData);
                showStatus(statusBox, 'نشریه با موفقیت ویرایش شد.', 'success');
                setTimeout(() => { hideStatus(statusBox); resetForm(); }, 4000);
            } else {
                await addJournalEntry(entryData);
                showStatus(statusBox, 'نشریه با موفقیت افزوده شد.', 'success');
                setTimeout(() => { hideStatus(statusBox); resetForm(); }, 4000);
            }
            
            if (oldFilesToDelete.length > 0) {
                await deleteJournalFiles(oldFilesToDelete);
            }

            state.allJournalIssues = await loadJournal();
            renderJournalList(state.allJournalIssues);

        } catch (error) {
            console.error("Error during journal submission:", error);
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
            setTimeout(() => hideStatus(statusBox), 4000);
        } finally {
            submitBtn.disabled = false;
            if (isEditing) {
                submitBtn.textContent = 'ذخیره تغییرات';
            }
        }
    });

    cancelBtn.addEventListener('click', resetForm);

    adminListContainer.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.edit-journal-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const issue = state.allJournalIssues.find(j => j.id == id);
            if (!issue) return;

            issueBeingEdited = issue; 
            
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

        const deleteBtn = event.target.closest('.delete-journal-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const issueToDelete = state.allJournalIssues.find(j => j.id == id);
            if (!issueToDelete) return;

            if (confirm('آیا از حذف این نشریه مطمئن هستید؟ فایل‌های آن نیز برای همیشه از سرور پاک خواهند شد.')) {
                try {
                    deleteBtn.textContent = '...';
                    deleteBtn.disabled = true;

                    await deleteJournalEntry(id);

                    const filesToDelete = [issueToDelete.coverUrl, issueToDelete.fileUrl].filter(Boolean);
                    if (filesToDelete.length > 0) {
                        await deleteJournalFiles(filesToDelete);
                    }

                    state.allJournalIssues = state.allJournalIssues.filter(j => j.id != id);
                    renderJournalList(state.allJournalIssues);

                } catch (error) {
                    alert('خطا در حذف نشریه.');
                    console.error("Deletion Error:", error);
                } finally {
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
    let lastActiveTableCell = null; 
    let lastRenderedJson = '';

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
    const visualEditorContainer = document.getElementById('visual-editor-container');
    const visualEditorControls = document.getElementById('visual-editor-controls');
    const jsonTextarea = document.getElementById('news-content');
    const livePreviewContainer = document.querySelector('.live-preview-container');
    const livePreviewContent = document.getElementById('live-preview-content');
    const refreshRateSelect = document.getElementById('preview-refresh-rate');

    const serializeEditor = () => {
        const blocks = [];
        visualEditorContainer.querySelectorAll('.editor-block').forEach(block => {
            const type = block.dataset.type;
            const data = {};
            if (type === 'table') {
                const tableEl = block.querySelector('.editor-table');
                const content = [];
                const ths = tableEl.querySelectorAll('thead th');
                if (ths.length > 0) {
                    content.push(Array.from(ths).map(th => th.innerHTML));
                }
                tableEl.querySelectorAll('tbody tr').forEach(tr => {
                    content.push(Array.from(tr.querySelectorAll('td')).map(td => td.innerHTML));
                });
                data.content = content;
                data.withHeadings = block.querySelector('[data-key="withHeadings"]').checked;
            } else {
                 block.querySelectorAll('.block-data').forEach(input => {
                    const key = input.dataset.key;
                    if (input.classList.contains('content-editable')) {
                        if (key === 'items') {
                             data[key] = (input.innerText || '').split('\n').map(item => item.trim()).filter(Boolean);
                        } else {
                            data[key] = input.innerHTML;
                        }
                    } else if (input.type === 'checkbox') {
                        data[key] = input.checked;
                    } else {
                        data[key] = input.value;
                    }
                });
            }
            blocks.push({ type, data });
        });
        jsonTextarea.value = JSON.stringify(blocks, null, 2);
    };
    
    const parseInlineMarkdown = (text) => {
        if (!text) return '';
        const sanitizer = document.createElement('div');
        sanitizer.innerHTML = text; 
        const sanitizedText = sanitizer.textContent || sanitizer.innerText || '';
    
        return sanitizedText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/(?<!\\)\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!\\)\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
                if (url.startsWith('javascript:')) return `[${linkText}]()`;
                if (url.startsWith('@')) return `<a href="#/${url.substring(1)}">${linkText}</a>`;
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
            })
            .replace(/\\(\*)/g, '$1');
    };

    const renderJsonContentForPreview = (blocks) => {
        const container = document.createElement('div');
        if (!Array.isArray(blocks)) {
            container.innerHTML = '<p>محتوای این خبر به درستی بارگذاری نشد.</p>';
            return container;
        }
    
        blocks.forEach(block => {
            const data = block.data || {};
            let element;
            switch (block.type) {
                case 'header':
                    element = document.createElement(`h${data.level || 1}`);
                    element.innerHTML = parseInlineMarkdown(data.text);
                    break;
                case 'paragraph':
                    element = document.createElement('p');
                    element.innerHTML = parseInlineMarkdown(data.text);
                    break;
                case 'list':
                    element = document.createElement(data.style === 'ordered' ? 'ol' : 'ul');
                    element.innerHTML = (data.items || []).map(item => `<li>${parseInlineMarkdown(item)}</li>`).join('');
                    break;
                case 'image':
                    element = document.createElement('figure');
                    element.innerHTML = `<img src="${data.url || ''}" alt="${data.caption || 'Image'}">${data.caption ? `<figcaption>${parseInlineMarkdown(data.caption)}</figcaption>` : ''}`;
                    break;
                case 'quote':
                    element = document.createElement('blockquote');
                    element.innerHTML = `<p>${parseInlineMarkdown(data.text)}</p>${data.caption ? `<cite>${parseInlineMarkdown(data.caption)}</cite>` : ''}</blockquote>`;
                    break;
                case 'code':
                    const lang = data.language || '';
                    const code = (data.code || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    element = document.createElement('div');
                    element.className = 'code-block-wrapper';
                    element.innerHTML = `<div class="code-block-header"><span class="language-name">${lang}</span><button class="copy-code-btn" title="کپی"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></div><pre><code>${code}</code></pre>`;
                    break;
                case 'table':
                    const content = data.content || [];
                    const headers = data.withHeadings && content.length > 0 ? `<thead><tr>${content[0].map(c => `<th>${c}</th>`).join('')}</tr></thead>` : '';
                    const rows = data.withHeadings ? content.slice(1) : content;
                    const body = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
                    element = document.createElement('div');
                    element.className = 'table-wrapper';
                    element.innerHTML = `<table class="content-table">${headers}${body}</table>`;
                    break;
                case 'video':
                    element = document.createElement('div');
                    element.className = 'video-container';
                    let tabsHTML = '', playersHTML = '';
                    const hasYoutube = data.YoutubeUrl && data.YoutubeUrl.trim() !== '';
                    const hasAparat = data.AparatUrl && data.AparatUrl.trim() !== '';
                    let isFirstPlatform = true;

                    if (hasAparat) {
                        const aparatIdMatch = data.AparatUrl.match(/(?:\/v\/|\/embed\/)([a-zA-Z0-9]+)/);
                        if (aparatIdMatch) {
                            const embedUrl = `https://www.aparat.com/video/video/embed/videohash/${aparatIdMatch[1]}/vt/frame`;
                            tabsHTML += `<button class="platform-btn active" data-platform="aparat" title="پخش از آپارات"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M14.412 12.022l-.414 1.832c-.16.712-.597 1.33-1.214 1.72-.555.351-1.215.49-1.86.397l-.215-.04-1.817-.41c2.326-.274 4.328-1.605 5.52-3.499zM8 1.262c3.72 0 6.737 3.017 6.737 6.738 0 3.72-3.016 6.737-6.737 6.737S1.263 11.72 1.263 8 4.279 1.263 8 1.263zM.478 8.893c.263 2.23 1.497 4.16 3.266 5.367l.233.153-1.832-.414c-.712-.16-1.33-.597-1.72-1.214-.35-.555-.49-1.215-.397-1.86l.04-.215.41-1.817zm9.206.371c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.685 1.684 1.685.93 0 1.684-.755 1.684-1.685s-.754-1.684-1.684-1.684zM5.052 8c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.684 1.684 1.684.93 0 1.685-.754 1.685-1.684C6.737 8.754 5.982 8 5.052 8zm3.374-.746c-.263-.154-.59-.154-.853 0-.263.155-.422.44-.415.746.01.457.384.823.842.823.458 0 .831-.366.841-.824.007-.305-.152-.59-.415-.745zm2.521-2.623c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.685 1.684 1.685.93 0 1.685-.754 1.685-1.685 0-.93-.755-1.684-1.685-1.684zm1.075-3.044l1.832.414c1.427.322 2.343 1.7 2.11 3.125l-.032.164-.41 1.817c-.275-2.325-1.606-4.327-3.5-5.52zM6.315 3.368c-.93 0-1.684.754-1.684 1.684 0 .93.754 1.685 1.684 1.685.93 0 1.685-.755 1.685-1.685s-.754-1.684-1.685-1.684zM5.076.028l.215.04 1.817.41C4.878.74 2.948 1.975 1.74 3.744l-.153.233.414-1.832c.16-.712.598-1.33 1.215-1.72.555-.35 1.215-.49 1.86-.397z"></path></svg></button>`;
                            playersHTML += `<div class="video-wrapper active" data-platform="aparat"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
                            isFirstPlatform = false;
                        }
                    }
                    if(hasYoutube) {
                        const youtubeIdMatch = data.YoutubeUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/);
                        if (youtubeIdMatch) {
                            const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeIdMatch[1]}`;
                            tabsHTML += `<button class="platform-btn ${isFirstPlatform ? 'active' : ''}" data-platform="youtube" title="پخش از یوتیوب"><svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 0 0-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765 1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 0 0 1.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z"/></svg></button>`;
                            playersHTML += `<div class="video-wrapper ${isFirstPlatform ? 'active' : ''}" data-platform="youtube"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
                        }
                    }

                    if(tabsHTML) {
                        const videoTitle = data.title ? `<h3 class="video-title">${parseInlineMarkdown(data.title)}</h3>` : '';
                        const videoDesc = data.description ? `<p class="video-description">${parseInlineMarkdown(data.description)}</p>` : '';
                        const tabsContainer = (hasAparat && hasYoutube) ? `<div class="video-tabs-container"><div class="video-tab-highlighter"></div>${tabsHTML}</div>` : '';
                        element.innerHTML = `${videoTitle}<div class="video-player-area">${playersHTML}</div><div class="video-controls-container">${videoDesc}${tabsContainer}</div>`;
                    }
                    break;
                default: console.warn('Unknown block type:', block.type);
            }
            if (element) container.appendChild(element);
        });
        return container;
    };
    
    const diffAndUpdateDOM = (oldNode, newNode) => {
        const oldChildren = Array.from(oldNode.children);
        const newChildren = Array.from(newNode.children);
        const maxLen = Math.max(oldChildren.length, newChildren.length);

        for (let i = 0; i < maxLen; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];

            if (!newChild) {
                oldNode.removeChild(oldChild);
            } else if (!oldChild) {
                oldNode.appendChild(newChild);
            } else if (oldChild.tagName !== newChild.tagName || oldChild.className !== newChild.className) {
                oldNode.replaceChild(newChild, oldChild);
            } else if (oldChild.innerHTML !== newChild.innerHTML) {
                if (oldChild.querySelector('iframe')) {
                    const oldIframe = oldChild.querySelector('iframe');
                    const newIframe = newChild.querySelector('iframe');
                    if (!newIframe || oldIframe.src !== newIframe.src) {
                        oldNode.replaceChild(newChild, oldChild);
                    }
                } else {
                    oldChild.innerHTML = newChild.innerHTML;
                }
            }
        }
    };
    
    const updateLivePreview = () => {
        serializeEditor();
        const currentJson = jsonTextarea.value;
    
        if (currentJson === lastRenderedJson) return;
    
        if (!livePreviewContent) return;
        try {
            const contentJson = JSON.parse(currentJson || '[]');
            
            if (contentJson.length === 0) {
                if(livePreviewContent.innerHTML !== '<p class="preview-placeholder">محتوای شما در اینجا نمایش داده می‌شود...</p>') {
                    livePreviewContent.innerHTML = '<p class="preview-placeholder">محتوای شما در اینجا نمایش داده می‌شود...</p>';
                }
            } else {
                const newContentNode = renderJsonContentForPreview(contentJson);
                diffAndUpdateDOM(livePreviewContent, newContentNode);
            }
            lastRenderedJson = currentJson; 
        } catch (e) {
            livePreviewContent.innerHTML = '<p class="preview-placeholder" style="color: red;">خطا در پردازش محتوا...</p>';
        }
    };
    
    if (adminPreviewInterval) clearInterval(adminPreviewInterval);
    
    const setupAutoRefresh = () => {
        if (adminPreviewInterval) clearInterval(adminPreviewInterval);
        const rate = parseInt(refreshRateSelect.value, 10);
        if (rate > 0) {
            adminPreviewInterval = setInterval(updateLivePreview, rate);
        }
    };

    refreshRateSelect.addEventListener('change', setupAutoRefresh);
    setupAutoRefresh(); 

    const debouncedUpdatePreview = debounce(updateLivePreview, 200);
    visualEditorContainer.addEventListener('input', debouncedUpdatePreview);
    visualEditorContainer.addEventListener('click', () => {
        setTimeout(debouncedUpdatePreview, 0); 
    });
    
    if (livePreviewContent) {
        livePreviewContent.addEventListener('click', (e) => {
            const platformBtn = e.target.closest('.platform-btn');
            if (!platformBtn) return;

            const container = platformBtn.closest('.video-container');
            if (!container) return;

            const targetPlatform = platformBtn.dataset.platform;
            const tabs = container.querySelectorAll('.platform-btn');
            const players = container.querySelectorAll('.video-wrapper');
            const highlighter = container.querySelector('.video-tab-highlighter');

            tabs.forEach(t => t.classList.remove('active'));
            platformBtn.classList.add('active');

            players.forEach(player => {
                player.classList.toggle('active', player.dataset.platform === targetPlatform);
            });

            if (highlighter) {
                highlighter.style.width = `${platformBtn.offsetWidth}px`;
                highlighter.style.transform = `translateX(${platformBtn.offsetLeft}px)`;
            }
        });
    }
    
    updateLivePreview();


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

    // --- VISUAL EDITOR LOGIC (TEXT-BASED ICONS) ---
    const renderEditorBlock = (type, data = {}) => {
        const blockId = `block-${Date.now()}-${Math.random()}`;
        const block = document.createElement('div');
        block.className = 'editor-block';
        block.id = blockId;
        block.dataset.type = type;

        const mainControls = `
            <div class="editor-block-controls main-controls">
                <button type="button" class="move-block-up" title="انتقال به بالا"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
                <button type="button" class="move-block-down" title="انتقال به پایین"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
                <button type="button" class="delete-block-btn" title="حذف بلوک"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>`;

        let typeSpecificControls = '';
        let fields = '';
        const formatControls = `
            <div class="header-format-selector">
                <button type="button" class="format-btn" data-format="bold" title="بولد"><b>B</b></button>
                <button type="button" class="format-btn" data-format="italic" title="ایتالیک"><i>I</i></button>
                <button type="button" class="format-btn" data-format="link" title="افزودن لینک"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg></button>
            </div>`;

        switch (type) {
            case 'header':
                const level = data.level || 1;
                typeSpecificControls = `
                    <div class="editor-block-controls type-controls">
                        <div class="header-level-selector">
                             <input type="hidden" class="block-data" data-key="level" value="${level}">
                             <button type="button" class="level-btn ${level == 1 ? 'active' : ''}" data-level="1" title="H1">A</button>
                             <button type="button" class="level-btn ${level == 2 ? 'active' : ''}" data-level="2" title="H2">A</button>
                             <button type="button" class="level-btn ${level == 3 ? 'active' : ''}" data-level="3" title="H3">A</button>
                        </div>
                        <div class="control-separator"></div>
                        ${formatControls}
                    </div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="text" contenteditable="true" placeholder="متن تیتر...">${data.text || ''}</div></div>`;
                break;
            case 'paragraph':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="text" contenteditable="true" placeholder="متن پاراگراف...">${data.text || ''}</div></div>`;
                break;
            case 'list':
                const style = data.style || 'unordered';
                typeSpecificControls = `
                    <div class="editor-block-controls type-controls">
                        <div class="list-style-selector">
                            <input type="hidden" class="block-data" data-key="style" value="${style}">
                            <button type="button" class="list-style-btn ${style === 'unordered' ? 'active' : ''}" data-style="unordered" title="لیست نقطه‌ای">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            </button>
                            <button type="button" class="list-style-btn ${style === 'ordered' ? 'active' : ''}" data-style="ordered" title="لیست عددی">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6H8M21 12H8M21 18H8M4 6h1v4M4 12h1v6M4.2 18H4l.2 2H5"/></svg>
                            </button>
                        </div>
                        <div class="control-separator"></div>
                        ${formatControls}
                    </div>`;
                const items = Array.isArray(data.items) ? data.items.join('<br>') : '';
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="items" contenteditable="true" placeholder="هر آیتم در یک خط...">${items}</div></div>`;
                break;
            case 'quote':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="text" contenteditable="true" placeholder="متن نقل‌قول...">${data.text || ''}</div></div><div class="form-group"><input type="text" class="block-data" data-key="caption" placeholder="منبع (اختیاری)" value="${data.caption || ''}"></div>`;
                break;
            case 'image':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-row"><div class="form-group" style="flex: 2;"><input type="url" class="block-data" data-key="url" placeholder="آدرس تصویر..." value="${data.url || ''}"></div><div class="form-group" style="flex: 3;"><div class="content-editable block-data" data-key="caption" contenteditable="true" placeholder="کپشن (اختیاری)...">${data.caption || ''}</div></div></div>`;
                break;
            case 'table':
                const content = data.content || [['عنوان ۱', 'عنوان ۲'], ['متن ۱', 'متن ۲']];
                const hasHeadings = data.withHeadings !== false;
                
                let tableHTML = `<table class="editor-table block-data" data-key="content">`;
                if (hasHeadings && content.length > 0) {
                    tableHTML += `<thead><tr>${content[0].map(cell => `<th contenteditable="true">${cell}</th>`).join('')}</tr></thead>`;
                }
                tableHTML += `<tbody>`;
                const startIndex = hasHeadings ? 1 : 0;
                for (let i = startIndex; i < content.length; i++) {
                    tableHTML += `<tr>${content[i].map(cell => `<td contenteditable="true">${cell}</td>`).join('')}</tr>`;
                }
                tableHTML += `</tbody></table>`;

                typeSpecificControls = `
                    <div class="editor-block-controls type-controls">
                         <div class="table-controls">
                            <label class="table-heading-toggle"><input type="checkbox" class="block-data" data-key="withHeadings" ${hasHeadings ? 'checked' : ''}>سربرگ</label>
                            <div class="control-separator"></div>
                            ${formatControls}
                            <div class="control-separator"></div>
                            <button type="button" class="table-op-btn add-row-btn" title="افزودن سطر">
                                <span class="table-op-icon">=</span>
                            </button>
                            <button type="button" class="table-op-btn add-col-btn" title="افزودن ستون">
                                <span class="table-op-icon rotate-90">=</span>
                            </button>
                            <div class="control-separator"></div>
                            <button type="button" class="table-op-btn delete-row-btn" title="حذف سطر">
                               <span class="table-op-icon">=</span>
                            </button>
                            <button type="button" class="table-op-btn delete-col-btn" title="حذف ستون">
                               <span class="table-op-icon rotate-90">=</span>
                            </button>
                         </div>
                    </div>`;
                fields = `<div class="table-editor-wrapper">${tableHTML}</div>`;
                break;
            case 'video':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="title" contenteditable="true" placeholder="عنوان ویدیو (اختیاری)...">${data.title || ''}</div></div><div class="form-row"><div class="form-group"><input type="url" class="block-data" data-key="AparatUrl" placeholder="لینک آپارات..." value="${data.AparatUrl || ''}"></div><div class="form-group"><input type="url" class="block-data" data-key="YoutubeUrl" placeholder="لینک یوتیوب..." value="${data.YoutubeUrl || ''}"></div></div><div class="form-group"><div class="content-editable block-data" data-key="description" contenteditable="true" placeholder="توضیحات ویدیو (اختیاری)...">${data.description || ''}</div></div>`;
                break;
            case 'code':
                fields = `<div class="form-row"><div class="form-group" style="flex-grow: 1;"><textarea class="block-data" data-key="code" placeholder="کد شما...">${data.code || ''}</textarea></div><div class="form-group"><input type="text" class="block-data" data-key="language" placeholder="زبان (مثال: js)" value="${data.language || ''}"></div></div>`;
                break;
        }
        block.innerHTML = mainControls + typeSpecificControls + fields;
        return block;
    };
    
    const addBlockToEditor = (type, data = {}) => {
        const blockElement = renderEditorBlock(type, data);
        visualEditorContainer.appendChild(blockElement);
    };

    const loadNewsItemInEditor = (newsItem) => {
        visualEditorContainer.innerHTML = '';
        try {
            const content = newsItem.content;
            if (Array.isArray(content)) {
                content.forEach(block => addBlockToEditor(block.type, block.data));
            }
        } catch (e) {
            console.error("Error parsing news content for editor:", e);
        }
    };
    
    const updateFormatButtonStates = (editableDiv) => {
        if (!editableDiv) return;
        const block = editableDiv.closest('.editor-block');
        if (!block) return;
        
        const isBold = document.queryCommandState('bold');
        const isItalic = document.queryCommandState('italic');

        const boldBtn = block.querySelector('.format-btn[data-format="bold"]');
        const italicBtn = block.querySelector('.format-btn[data-format="italic"]');

        if (boldBtn) boldBtn.classList.toggle('active', isBold);
        if (italicBtn) italicBtn.classList.toggle('active', isItalic);
    };

    visualEditorContainer.addEventListener('focusin', (e) => {
        if (e.target.matches('td, th')) {
            lastActiveTableCell = e.target;
        }
    });
    
    visualEditorContainer.addEventListener('keyup', (e) => {
        if (e.target.isContentEditable) {
            updateFormatButtonStates(e.target);
        }
    });

    visualEditorContainer.addEventListener('mouseup', (e) => {
        if (e.target.isContentEditable) {
            setTimeout(() => updateFormatButtonStates(e.target), 1);
        }
    });

    visualEditorContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('button.format-btn')) {
            e.preventDefault();
        }
    });
    
    visualEditorContainer.addEventListener('change', (e) => {
        if (e.target.matches('[data-key="withHeadings"]')) {
            const table = e.target.closest('.editor-block').querySelector('.editor-table');
            let firstRow = table.rows[0];
             if (!firstRow && table.tBodies[0] && table.tBodies[0].rows.length > 0) {
                firstRow = table.tBodies[0].rows[0];
            }
            if (!firstRow) return;

            const newTag = e.target.checked ? 'th' : 'td';
            
            const newRow = document.createElement('tr');
            Array.from(firstRow.cells).forEach(cell => {
                const newCell = document.createElement(newTag);
                newCell.innerHTML = cell.innerHTML;
                newCell.contentEditable = true;
                newRow.appendChild(newCell);
            });
            
            if (e.target.checked) {
                let thead = table.tHead;
                if (!thead) {
                    thead = table.createTHead();
                }
                thead.innerHTML = '';
                thead.appendChild(newRow);
                if (table.tBodies[0]) table.tBodies[0].deleteRow(0);
            } else {
                let tbody = table.tBodies[0];
                if(!tbody) {
                     tbody = document.createElement('tbody');
                     table.appendChild(tbody);
                }
                if (table.tHead) table.tHead.innerHTML = '';
                tbody.insertBefore(newRow, tbody.firstChild);
            }
        }
    });

visualEditorContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const block = btn.closest('.editor-block');
        if (!block) return;

        const table = block.querySelector('table');

        if (btn.classList.contains('delete-block-btn')) {
            block.remove();
} else if (btn.classList.contains('move-block-up')) {
            const sibling = block.previousElementSibling;
            if (sibling) {
                // FIRST: Get original positions
                const blockRect = block.getBoundingClientRect();
                const siblingRect = sibling.getBoundingClientRect();

                // LAST: Swap the elements in the DOM
                visualEditorContainer.insertBefore(block, sibling);
                
                // Read the new positions
                const newBlockRect = block.getBoundingClientRect();
                const newSiblingRect = sibling.getBoundingClientRect();

                // INVERT: Move elements back to their old visual position without animation
                block.style.transition = 'none';
                sibling.style.transition = 'none';
                block.style.transform = `translateY(${blockRect.top - newBlockRect.top}px)`;
                sibling.style.transform = `translateY(${siblingRect.top - newSiblingRect.top}px)`;

                // PLAY: In the next frame, remove the transform and apply the transition
                requestAnimationFrame(() => {
                    block.style.transition = 'transform 0.3s ease';
                    sibling.style.transition = 'transform 0.3s ease';
                    block.style.transform = '';
                    sibling.style.transform = '';
                });
            }
        } else if (btn.classList.contains('move-block-down')) {
            const sibling = block.nextElementSibling;
            if (sibling) {
                // FIRST
                const blockRect = block.getBoundingClientRect();
                const siblingRect = sibling.getBoundingClientRect();

                // LAST
                visualEditorContainer.insertBefore(sibling, block);
                
                const newBlockRect = block.getBoundingClientRect();
                const newSiblingRect = sibling.getBoundingClientRect();

                // INVERT
                block.style.transition = 'none';
                sibling.style.transition = 'none';
                block.style.transform = `translateY(${blockRect.top - newBlockRect.top}px)`;
                sibling.style.transform = `translateY(${siblingRect.top - newSiblingRect.top}px)`;

                // PLAY
                requestAnimationFrame(() => {
                    block.style.transition = 'transform 0.3s ease';
                    sibling.style.transition = 'transform 0.3s ease';
                    block.style.transform = '';
                    sibling.style.transform = '';
                });
            }
        } else if (btn.classList.contains('level-btn')) {
            const newLevel = btn.dataset.level;
            const levelInput = block.querySelector('input[data-key="level"]');
            if (levelInput) levelInput.value = newLevel;
            
            block.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else if (btn.classList.contains('list-style-btn')) {
            const newStyle = btn.dataset.style;
            const styleInput = block.querySelector('input[data-key="style"]');
            if (styleInput) styleInput.value = newStyle;

            block.querySelectorAll('.list-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else if (btn.classList.contains('format-btn')) {
            const format = btn.dataset.format;
            const selection = window.getSelection();
            const editableElement = selection.focusNode?.parentElement.closest('[contenteditable="true"]');
            
            if (!editableElement) return;

            editableElement.focus();

            if (format === 'link') {
                const selectionText = selection.toString().trim();
                if (!selectionText) {
                    alert('لطفاً ابتدا قسمتی از متن را برای لینک کردن انتخاب کنید.');
                    return;
                }
                const url = prompt('آدرس لینک را وارد کنید:', 'https://');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
            } else {
                document.execCommand(format, false, null);
            }
            updateFormatButtonStates(editableElement);
        } else if (btn.classList.contains('add-row-btn')) {
            const newRow = table.tBodies[0].insertRow();
            const cellCount = table.rows[0]?.cells.length || 2;
            for (let i = 0; i < cellCount; i++) {
                const newCell = newRow.insertCell();
                newCell.contentEditable = true;
            }
        } else if (btn.classList.contains('add-col-btn')) {
            if (table.tHead) {
                const newHeaderCell = document.createElement('th');
                newHeaderCell.contentEditable = true;
                table.tHead.rows[0].appendChild(newHeaderCell);
            }
            Array.from(table.tBodies[0].rows).forEach(row => {
                const newCell = row.insertCell();
                newCell.contentEditable = true;
            });
        } else if (btn.classList.contains('delete-row-btn')) {
            if (!lastActiveTableCell || !block.contains(lastActiveTableCell)) {
                alert('برای حذف، ابتدا یک سلول از سطر مورد نظر را انتخاب کنید.');
                return;
            }
            if (table.rows.length <= 2) return;
            
            const rowToDelete = lastActiveTableCell.parentElement;
            const withHeadings = block.querySelector('[data-key="withHeadings"]').checked;
            const isHeaderRow = withHeadings && rowToDelete.parentElement.tagName === 'THEAD';

            if (isHeaderRow && table.tBodies[0]?.rows.length > 0) {
                const firstBodyRow = table.tBodies[0].rows[0];
                const newHeaderRow = table.tHead.rows[0];
                newHeaderRow.innerHTML = '';
                Array.from(firstBodyRow.cells).forEach(cell => {
                    const newTh = document.createElement('th');
                    newTh.innerHTML = cell.innerHTML;
                    newTh.contentEditable = true;
                    newHeaderRow.appendChild(newTh);
                });
                firstBodyRow.remove();
            } else {
                rowToDelete.remove();
            }
            lastActiveTableCell = null;
        } else if (btn.classList.contains('delete-col-btn')) {
            if (!lastActiveTableCell || !block.contains(lastActiveTableCell)) {
                alert('برای حذف، ابتدا یک سلول از ستون مورد نظر را انتخاب کنید.');
                return;
            }
            if (table.rows[0].cells.length <= 2) return;

            const colIndex = lastActiveTableCell.cellIndex;
            Array.from(table.rows).forEach(row => {
                if (row.cells[colIndex]) row.deleteCell(colIndex);
            });
            lastActiveTableCell = null;
        }
    });
    
    visualEditorControls.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.type) {
            addBlockToEditor(btn.dataset.type);
        }
    });
    
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
        visualEditorContainer.innerHTML = '';
        jsonTextarea.value = '';
        populateAuthors(); 
        if (dateInput && dateInput._flatpickr) { 
            dateInput._flatpickr.clear(); 
        }
        newsForm.scrollIntoView({ behavior: 'smooth' });
    };

    newsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        serializeEditor(); 
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
            
            let contentJson;
            try {
                contentJson = JSON.parse(formData.get('content'));
            } catch(e) {
                throw new Error("ساختار محتوای وارد شده صحیح نیست. لطفاً آن را بررسی کنید.");
            }

            const newsData = {
                title: formData.get('title'),
                summary: formData.get('summary'),
                readingTime: formattedReadingTime,
                authorId: authorId,
                tag_ids: selectedTagIds,
                content: contentJson,
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
            
            setTimeout(() => { hideStatus(statusBox); resetForm(); }, 2000);
            state.allNews = await loadNews();
            renderNewsList(state.allNews);

        } catch (error) {
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
            setTimeout(() => hideStatus(statusBox), 4000);
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
            
            readingTimeInput.value = newsItem.readingTime || '';
            
            authorSelect.value = newsItem.authorId || '';

            loadNewsItemInEditor(newsItem);
            
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

    const togglePreviewFab = document.getElementById('toggle-preview-fab');
    const previewWidget = document.getElementById('live-preview-widget');

    if (togglePreviewFab && previewWidget) {
        togglePreviewFab.addEventListener('click', () => {
            previewWidget.classList.toggle('is-open');
        });
    }
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
    
    // START: Editor variables
    const visualEditorContainer = document.getElementById('visual-editor-container-event');
    const visualEditorControls = document.getElementById('visual-editor-controls-event');
    const contentTextarea = document.getElementById('event-content');
    
    const previewModal = document.getElementById('admin-preview-modal');
    const livePreviewEventContent = document.getElementById('live-preview-event-content');
    const livePreviewScheduleCards = document.getElementById('live-preview-schedule-cards');
    const togglePreviewFab = document.getElementById('toggle-preview-fab');

    const scheduleEditorContainer = document.getElementById('schedule-editor-container');
    const scheduleTextarea = document.getElementById('event-schedule');
    const addSessionBtn = document.getElementById('add-session-btn');
    // END: Editor variables

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
        
        fileClearBtn.style.display = isEditing ? 'none' : (hasFile ? 'inline-block' : 'none');
    };

    if (imageUploadInput) {
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

    if (fileClearBtn) {
        fileClearBtn.addEventListener('click', () => {
            imageUploadInput.value = '';
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
    
    // START: Visual & Schedule Editor Logic
    const serializeEventEditor = () => {
        const blocks = [];
        visualEditorContainer.querySelectorAll('.editor-block').forEach(block => {
            const type = block.dataset.type;
            const data = {};
            block.querySelectorAll('.block-data').forEach(input => {
                const key = input.dataset.key;
                if (input.classList.contains('content-editable')) {
                    if (key === 'items') {
                        data[key] = (input.innerText || '').split('\n').map(item => item.trim()).filter(Boolean);
                    } else {
                        data[key] = input.innerHTML;
                    }
                } else {
                    data[key] = input.value;
                }
            });
            blocks.push({ type, data });
        });
        contentTextarea.value = JSON.stringify(blocks, null, 2);
    };

    const renderEventEditorBlock = (type, data = {}) => {
        const blockId = `event-block-${Date.now()}-${Math.random()}`;
        const block = document.createElement('div');
        block.className = 'editor-block';
        block.id = blockId;
        block.dataset.type = type;

        const mainControls = `
            <div class="editor-block-controls main-controls">
                <button type="button" class="move-block-up" title="انتقال به بالا"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
                <button type="button" class="move-block-down" title="انتقال به پایین"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
                <button type="button" class="delete-block-btn" title="حذف بلوک"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>`;

        let typeSpecificControls = '';
        let fields = '';
        const formatControls = `
            <div class="header-format-selector">
                <button type="button" class="format-btn" data-format="bold" title="بولد"><b>B</b></button>
                <button type="button" class="format-btn" data-format="italic" title="ایتالیک"><i>I</i></button>
                <button type="button" class="format-btn" data-format="link" title="افزودن لینک"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg></button>
            </div>`;

        switch (type) {
             case 'header':
                const level = data.level || 2;
                typeSpecificControls = `<div class="editor-block-controls type-controls"><div class="header-level-selector"><input type="hidden" class="block-data" data-key="level" value="${level}"><button type="button" class="level-btn ${level == 2 ? 'active' : ''}" data-level="2" title="H2">A</button><button type="button" class="level-btn ${level == 3 ? 'active' : ''}" data-level="3" title="H3">A</button></div><div class="control-separator"></div>${formatControls}</div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="text" contenteditable="true" placeholder="متن تیتر...">${data.text || ''}</div></div>`;
                break;
            case 'paragraph':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="text" contenteditable="true" placeholder="متن پاراگراف...">${data.text || ''}</div></div>`;
                break;
            case 'list':
                const style = data.style || 'unordered';
                typeSpecificControls = `<div class="editor-block-controls type-controls"><div class="list-style-selector"><input type="hidden" class="block-data" data-key="style" value="${style}"><button type="button" class="list-style-btn ${style === 'unordered' ? 'active' : ''}" data-style="unordered" title="لیست نقطه‌ای"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button><button type="button" class="list-style-btn ${style === 'ordered' ? 'active' : ''}" data-style="ordered" title="لیست عددی"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6H8M21 12H8M21 18H8M4 6h1v4M4 12h1v6M4.2 18H4l.2 2H5"/></svg></button></div><div class="control-separator"></div>${formatControls}</div>`;
                const items = Array.isArray(data.items) ? data.items.join('\n') : '';
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="items" contenteditable="true" placeholder="هر آیتم در یک خط...">${items}</div></div>`;
                break;
            case 'quote':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-group"><div class="content-editable block-data" data-key="text" contenteditable="true" placeholder="متن نقل‌قول...">${data.text || ''}</div></div><div class="form-group"><input type="text" class="block-data" data-key="caption" placeholder="منبع (اختیاری)" value="${data.caption || ''}"></div>`;
                break;
            case 'image':
                typeSpecificControls = `<div class="editor-block-controls type-controls">${formatControls}</div>`;
                fields = `<div class="form-row"><div class="form-group" style="flex: 2;"><input type="url" class="block-data" data-key="url" placeholder="آدرس تصویر..." value="${data.url || ''}"></div><div class="form-group" style="flex: 3;"><div class="content-editable block-data" data-key="caption" contenteditable="true" placeholder="کپشن (اختیاری)...">${data.caption || ''}</div></div></div>`;
                break;
        }
        block.innerHTML = mainControls + typeSpecificControls + fields;
        return block;
    };
    
    const addBlockToEventEditor = (type, data = {}) => {
        const blockElement = renderEventEditorBlock(type, data);
        visualEditorContainer.appendChild(blockElement);
    };

    const loadEventInEditor = (eventItem) => {
        visualEditorContainer.innerHTML = '';
        try {
            let content = eventItem.content;
            if (typeof content === 'string' && content.trim()) {
                content = JSON.parse(content);
            }
            if (Array.isArray(content)) {
                content.forEach(block => addBlockToEventEditor(block.type, block.data));
            }
        } catch (e) {
            console.error("Error parsing event content for editor:", e);
        }
    };
    
    visualEditorControls.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.type) {
            addBlockToEventEditor(btn.dataset.type);
        }
    });

    visualEditorContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const block = btn.closest('.editor-block');
        if (!block) return;
        
        const handleMove = (block, sibling, insertBefore) => {
            const blockRect = block.getBoundingClientRect();
            const siblingRect = sibling.getBoundingClientRect();

            if (insertBefore) {
                visualEditorContainer.insertBefore(block, sibling);
            } else {
                visualEditorContainer.insertBefore(sibling, block);
            }
            
            const newBlockRect = block.getBoundingClientRect();
            const newSiblingRect = sibling.getBoundingClientRect();

            block.style.transition = 'none';
            sibling.style.transition = 'none';
            block.style.transform = `translateY(${blockRect.top - newBlockRect.top}px)`;
            sibling.style.transform = `translateY(${siblingRect.top - newSiblingRect.top}px)`;

            requestAnimationFrame(() => {
                block.style.transition = 'transform 0.3s ease';
                sibling.style.transition = 'transform 0.3s ease';
                block.style.transform = '';
                sibling.style.transform = '';
            });
        };

        if (btn.classList.contains('delete-block-btn')) { block.remove(); }
        else if (btn.classList.contains('move-block-up') && block.previousElementSibling) { handleMove(block, block.previousElementSibling, true); }
        else if (btn.classList.contains('move-block-down') && block.nextElementSibling) { handleMove(block, block.nextElementSibling, false); }
        else if (btn.classList.contains('format-btn')) {
            e.preventDefault();
            const format = btn.dataset.format;
            const editableElement = block.querySelector('[contenteditable="true"]');
            if (!editableElement) return;
            editableElement.focus();
            if (format === 'link') {
                const url = prompt('آدرس لینک را وارد کنید:', 'https://');
                if (url) document.execCommand('createLink', false, url);
            } else {
                document.execCommand(format, false, null);
            }
        }
        else if (btn.classList.contains('level-btn')) {
            block.querySelector('input[data-key="level"]').value = btn.dataset.level;
            block.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else if (btn.classList.contains('list-style-btn')) {
            block.querySelector('input[data-key="style"]').value = btn.dataset.style;
            block.querySelectorAll('.list-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });

    const parseInlineMarkdown = (text) => {
        if (!text) return '';
        const sanitizer = document.createElement('div');
        sanitizer.innerHTML = text; 
        const sanitizedText = sanitizer.textContent || sanitizer.innerText || '';
    
        return sanitizedText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/(?<!\\)\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!\\)\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>`)
            .replace(/\\(\*)/g, '$1');
    };

    const renderJsonContentForPreview = (blocks) => {
        const container = document.createElement('div');
        if (!Array.isArray(blocks)) {
            container.innerHTML = '<p>محتوای این رویداد به درستی بارگذاری نشد.</p>';
            return container;
        }
    
        blocks.forEach(block => {
            const data = block.data || {};
            let element;
            switch (block.type) {
                case 'header':
                    element = document.createElement(`h${data.level || 1}`);
                    element.innerHTML = parseInlineMarkdown(data.text);
                    break;
                case 'paragraph':
                    element = document.createElement('p');
                    element.innerHTML = parseInlineMarkdown(data.text);
                    break;
                case 'list':
                    element = document.createElement(data.style === 'ordered' ? 'ol' : 'ul');
                    element.innerHTML = (data.items || []).map(item => `<li>${parseInlineMarkdown(item)}</li>`).join('');
                    break;
                case 'image':
                    element = document.createElement('figure');
                    element.innerHTML = `<img src="${data.url || ''}" alt="${data.caption || 'Image'}">${data.caption ? `<figcaption>${parseInlineMarkdown(data.caption)}</figcaption>` : ''}`;
                    break;
                case 'quote':
                    element = document.createElement('blockquote');
                    element.innerHTML = `<p>${parseInlineMarkdown(data.text)}</p>${data.caption ? `<cite>${parseInlineMarkdown(data.caption)}</cite>` : ''}</blockquote>`;
                    break;
            }
            if (element) container.appendChild(element);
        });
        return container;
    };
    
    const renderScheduleForPreview = (schedule) => {
        if (!Array.isArray(schedule) || schedule.length === 0) {
            livePreviewScheduleCards.innerHTML = '<p class="preview-placeholder">جلسه‌ای برای نمایش وجود ندارد.</p>';
            return;
        }

        livePreviewScheduleCards.innerHTML = '';
        const icon_calendar = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
        const icon_clock = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        const icon_pin = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
        const icon_link = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>`;

        schedule.forEach(session => {
            if (!session.session || !session.session.trim()) return;

            const card = document.createElement('div');
            card.className = 'preview-session-card';
            
            let infoGridHtml = '<div class="info-grid">';
            if (session.date) infoGridHtml += `<div class="info-item">${icon_calendar} <span>${session.date}</span></div>`;
            if (session.time) infoGridHtml += `<div class="info-item">${icon_clock} <span>${session.time}</span></div>`;
            if (session.venue) infoGridHtml += `<div class="info-item">${icon_pin} <span>${session.venue}</span></div>`;
            infoGridHtml += '</div>';

            let linkHtml = '';
            if (session.link) {
                linkHtml = `
                    <div class="session-link-container">
                        <a href="${session.link}" target="_blank" class="session-link-btn">
                            ${icon_link}
                            <span>ورود به جلسه</span>
                        </a>
                    </div>
                `;
            }

            card.innerHTML = `
                <h5>${session.session}</h5>
                ${infoGridHtml}
                ${linkHtml}
            `;
            livePreviewScheduleCards.appendChild(card);
        });
        
        if(livePreviewScheduleCards.children.length === 0){
             livePreviewScheduleCards.innerHTML = '<p class="preview-placeholder">جلسه‌ای برای نمایش وجود ندارد.</p>';
        }
    };

    const updateLivePreview = () => {
        // Update Event Content Preview
        serializeEventEditor();
        const contentJsonStr = contentTextarea.value;
        try {
            const contentJson = JSON.parse(contentJsonStr || '[]');
            if (contentJson.length === 0) {
                 livePreviewEventContent.innerHTML = '<p class="preview-placeholder">محتوایی برای نمایش وجود ندارد...</p>';
            } else {
                const newContentNode = renderJsonContentForPreview(contentJson);
                livePreviewEventContent.innerHTML = '';
                livePreviewEventContent.appendChild(newContentNode);
            }
        } catch (e) {
            livePreviewEventContent.innerHTML = '<p class="preview-placeholder" style="color: red;">خطا در پردازش محتوا...</p>';
        }

        // Update Schedule Cards Preview
        serializeSchedule();
        const scheduleJsonStr = scheduleTextarea.value;
        try {
            const scheduleJson = JSON.parse(scheduleJsonStr || '[]');
            renderScheduleForPreview(scheduleJson);
        } catch(e) {
            livePreviewScheduleCards.innerHTML = '<p class="preview-placeholder" style="color: red;">خطا در پردازش جلسات...</p>';
        }
    };
    
    const togglePreviewModal = () => {
        const isOpen = previewModal.classList.contains('is-visible');
        if (!isOpen) {
            updateLivePreview();
        }
        previewModal.classList.toggle('is-visible');
        document.body.classList.toggle('admin-preview-is-open');
    };

    if (togglePreviewFab) togglePreviewFab.addEventListener('click', togglePreviewModal);
    if (previewModal) previewModal.addEventListener('click', (e) => { 
        if (e.target === previewModal) {
            togglePreviewModal();
        }
    });

    const reorderSessionNumbers = () => {
        scheduleEditorContainer.querySelectorAll('.schedule-item').forEach((item, index) => {
            const counter = item.querySelector('.session-counter');
            if (counter) counter.textContent = `جلسه ${index + 1}`;
        });
    };

const renderSessionItem = (session = {}, index) => {
        const sessionCount = index || (scheduleEditorContainer.children.length + 1);
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'schedule-item';

        const icon_delete = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

        // START: HTML Change - Using a wrapper for time inputs
        sessionDiv.innerHTML = `
            <div class="schedule-item-header">
                <span class="session-counter">جلسه ${sessionCount}</span>
                <div class="schedule-item-controls">
                    <button type="button" class="delete-session-btn" title="حذف جلسه">${icon_delete}</button>
                </div>
            </div>
            <div class="schedule-item-fields">
                <div class="form-group"><input type="text" data-key="session" placeholder="عنوان جلسه" value="${session.session || ''}"></div>
                <div class="form-group"><input type="text" data-key="date" placeholder="تاریخ (مثال: ۲۸ مرداد)" value="${session.date || ''}"></div>
                <div class="form-group time-range-group">
                    <div class="time-range-inputs">
                        <input type="text" class="time-input" data-part="start" placeholder="۱۶:۰۰" maxlength="5">
                        <span class="time-range-separator">-</span>
                        <input type="text" class="time-input" data-part="end" placeholder="۱۸:۰۰" maxlength="5">
                        <input type="hidden" data-key="time" value="${session.time || ''}">
                    </div>
                </div>
                <div class="form-group"><input type="text" data-key="venue" placeholder="مکان" value="${session.venue || ''}"></div>
                <div class="form-group"><input type="url" data-key="link" placeholder="لینک جلسه" value="${session.link || ''}"></div>
            </div>
        `;
        // END: HTML Change

        // --- Persian Date Logic (Unchanged) ---
        const dateInput = sessionDiv.querySelector('input[data-key="date"]');
        const enforcePersianOnly = (e) => {
            let value = e.target.value;
            value = value.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
                         .replace(/[٠-٩]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
            value = value.replace(/[^۰-۹\u0600-\u06FF\s]/g, '');
            e.target.value = value;
        };
        dateInput.addEventListener('input', enforcePersianOnly);

        // --- START: NEW DUAL-FIELD TIME LOGIC ---
        const startTimeInput = sessionDiv.querySelector('.time-input[data-part="start"]');
        const endTimeInput = sessionDiv.querySelector('.time-input[data-part="end"]');
        const hiddenTimeInput = sessionDiv.querySelector('input[data-key="time"]');
        
        // Populate inputs if editing an existing session
        if (session.time && session.time.includes(' - ')) {
            const [start, end] = session.time.split(' - ');
            startTimeInput.value = start;
            endTimeInput.value = end;
        }

        const formatTimeValue = (input) => {
            let value = input.value;
            // Convert numbers to Persian and allow only valid characters
            value = value.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
                         .replace(/[٠-٩]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
                         .replace(/[^۰-۹:]/g, '');
            
            // Auto-add colon
            if (value.length === 2 && !value.includes(':')) {
                value += ':';
            }
            if (value.length > 5) {
                value = value.slice(0, 5);
            }
            input.value = value;
        };

        const updateHiddenInput = () => {
            const start = startTimeInput.value.trim();
            const end = endTimeInput.value.trim();
            const regex = /^[۰-۹]{2}:[۰-۹]{2}$/;
            // Only combine if both parts are valid
            if (regex.test(start) && regex.test(end)) {
                hiddenTimeInput.value = `${start} - ${end}`;
            } else {
                hiddenTimeInput.value = '';
            }
        };

        [startTimeInput, endTimeInput].forEach(input => {
            input.addEventListener('input', (e) => {
                formatTimeValue(e.target);
                updateHiddenInput();
            });
            input.addEventListener('blur', (e) => {
                 const regex = /^[۰-۹]{2}:[۰-۹]{2}$/;
                 if(e.target.value.trim() !== '' && !regex.test(e.target.value)){
                     e.target.value = ''; // Clear if invalid
                     updateHiddenInput();
                 }
            });
        });
        // --- END: NEW LOGIC ---

        scheduleEditorContainer.appendChild(sessionDiv);
    };

    const loadSchedule = (scheduleData) => {
        scheduleEditorContainer.innerHTML = '';
        if (Array.isArray(scheduleData)) {
            scheduleData.forEach((session, index) => renderSessionItem(session, index + 1));
        }
    };

    const serializeSchedule = () => {
        const sessions = [];
        scheduleEditorContainer.querySelectorAll('.schedule-item').forEach(item => {
            const sessionData = {};
            item.querySelectorAll('input').forEach(input => {
                sessionData[input.dataset.key] = input.value.trim();
            });
            if (Object.values(sessionData).some(val => val)) {
                sessions.push(sessionData);
            }
        });
        scheduleTextarea.value = JSON.stringify(sessions, null, 2);
    };

    if (addSessionBtn) {
        addSessionBtn.addEventListener('click', () => {
            renderSessionItem();
        });
    }

    if (scheduleEditorContainer) {
        scheduleEditorContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const item = btn.closest('.schedule-item');
            if (!item) return;

            if (btn.classList.contains('delete-session-btn')) {
                item.remove();
                reorderSessionNumbers();
            }
        });
    }
    // END: Editor Logic

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
        visualEditorContainer.innerHTML = '';
        contentTextarea.value = '';
        scheduleEditorContainer.innerHTML = '';
        scheduleTextarea.value = '';
        eventForm.scrollIntoView({ behavior: 'smooth' });
    };

    eventForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        serializeEventEditor();
        serializeSchedule();
        const statusBox = eventForm.querySelector('.form-status');
        const isEditing = !!eventBeingEdited;
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
                } else if (isEditing) {
                    [startDate, endDate] = [eventBeingEdited.startDate, eventBeingEdited.endDate];
                }

                let [regStartDate, regEndDate] = [null, null];
                if (regDateRangePicker.selectedDates.length === 2) {
                    [regStartDate, regEndDate] = [formatForSupabase(regDateRangePicker.selectedDates[0]), formatForSupabase(regDateRangePicker.selectedDates[1])];
                } else if (isEditing) {
                    [regStartDate, regEndDate] = [eventBeingEdited.registrationStartDate, eventBeingEdited.registrationEndDate];
                }
                
                let displayDateValue = formData.get('displayDate');
                if (!displayDateValue && isEditing) {
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
                    finalImageUrl = await renameEventImage(tempPath, eventBeingEdited.id, rawSlug);
                }
                
                eventData.image = finalImageUrl;
                eventData.detailPage = `#/events/${eventBeingEdited.id}-${rawSlug}`;
                await updateEvent(eventBeingEdited.id, eventData);

                if (imageUrlToDelete) {
                    await deleteEventImage(imageUrlToDelete);
                }

                showStatus(statusBox, 'رویداد با موفقیت ویرایش شد.', 'success');
                setTimeout(() => { hideStatus(statusBox); resetForm(); }, 4000);
            } else {
                if (!imageFile) throw new Error("تصویر رویداد الزامی است.");
                const { publicUrl: tempUrl, filePath: tempPath } = await uploadEventImage(imageFile, rawSlug);
                eventData.image = tempUrl;
                delete eventData.detailPage;
                const { data: newEvent } = await addEvent(eventData);
                const finalImageUrl = await renameEventImage(tempPath, newEvent.id, rawSlug);
                await updateEvent(newEvent.id, { image: finalImageUrl, detailPage: `#/events/${newEvent.id}-${rawSlug}` });
                showStatus(statusBox, 'رویداد با موفقیت افزوده شد.', 'success');
                setTimeout(() => { hideStatus(statusBox); resetForm(); }, 4000);
            }
            state.allEvents = await loadEvents();
            renderEventsList(state.allEvents);
        } catch (error) {
            showStatus(statusBox, `عملیات با خطا مواجه شد: ${error.message}`, 'error');
            setTimeout(() => hideStatus(statusBox), 4000);
        } finally {
            submitBtn.disabled = false;
            if (isEditing) {
                submitBtn.textContent = 'ذخیره تغییرات';
            }
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
                const contactInfo = eventToEdit.contact_link || {};
                contactPhoneInput.value = contactInfo.phone || '';
                contactTelegramInput.value = contactInfo.telegram || '';
                contactWhatsappInput.value = contactInfo.whatsapp || '';
                const paymentInfo = eventToEdit.payment_card_number || {};
                document.getElementById('payment-name').value = paymentInfo.name || '';
                paymentNumberInput.value = paymentInfo.number || '';
                
                loadEventInEditor(eventToEdit);
                loadSchedule(eventToEdit.schedule);

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
        renderer: renderMessages,
        initializer: initializeMessagesModule
    },
    '/admin/news': {
        title: 'مدیریت اخبار',
        html: 'admin-news.html',
        loader: () => Promise.all([loadNews(), loadTags(), loadMembers()]),
        renderer: renderNewsList, // CORRECTED: No longer wraps in (data) => func(data[0])
        initializer: initializeNewsModule
    },
    '/admin/journal': {
        title: 'مدیریت نشریه',
        html: 'admin-journal.html',
        loader: () => loadJournal(),
        renderer: renderJournalList,
        initializer: initializeJournalModule
    },
    '/admin/events': {
        title: 'مدیریت رویدادها',
        html: 'admin-events.html',
        loader: () => Promise.all([loadEvents(), loadTags()]),
        renderer: renderEventsList, // CORRECTED: No longer wraps in (data) => func(data[0])
        initializer: initializeEventsModule
    },
    '/admin/registrations': {
        title: 'مدیریت ثبت‌نام‌ها',
        html: 'admin-registrations.html',
        loader: () => Promise.all([loadRegistrations(), loadEvents()]),
        renderer: renderRegistrationsList, // CORRECTED: No longer wraps in (data) => func(data[0])
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
    
    if (adminPreviewInterval) {
        clearInterval(adminPreviewInterval);
        adminPreviewInterval = null;
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
                // This logic correctly extracts the primary data array (e.g., events, news)
                const dataToRender = (path === '/admin/events' || path === '/admin/registrations' || path === '/admin/news') 
                    ? data[0] 
                    : data;
                route.renderer(dataToRender);
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
    initializeUploaderModal(); 

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