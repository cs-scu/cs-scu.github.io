// src/assets/js/modules/components.js

import { state, dom } from './state.js';
import { supabaseClient, getBaseUrl } from './api.js';
import { initializeAuthForm, initializeContactForm, showEventModal, initializeInteractions, renderInteractionsSection, showProfileModal } from './ui.js';

const DEFAULT_AVATAR_URL = `https://vgecvbadhoxijspowemu.supabase.co/storage/v1/object/public/assets/images/members/default-avatar.png`;

// --- توابع کمکی خصوصی ---
const createAuthorHTML = (authorId) => {
    if (!authorId) return '';
    const authorInfo = state.membersMap.get(authorId);
    if (!authorInfo) return '';
    return `
        <div class="news-item-author clickable-author" data-author-id="${authorInfo.id}">
            <img src="${authorInfo.imageUrl || DEFAULT_AVATAR_URL}" alt="${authorInfo.name}" class="author-photo" loading="lazy">
            <span class="author-name">${authorInfo.name}</span>
        </div>
    `;
};

const renderSkeletons = (count, container) => {
    let skeletonHTML = '';
    for (let i = 0; i < count; i++) {
        skeletonHTML += `
            <article class="news-list-item is-skeleton">
                <div class="news-item-image"></div>
                <div class="news-item-content">
                    <div class="news-item-header">
                        <h3 class="news-item-title"></h3>
                    </div>
                    <p class="news-item-summary"></p>
                    <div class="news-item-footer">
                        <div class="news-item-author"></div>
                        <div class="news-item-meta"></div>
                    </div>
                </div>
            </article>
        `;
    }
    container.innerHTML = skeletonHTML;
};


// --- توابع رندرکننده عمومی ---
export const loadLatestNews = () => {
    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;
    newsGrid.innerHTML = '';

    (async () => {
        const { data: latestNews, error } = await supabaseClient
            .from('news')
            .select('*')
            .order('id', { ascending: false })
            .range(0, 2);

        if (error || !latestNews) {
            console.error("Could not load latest news", error);
            return;
        }

        latestNews.forEach(item => {
            const author = state.membersMap.get(item.authorId);
            const authorName = author ? author.name : 'نویسنده';
            const authorImage = author ? (author.imageUrl || DEFAULT_AVATAR_URL) : DEFAULT_AVATAR_URL;

            const newsCardHTML = `
                <article class="news-card">
                    <a href="${item.link}" class="news-card-image-link">
                        <img src="${item.image}" alt="${item.title}" loading="lazy">
                    </a>
                    <div class="news-card-content">
                        <a href="${item.link}"><h3>${item.title}</h3></a>
                        <p>${item.summary}</p>
                        <div class="news-card-footer">
                             <div class="news-item-author clickable-author" data-author-id="${item.authorId}">
                                <img src="${authorImage}" alt="${authorName}" class="author-photo" loading="lazy">
                             </div>
                            <span class="news-meta">${item.date}</span>
                        </div>
                    </div>
                </article>
            `;
            newsGrid.insertAdjacentHTML('beforeend', newsCardHTML);
        });
    })();
};

const toPersianNumber = (n) => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/[0-9]/g, (digit) => persianNumbers[digit]);
};


const renderNewsItems = (items) => {
    const newsList = dom.mainContent.querySelector('.news-list');
    const template = document.getElementById('news-item-template');
    if (!newsList || !template) return;

    newsList.querySelectorAll('.is-skeleton').forEach(el => el.remove());

    items.forEach(item => {
        const cardClone = template.content.cloneNode(true);

        const img = cardClone.querySelector('.news-item-image');
        img.src = item.image;
        img.alt = item.title;
        img.loading = 'lazy';

        cardClone.querySelector('.news-item-image-link').href = item.link;
        cardClone.querySelector('.news-item-title').textContent = item.title;
        cardClone.querySelector('.news-item-title-link').href = item.link;
        cardClone.querySelector('.news-item-summary').textContent = item.summary;
        cardClone.querySelector('.news-item-date').textContent = item.date;
        cardClone.querySelector('.news-item-author').innerHTML = createAuthorHTML(item.authorId);
        
        const commentsCount = item.comments[0]?.count || 0;
        const likesCount = item.likes[0]?.count || 0;
        
        cardClone.querySelector('.news-item-comments .count').textContent = toPersianNumber(commentsCount);
        cardClone.querySelector('.news-item-likes .count').textContent = toPersianNumber(likesCount);

        // --- بخش اصلاح شده برای نمایش تگ‌ها ---
        const tagsContainer = cardClone.querySelector('.news-item-tags');
        if (tagsContainer && item.tag_ids && Array.isArray(item.tag_ids)) {
            tagsContainer.innerHTML = '';
            item.tag_ids.forEach(tagId => {
                const tagName = state.tagsMap.get(tagId); // خواندن نام تگ از حافظه
                if (tagName) {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'news-tag';
                    tagEl.textContent = tagName;
                    tagsContainer.appendChild(tagEl);
                }
            });
        }
        
        newsList.appendChild(cardClone);
    });
};
export const loadMoreNews = async () => {
    if (state.isLoadingNews) return;
    state.isLoadingNews = true;

    const loader = dom.mainContent.querySelector('#news-loader');
    const newsList = dom.mainContent.querySelector('.news-list');

    if (state.loadedNewsCount === 0) {
        renderSkeletons(5, newsList);
    } else {
        if (loader) {
            loader.textContent = "در حال بارگذاری...";
            loader.style.display = 'block';
        }
    }

    const from = state.loadedNewsCount;
    const to = from + state.NEWS_PER_PAGE - 1;

    const { data: newsToLoad, error } = await supabaseClient
        .from('news')
        .select('*, likes(count), comments(count), tag_ids')
        .order('id', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching more news:", error);
        if (loader) loader.textContent = "خطا در بارگذاری اخبار.";
        state.isLoadingNews = false;
        return;
    }

    if (newsToLoad && newsToLoad.length > 0) {
        renderNewsItems(newsToLoad);
        state.loadedNewsCount += newsToLoad.length;
    }
    
    if (loader) loader.style.display = 'none';
    state.isLoadingNews = false;

    if (!newsToLoad || newsToLoad.length < state.NEWS_PER_PAGE) {
        if (state.newsScrollHandler) {
            window.removeEventListener('scroll', state.newsScrollHandler);
            state.newsScrollHandler = null;
        }
        if (loader) {
            loader.textContent = "پایان لیست اخبار";
            loader.style.display = 'block';
        }
    }
};


export const renderMembersPage = () => {
    const membersGrid = dom.mainContent.querySelector('.members-grid');
    const template = document.getElementById('member-card-template');
    if (!membersGrid || !template) return;
    membersGrid.innerHTML = '';

    const membersArray = Array.from(state.membersMap.values());
    membersArray.sort((a, b) => a.id - b.id);

    membersArray.forEach(member => {
        const cardClone = template.content.cloneNode(true);
        const img = cardClone.querySelector('.member-photo');
        img.src = member.imageUrl || DEFAULT_AVATAR_URL;
        img.alt = member.name;
        img.loading = 'lazy';

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
        membersGrid.appendChild(cardClone);
    });
};

export const renderEventsPage = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // فیلتر کردن رویدادها به دو دسته پیش رو و گذشته و مرتب‌سازی آن‌ها
    const upcomingEvents = state.allEvents.filter(event => new Date(event.endDate) >= today)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const pastEvents = state.allEvents.filter(event => new Date(event.endDate) < today)
        .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    const upcomingGrid = dom.mainContent.querySelector('#upcoming .events-grid');
    const pastGrid = dom.mainContent.querySelector('#past .events-grid');
    const template = document.getElementById('event-card-template');

    if (!upcomingGrid || !pastGrid || !template) return;
    
    // تابع برای جابجایی هایلایت زیر تب‌های فعال
    const moveHighlighter = (activeTab) => {
        const highlighter = document.querySelector('.tabs-container .highlighter');
        if (!highlighter || !activeTab) return;
        highlighter.style.width = `${activeTab.offsetWidth}px`;
        highlighter.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    };
    
    // تابع اصلی برای ساخت و نمایش کارت‌های رویداد در یک گرید مشخص
    const populateGrid = (grid, events, isPast = false) => {
        grid.innerHTML = ''; // پاک کردن محتوای قبلی
        if (events.length === 0) {
            grid.innerHTML = '<p class="no-events-message">در حال حاضر رویدادی در این دسته وجود ندارد.</p>';
            return;
        }
        events.forEach(event => {
            const cardElement = template.content.cloneNode(true);
            const card = cardElement.querySelector('.event-card');
            
            if (isPast) {
                card.classList.add('past-event');
            }

            card.querySelector('.event-card-image-link').href = event.detailPage;
            
            const img = card.querySelector('.event-card-image');
            img.src = event.image;
            img.alt = event.title;
            img.loading = 'lazy';
    
            const tagsContainer = card.querySelector('.event-card-tags');
            tagsContainer.innerHTML = '';
            
            if (event.tag_ids && Array.isArray(event.tag_ids)) {
                event.tag_ids.forEach(tagId => {
                    const tagName = state.tagsMap.get(tagId);
                    if (tagName) {
                        const tagEl = document.createElement('span');
                        tagEl.className = 'news-tag';
                        tagEl.textContent = tagName;
                        tagsContainer.appendChild(tagEl);
                    }
                });
            }
    
            card.querySelector('.event-card-title-link').href = event.detailPage;
            card.querySelector('.event-card-title').textContent = event.title;
            card.querySelector('.event-card-summary').textContent = event.summary;
    
            const metaContainer = card.querySelector('.event-meta');
            
            const isUnlimited = event.capacity === -1;
            const remainingCapacity = isUnlimited ? 'نامحدود' : toPersianNumber(event.capacity - event.registrations_count);
            const isFull = !isUnlimited && (event.capacity - event.registrations_count <= 0);

            const capacityHTML = `
                <span class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>ظرفیت باقی‌مانده: ${isFull ? 'تکمیل' : remainingCapacity}</span>
                </span>`;
            
            const instructorHTML = event.instructor_name 
                ? `
                <span class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>مدرس: ${event.instructor_name}</span>
                </span>`
                : '';

            const costHTML = (event.cost && event.cost.trim() !== "") ? `
                <span class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                        <path d="M12 18V6"></path>
                        </svg>
                    <span>${event.cost}</span>
                </span>` : '';

            metaContainer.innerHTML = `
                ${instructorHTML}
                <span class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>${event.displayDate}</span>
                </span>
                <span class="event-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>${event.location}</span>
                </span>
                ${costHTML}
                ${capacityHTML}
            `;
    
            const actionsContainer = card.querySelector('.event-actions');
            actionsContainer.innerHTML = '';

            let scheduleData = [];
            if (event.schedule) {
                try {
                    scheduleData = typeof event.schedule === 'string' ? JSON.parse(event.schedule) : event.schedule;
                } catch (e) {
                    console.error("Could not parse schedule JSON in card render:", e);
                }
            }
            if (Array.isArray(scheduleData) && scheduleData.length > 0) {
                const scheduleButton = document.createElement('button');
                scheduleButton.className = 'btn btn-secondary btn-view-schedule';
                scheduleButton.textContent = 'برنامه زمانی';
                scheduleButton.dataset.eventId = event.id;
                if (isPast) {
                    scheduleButton.disabled = true;
                }
                actionsContainer.appendChild(scheduleButton);
            }
            
            let mainButton;
            if (event.registrationLink) {
                mainButton = document.createElement('button');
                mainButton.className = 'btn btn-primary btn-event-register';
                mainButton.dataset.eventId = event.id;
                
                if (isPast) {
                    mainButton.textContent = 'پایان یافته';
                    mainButton.classList.add('disabled');
                    mainButton.disabled = true;
                } else if (isFull) {
                    mainButton.textContent = 'ظرفیت تکمیل';
                    mainButton.classList.add('disabled');
                    mainButton.disabled = true;
                } else {
                    mainButton.textContent = 'ثبت‌نام';
                }
            } else {
                mainButton = document.createElement('a');
                mainButton.href = event.detailPage;
                mainButton.className = 'btn btn-secondary';
                mainButton.textContent = 'اطلاعات بیشتر';
                 if (isPast) {
                    mainButton.classList.add('disabled');
                }
            }
            actionsContainer.appendChild(mainButton);
    
            grid.appendChild(cardElement);
        });
    };
    
    populateGrid(upcomingGrid, upcomingEvents, false);
    populateGrid(pastGrid, pastEvents, true);

    dom.mainContent.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            dom.mainContent.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            dom.mainContent.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            dom.mainContent.querySelector(`#${tabId}`).classList.add('active');
            moveHighlighter(button);
        });
    });
    
    const initiallyActiveTab = dom.mainContent.querySelector('.tab-link.active');
    if (initiallyActiveTab) {
        requestAnimationFrame(() => {
            moveHighlighter(initiallyActiveTab);
        });
    }
};

// --- START: UPDATED FUNCTION ---
export const renderJournalPage = () => {
    const journalGrid = dom.mainContent.querySelector('.journal-grid');
    if (!journalGrid) return;
    journalGrid.innerHTML = '';

    state.allJournalIssues.forEach(issue => {
        // Sanitize the title to create a safe and valid filename
        const safeTitle = issue.title.replace(/[^a-zA-Z0-9\s-_\u0600-\u06FF]/g, '').trim() || 'journal';
        const fileExtension = issue.fileUrl ? issue.fileUrl.split('.').pop() : 'pdf';

        const cardHTML = `
            <div class="journal-card" 
                 data-file-url="${issue.fileUrl}" 
                 data-file-title="${safeTitle}.${fileExtension}" 
                 role="button" 
                 tabindex="0" 
                 aria-label="دانلود ${issue.title}">
                <img src="${issue.coverUrl}" alt="${issue.title}" class="journal-card-cover" loading="lazy">
                <div class="journal-card-overlay">
                    <h3 class="journal-card-title">${issue.title}</h3>
                    <p class="journal-card-date">${issue.date}</p>
                    <p class="journal-card-summary">${issue.summary}</p>
                </div>
                <div class="journal-card-download">
                    <svg class="icon-download" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <svg class="icon-loading" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                </div>
            </div>
        `;
        journalGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
};

// --- NEW FUNCTION TO HANDLE DOWNLOADS ---
export const initializeJournalPageInteractions = () => {
    const journalGrid = document.querySelector('.journal-grid');
    if (!journalGrid) return;

    journalGrid.addEventListener('click', async (e) => {
        const card = e.target.closest('.journal-card');
        if (!card || card.classList.contains('is-downloading')) return;

        const fileUrl = card.dataset.fileUrl;
        const fileName = card.dataset.fileTitle;

        if (!fileUrl) return;

        const downloadIcon = card.querySelector('.icon-download');
        const loadingIcon = card.querySelector('.icon-loading');

        // Show loading state and prevent multiple clicks
        card.classList.add('is-downloading');
        if (downloadIcon) downloadIcon.style.display = 'none';
        if (loadingIcon) loadingIcon.style.display = 'block';

        try {
            // Fetch the file as a blob
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const blob = await response.blob();

            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // Clean up the temporary link
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error('Download failed:', error);
            alert('خطا در دانلود فایل. لطفاً دوباره تلاش کنید.');
        } finally {
            // Reset to initial state
            card.classList.remove('is-downloading');
            if (downloadIcon) downloadIcon.style.display = 'block';
            if (loadingIcon) loadingIcon.style.display = 'none';
        }
    });
};
// --- END: NEW FUNCTION & UPDATE ---

export const renderChartPage = () => {
    const container = dom.mainContent.querySelector('.semesters-container');
    if (!container) return;
    container.innerHTML = '';

    const coursesBySemester = state.allCourses
    .filter(course => course.semester !== 9)
    .reduce((acc, course) => {
        (acc[course.semester] = acc[course.semester] || []).push(course);
        return acc;
    }, {});

    const courseMap = new Map(state.allCourses.map(c => [c.id, c.name]));
    const prerequisitesMap = state.coursePrerequisites.reduce((acc, edge) => {
        if (!acc[edge.to]) acc[edge.to] = [];
        const prerequisiteName = courseMap.get(edge.from);
        if (prerequisiteName) {
            acc[edge.to].push(prerequisiteName);
        }
        return acc;
    }, {});

    Object.keys(coursesBySemester).sort((a,b) => a-b).forEach(semester => {
        const semesterDiv = document.createElement('div');
        semesterDiv.className = 'semester-column';
        const semesterTitle = document.createElement('h2');
        semesterTitle.textContent = `ترم ${semester}`;
        semesterDiv.appendChild(semesterTitle);

        coursesBySemester[semester].forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card-chart';
            
            const prerequisites = prerequisitesMap[course.id];
            
            let prerequisitesHTML = '';
            if (prerequisites && prerequisites.length > 0) {
                courseCard.classList.add('is-expandable');
                prerequisitesHTML = `
                    <div class="prerequisites-container">
                        <div class="prerequisites-content-wrapper">
                            <div class="prerequisite-title">پیش‌نیازها:</div>
                            ${prerequisites.map(pName => `
                                <div class="course-card-chart is-prereq">
                                    <div class="course-name">${pName}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            courseCard.innerHTML = `
                <div class="course-main-info">
                    <div class="course-details">
                        <div class="course-name">${course.name}</div>
                        <div class="course-units">${course.units} واحد</div>
                    </div>
                    ${(prerequisites && prerequisites.length > 0) ? '<div class="expand-icon"></div>' : ''}
                </div>
                ${prerequisitesHTML}
            `;
            semesterDiv.appendChild(courseCard);
        });
        container.appendChild(semesterDiv);
    });
};

export const renderAdminPage = () => {
    const wrapper = dom.mainContent.querySelector('#admin-content-wrapper');
    if (!wrapper) return;

    if (!state.allContacts || state.allContacts.length === 0) {
        wrapper.innerHTML = '<p style="text-align: center; opacity: 0.8;">پیام جدیدی برای نمایش وجود ندارد.</p>';
        return;
    }

    let tableHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>نام</th>
                        <th>ایمیل</th>
                        <th>پیام</th>
                        <th>تاریخ ارسال</th>
                    </tr>
                </thead>
                <tbody>
    `;

    state.allContacts.forEach(contact => {
        const messageDate = new Date(contact.created_at).toLocaleDateString('fa-IR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const safeName = (contact.name || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeEmail = (contact.email || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeMessage = (contact.message || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

        tableHTML += `
            <tr>
                <td>${safeName}</td>
                <td><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                <td class="message-cell">${safeMessage}</td>
                <td>${messageDate}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table></div>';
    wrapper.innerHTML = tableHTML;
};

export const renderJournalAdminList = () => {
    const container = dom.mainContent.querySelector('#journal-admin-list');
    if (!container) return;

    if (!state.allJournalIssues || state.allJournalIssues.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.8;">هنوز هیچ نشریه‌ای ثبت نشده است.</p>';
        return;
    }

    // مرتب‌سازی بر اساس جدیدترین
    const sortedIssues = state.allJournalIssues.sort((a, b) => b.id - a.id);

    container.innerHTML = `
        <div class="custom-table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>عنوان</th>
                        <th>تاریخ</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedIssues.map(issue => `
                        <tr>
                            <td>${issue.title}</td>
                            <td style="white-space: nowrap;">${issue.date}</td>
                            <td style="white-space: nowrap;">
                                <button class="btn btn-secondary btn-sm edit-journal-btn" data-id="${issue.id}">ویرایش</button>
                                <button class="btn btn-secondary btn-sm delete-journal-btn" data-id="${issue.id}" style="--bs-btn-bg: #dc3545; --bs-btn-border-color: #dc3545; --bs-btn-hover-bg: #bb2d3b; --bs-btn-hover-border-color: #b02a37; color: white;">حذف</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};