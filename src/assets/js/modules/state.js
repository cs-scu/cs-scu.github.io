// js/modules/state.js
export const state = {
    // Data stores
    allNews: [],
    membersMap: new Map(),
    allEvents: [],
    allJournalIssues: [],
    allCourses: [],
    coursePrerequisites: [],
    
    // Page cache
    pageCache: {},
    
    // Instances
    particlesInstance: null,
    
    // News page state
    loadedNewsCount: 0,
    NEWS_PER_PAGE: 10,
    isLoadingNews: false,
    newsScrollHandler: null
};

export const dom = {
    body: document.body,
    mainContent: document.querySelector('main'),
    // ... می‌توانید سایر عناصر DOM پرکاربرد را اینجا اضافه کنید
};