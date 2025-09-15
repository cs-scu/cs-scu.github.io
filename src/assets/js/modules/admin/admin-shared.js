import { state } from './state.js';
import { supabaseClient, loadTags, addTag, updateTag, deleteTag } from './api.js';

// --- Helper Functions ---
const toPersianNumber = (n) => {
    if (n === null || n === undefined) return '';
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/[0-9]/g, (digit) => persianNumbers[digit]);
};

// --- Tag Modal Logic ---
export const initializeSharedTagModal = () => {
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

// --- File Uploader Modal Logic ---
export const initializeUploaderModal = () => {
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
    const backBtn = document.getElementById('file-browser-back-btn');
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
                return sortOptions.order === 'asc' ? sizeA - sizeB : sizeB - a;
            });
        }

        renderFiles(data);
        renderBreadcrumbs(currentPath);
    };

    const navigateTo = (path) => {
        currentPath = path;
        backBtn.disabled = path === '';
        deselectItem();
        fetchFiles();
    };

    const deselectItem = () => {
        const selected = fileListContainer.querySelector('.selected');
        if (selected) selected.classList.remove('selected');
        selectedItem = null;
        selectedFileInfo.textContent = 'No file selected';
        copySelectedLinkBtn.disabled = true;
        copySelectedLinkBtn.title = 'Select a file to copy its link';
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

        if (selectedItem.isFolder) {
            copySelectedLinkBtn.title = 'Cannot copy link for a folder';
        } else {
            copySelectedLinkBtn.title = 'Copy Link';
        }
    };
    
    const handleFileDoubleClick = (e) => {
        const target = e.target.closest('tr[data-name]');
        if (!target) return;

        if (target.dataset.isFolder === 'true') {
            navigateTo(`${currentPath}${target.dataset.name}/`);
        } else if (target.dataset.isImage === 'true' && lightboxOverlay && lightboxImage) {
            const { data: { publicUrl } } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(`${currentPath}${target.dataset.name}`);
            lightboxImage.src = publicUrl;
            lightboxOverlay.classList.add('visible');
        }
    };
    
    const closeLightbox = () => {
        if (lightboxOverlay && lightboxImage) {
            lightboxOverlay.classList.remove('visible');
            lightboxImage.src = '';
        }
    };

    const handleCreateFolder = async () => {
        const folderName = prompt("نام پوشه جدید را وارد کنید:");
        if (!folderName || folderName.includes('/')) return;
        const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(`${currentPath}${folderName}/.placeholder`, new Blob(['']));
        if (error) alert(`خطا: ${error.message}`);
        else fetchFiles();
    };

    const handleFileUpload = async (files) => {
        // Get Supabase credentials from the existing client
        const supabaseUrl = supabaseClient.storage.url;
        const supabaseKey = supabaseClient.storage.headers.apikey;

        // Get the current user session to ensure authentication
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            console.error('Authentication Error:', sessionError?.message || 'No active session');
            alert('خطای احراز هویت. لطفاً دوباره وارد شوید.');
            return;
        }

        const accessToken = session.access_token;
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

        for (const file of files) {
            // --- START: SECURITY FIX ---
            // 1. Validate file type before processing
            if (!allowedImageTypes.includes(file.type)) {
                alert(`خطا: فرمت فایل "${file.name}" مجاز نیست. فقط فایل‌های تصویری (jpeg, png, gif, webp, svg) پذیرفته می‌شوند.`);
                continue; // Skip this file and move to the next one
            }
            // --- END: SECURITY FIX ---

            const progressId = `progress-${file.name}-${Date.now()}`;
            const progressElement = document.createElement('div');
            progressElement.id = progressId;
            progressElement.className = 'upload-progress-container';
            progressElement.innerHTML = `
                <div class="file-info">
                    <span>${file.name}</span>
                    <span class="upload-percentage">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-inner"></div>
                </div>`;
            uploadProgressArea.appendChild(progressElement);

            const percentageSpan = progressElement.querySelector('.upload-percentage');
            const progressBarInner = progressElement.querySelector('.progress-bar-inner');

            const xhr = new XMLHttpRequest();
            const filePath = `${currentPath}${file.name}`;
            const uploadUrl = `${supabaseUrl}/object/${BUCKET_NAME}/${filePath}`;

            xhr.open('POST', uploadUrl, true);

            xhr.setRequestHeader('apikey', supabaseKey);
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
            xhr.setRequestHeader('x-upsert', 'false');
            // Set content type from validated file type
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    if (percentageSpan && progressBarInner) {
                        percentageSpan.textContent = `${percentComplete}%`;
                        progressBarInner.style.width = `${percentComplete}%`;
                    }
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (percentageSpan && progressBarInner) {
                        percentageSpan.textContent = 'کامل شد';
                        progressBarInner.style.backgroundColor = 'var(--primary-color-light-theme)';
                        if(document.body.classList.contains('dark-theme')) {
                            progressBarInner.style.backgroundColor = 'var(--primary-color)';
                        }
                    }
                    setTimeout(() => progressElement.remove(), 5000);
                    fetchFiles(); // Refresh file list
                } else {
                    console.error('Upload failed:', xhr.responseText);
                    if (percentageSpan && progressBarInner) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.message === 'Invalid JWT' || response.error === 'Invalid JWT') {
                                percentageSpan.textContent = `خطا: نشست نامعتبر. لطفاً دوباره وارد شوید.`;
                            } else {
                                percentageSpan.textContent = `خطا: ${response.message || 'Upload failed'}`;
                            }
                        } catch (e) {
                            percentageSpan.textContent = `خطا: ${xhr.statusText}`;
                        }
                        percentageSpan.style.color = '#dc3545';
                        progressBarInner.style.backgroundColor = '#dc3545';
                    }
                }
            };

            xhr.onerror = () => {
                console.error('Network error during upload.');
                if (percentageSpan && progressBarInner) {
                    percentageSpan.textContent = 'خطای شبکه';
                    percentageSpan.style.color = '#dc3545';
                    progressBarInner.style.backgroundColor = '#dc3545';
                }
            };

            xhr.send(file);
        }
    };
    
    const handleSortChange = () => {
        sortOptions.column = sortBySelect.value;
        sortOptions.order = sortOrderBtn.classList.contains('asc') ? 'asc' : 'desc';
        fetchFiles();
    };
    
    const showContextMenu = (e) => {
        e.preventDefault();
        const target = e.target.closest('tr[data-name]');
        if (!target || !contextMenu) return; // Add null check for contextMenu
        handleFileClick({ target, detail: 1 });
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
    };
    
    const hideContextMenu = () => { if(contextMenu) contextMenu.style.display = 'none'; };

    const handleGoBack = () => {
        if (currentPath === '') return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        const newPath = parts.join('/') + (parts.length > 0 ? '/' : '');
        navigateTo(newPath);
    };

    // --- ATTACHING LISTENERS ---
    backBtn.addEventListener('click', handleGoBack);
    openUploaderBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    uploaderModal.addEventListener('click', (e) => { if (e.target === uploaderModal) closeModal(); });
    fileListContainer.addEventListener('click', handleFileClick);
    fileListContainer.addEventListener('dblclick', handleFileDoubleClick);
    fileListContainer.addEventListener('contextmenu', showContextMenu);
    breadcrumbsContainer.addEventListener('click', (e) => { 
        const breadcrumbItem = e.target.closest('.breadcrumb-item');
        if (breadcrumbItem) navigateTo(breadcrumbItem.dataset.path); 
    });
    createFolderBtn.addEventListener('click', handleCreateFolder);
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
    
    // START: Robust Context Menu Listener
    if (contextMenu) {
        contextMenu.addEventListener('click', (e) => { 
            if(e.target.dataset.action) hideContextMenu(); 
        });
    }
    // END: Robust Context Menu Listener

    // START: Robust Lightbox Listener Attachment
    if (lightboxOverlay) {
        const lightboxCloseBtn = lightboxOverlay.querySelector('.lightbox-close-btn');
        if (lightboxCloseBtn) {
            lightboxCloseBtn.addEventListener('click', closeLightbox);
        }
        lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === lightboxOverlay) {
                closeLightbox();
            }
        });
    }
    // END: Robust Lightbox Listener Attachment
    
    ['dragenter','dragover','dragleave','drop'].forEach(ev=>fileListContainer.addEventListener(ev, e=>{e.preventDefault();e.stopPropagation();}));
    ['dragenter','dragover'].forEach(ev=>fileListContainer.addEventListener(ev,()=>fileListContainer.classList.add('is-dragging')));
    ['dragleave','drop'].forEach(ev=>fileListContainer.addEventListener(ev,()=>fileListContainer.classList.remove('is-dragging')));
    fileListContainer.addEventListener('drop', (e) => handleFileUpload(e.dataTransfer.files));
};