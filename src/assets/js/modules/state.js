// State management for the application
export const state = {
    // User session
    user: null,
    session: null,
    profile: null,

    // Data stores
    allNews: [],
    membersMap: new Map(),
    tagsMap: new Map(),
    userRegistrations: new Map(),
    allEvents: [],
    allJournalIssues: [], 
    allCourses: [], 
    coursePrerequisites: [], 
    allContacts: [], 

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

// DOM elements
export const dom = {
    body: document.body,
    mainContent: document.querySelector('main'),
};