// src/assets/js/modules/api.js (نسخه نهایی و کامل)
import { state, dom } from './state.js';
import { supabase } from './supabaseClient.js';

export const loadInitialData = async () => {
    try {
        // از Promise.all برای خواندن همزمان تمام داده‌ها استفاده می‌کنیم
        const [
            { data: members, error: membersError },
            { data: news, error: newsError },
            { data: journal, error: journalError },
            { data: events, error: eventsError },
            { data: courses, error: coursesError },
            { data: prerequisites, error: prereqError }
        ] = await Promise.all([
            supabase.from('members').select('*'),
            supabase.from('news').select('*'),
            supabase.from('journal').select('*'),
            supabase.from('events').select('*'),
            supabase.from('courses').select('*'),
            supabase.from('course_prerequisites').select('*')
        ]);

        // چک کردن خطاها
        if (membersError) throw membersError;
        if (newsError) throw newsError;
        if (journalError) throw journalError;
        if (eventsError) throw eventsError;
        if (coursesError) throw coursesError;
        if (prereqError) throw prereqError;

        // ذخیره کردن تمام داده‌ها در state برنامه
        members.forEach(member => state.membersMap.set(member.id, member));
        state.allNews = news;
        state.allJournalIssues = journal;
        state.allEvents = events;
        state.allCourses = courses;
        state.coursePrerequisites = prerequisites;

        console.log("تمام اطلاعات سایت با موفقیت از Supabase خوانده شد!");

    } catch (error) {
        console.error("خطا در بارگذاری اطلاعات از Supabase:", error.message);
        if (dom.mainContent) {
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا در اتصال به سرور. لطفا صفحه را مجددا بارگذاری کنید.</p></div>`;
        }
    }
};