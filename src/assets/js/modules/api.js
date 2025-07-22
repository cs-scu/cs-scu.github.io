// js/modules/api.js
import { state, dom } from './state.js';

export const loadInitialData = async () => {
    try {
        const [membersResponse, newsResponse, eventsResponse, journalResponse] = await Promise.all([
            fetch('data/members.json'),
            fetch('data/news.json'),
            fetch('data/events.json'),
            fetch('data/journal.json')
        ]);

        if (!membersResponse.ok) throw new Error('فایل اعضا یافت نشد.');
        const members = await membersResponse.json();
        members.forEach(member => state.membersMap.set(member.id, member));

        if (!newsResponse.ok) throw new Error('فایل اخبار یافت نشد.');
        state.allNews = await newsResponse.json();

        if (!eventsResponse.ok) throw new Error('فایل رویدادها یافت نشد.');
        state.allEvents = await eventsResponse.json();

        if (!journalResponse.ok) throw new Error('فایل نشریه یافت نشد.');
        state.allJournalIssues = await journalResponse.json();

    } catch (error) {
        console.error("Failed to load initial data:", error);
        if (dom.mainContent) {
            dom.mainContent.innerHTML = `<div class="container" style="text-align:center; padding: 5rem 0;"><p>خطا در بارگذاری اطلاعات اولیه. لطفا صفحه را رفرش کنید.</p></div>`;
        }
    }
};