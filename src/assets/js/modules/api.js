// src/assets/js/modules/api.js

import { state, dom } from './state.js';

// --- Supabase Initialization ---
const supabaseUrl = 'https://vgecvbadhoxijspowemu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZWN2YmFkaG94aWpzcG93ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDI5MjksImV4cCI6MjA2OTAxODkyOX0.4XW_7NUcidoa9nOGO5BrJvreITjg-vuUzsQbSH87eaU'; // کلید anon public خود را اینجا قرار دهید

// کلاینت را ساخته و آن را برای استفاده در فایل‌های دیگر export می‌کنیم
export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);


// --- Data Fetching ---
export const loadInitialData = async () => {
    try {
        const [
            { data: members, error: membersError },

            { data: events, error: eventsError },
            { data: journal, error: journalError },
            { data: courses, error: coursesError },
            { data: coursePrerequisites, error: prereqError }
        ] = await Promise.all([
            supabaseClient.from('members').select('*'),

            supabaseClient.from('events').select('*'),
            supabaseClient.from('journal').select('*'),
            supabaseClient.from('courses').select('*').order('id'),
            supabaseClient.from('course_prerequisites').select('*')
        ]);

        if (membersError) throw membersError;

        if (eventsError) throw eventsError;
        if (journalError) throw journalError;
        if (coursesError) throw coursesError;
        if (prereqError) throw prereqError;

        members.forEach(member => state.membersMap.set(member.id, member));
        
        state.allEvents = events || [];
        state.allJournalIssues = journal || [];
        state.allCourses = courses || [];
        state.coursePrerequisites = coursePrerequisites || [];

    } catch (error) {
        console.error("Failed to load initial data from Supabase:", error);
        if (dom.mainContent) {
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا در بارگذاری اطلاعات از سرور. لطفا صفحه را رفرش کنید.</p><p style="font-size: 0.8rem; color: #888;">${error.message}</p></div>`;
        }
    }
};