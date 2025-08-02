// src/assets/js/modules/api.js

import { state, dom } from './state.js';

// --- Supabase Initialization ---
const supabaseUrl = 'https://vgecvbadhoxijspowemu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZWN2YmFkaG94aWpzcG93ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDI5MjksImV4cCI6MjA2OTAxODkyOX0.4XW_7NUcidoa9nOGO5BrJvreITjg-vuUzsQbSH87eaU';

export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Base URL for assets from Supabase Storage ---
export const getBaseUrl = () => {
    const supabaseProjectUrl = 'https://vgecvbadhoxijspowemu.supabase.co';
    const bucketName = 'assets';
    return `${supabaseProjectUrl}/storage/v1/object/public/${bucketName}/`;
};

// --- Optimized Data Fetching ---
export const loadMembers = async () => {
    if (state.membersMap.size > 0) return;
    try {
        const { data: members, error } = await supabaseClient.from('members').select('*');
        if (error) throw error;
        members.forEach(member => state.membersMap.set(member.id, member));
    } catch (error) {
        console.error("Failed to load members:", error);
    }
};

export const loadEvents = async () => {
    if (state.allEvents.length > 0) return;
    try {
        const { data, error } = await supabaseClient.from('events').select('*');
        if (error) throw error;
        state.allEvents = data || [];
    } catch (error) {
        console.error("Failed to load events:", error);
    }
};

export const loadJournal = async () => {
    if (state.allJournalIssues.length > 0) return;
    try {
        const { data, error } = await supabaseClient.from('journal').select('*');
        if (error) throw error;
        state.allJournalIssues = data || [];
    } catch (error) {
        console.error("Failed to load journal issues:", error);
    }
};

export const loadChartData = async () => {
    if (state.allCourses.length > 0) return;
    try {
        const [{ data: courses, error: cError }, { data: prereqs, error: pError }] = await Promise.all([
            supabaseClient.from('courses').select('*').order('id'),
            supabaseClient.from('course_prerequisites').select('*')
        ]);
        if (cError) throw cError;
        if (pError) throw pError;
        state.allCourses = courses || [];
        state.coursePrerequisites = prereqs || [];
    } catch (error) {
        console.error("Failed to load chart data:", error);
    }
};