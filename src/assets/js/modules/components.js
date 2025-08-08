// src/assets/js/modules/components.js

import { state, dom } from './state.js';
import { supabaseClient, getBaseUrl } from './api.js';

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

const renderNewsItems = (items) => {
    const newsList = dom.mainContent.querySelector('.news-list');
    const template = document.getElementById('news-item-template');
    if (!newsList || !template) return;

    // Remove skeletons before adding real content
    newsList.querySelectorAll('.is-skeleton').forEach(el => el.remove());

    items.forEach(item => {
        const cardClone = template.content.cloneNode(true);
        const author = state.membersMap.get(item.authorId);

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

        const tagsContainer = cardClone.querySelector('.news-item-tags');
        if (tagsContainer && item.tags && Array.isArray(item.tags)) {
            tagsContainer.innerHTML = '';
            item.tags.forEach(([text, color]) => {
                const tagEl = document.createElement('span');
                tagEl.className = 'news-tag';
                tagEl.textContent = text;
                tagEl.style.backgroundColor = color;
                tagsContainer.appendChild(tagEl);
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
        .select('*')
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

    // تبدیل Map به آرایه، مرتب‌سازی بر اساس ID و سپس نمایش
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

    const upcomingEvents = state.allEvents.filter(event => new Date(event.endDate) >= today)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const pastEvents = state.allEvents.filter(event => new Date(event.endDate) < today)
        .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    const upcomingGrid = dom.mainContent.querySelector('#upcoming .events-grid');
    const pastGrid = dom.mainContent.querySelector('#past .events-grid');
    const template = document.getElementById('event-card-template');

    if (!upcomingGrid || !pastGrid || !template) return;
    
    const moveHighlighter = (activeTab) => {
        const highlighter = document.querySelector('.tabs-container .highlighter');
        if (!highlighter || !activeTab) return;
        highlighter.style.width = `${activeTab.offsetWidth}px`;
        highlighter.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    };
    
    // This internal function now includes logic for displaying the instructor
    const populateGrid = (grid, events, isPast = false) => {
        grid.innerHTML = '';
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
            
            let parsedTags = [];
            if (typeof event.tags === 'string') {
                try {
                    parsedTags = JSON.parse(event.tags);
                } catch (e) {
                    console.error('Failed to parse event tags:', event.tags, e);
                }
            } else if (Array.isArray(event.tags)) {
                parsedTags = event.tags;
            }

            if (Array.isArray(parsedTags)) {
                parsedTags.forEach(([text, color]) => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'news-tag';
                    tagEl.textContent = text;
                    tagEl.style.backgroundColor = color;
                    tagsContainer.appendChild(tagEl);
                });
            }
    
            card.querySelector('.event-card-title-link').href = event.detailPage;
            card.querySelector('.event-card-title').textContent = event.title;
            card.querySelector('.event-card-summary').textContent = event.summary;
    
            const metaContainer = card.querySelector('.event-meta');
            
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
                } else {
                    mainButton.textContent = 'ثبت‌نام';
                }
            } else {
                mainButton = document.createElement('a');
                mainButton.href = event.detailPage;
                mainButton.className = 'btn btn-secondary';
                mainButton.textContent = 'اطلاعات بیشتر';
                 if (isPast) {
                    mainButton.classList.add('disabled'); // Make it look disabled
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

export const renderJournalPage = () => {
    const journalGrid = dom.mainContent.querySelector('.journal-grid');
    if (!journalGrid) return;
    journalGrid.innerHTML = '';

    state.allJournalIssues.forEach(issue => {
        const cardHTML = `
            <a href="${issue.fileUrl}" target="_blank" class="journal-card">
                <img src="${issue.coverUrl}" alt="${issue.title}" class="journal-card-cover" loading="lazy">
                <div class="journal-card-overlay">
                    <h3 class="journal-card-title">${issue.title}</h3>
                    <p class="journal-card-date">${issue.date}</p>
                    <p class="journal-card-summary">${issue.summary}</p>
                </div>
                <div class="journal-card-download">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </div>
            </a>
        `;
        journalGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
};

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