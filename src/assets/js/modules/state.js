// js/modules/state.js
export const state = {
    // Auth state
    user: null,
    session: null,
    profile: null, // برای نگهداری اطلاعات پروفایل کاربر

    // Data stores
    allNews: [],
    membersMap: new Map(),
    tagsMap: new Map(), // <-- این خط اضافه شود
    allEvents: [],
    allJournalIssues: [],
    allCourses: [],
    coursePrerequisites: [],
    allContacts: [], // <-- این خط اضافه شود

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
};