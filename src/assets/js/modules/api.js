// src/assets/js/modules/api.js
import { state } from './state.js';

const supabaseUrl = 'https://vgecvbadhoxijspowemu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZWN2YmFkaG94aWpzcG93ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDI5MjksImV4cCI6MjA2OTAxODkyOX0.4XW_7NUcidoa9nOGO5BrJvreITjg-vuUzsQbSH87eaU';
export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Auth & Profile Functions ---
export const getSession = async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) console.error("Error getting session:", error);
    state.session = data.session;
    state.user = data.session?.user ?? null;
    return data.session;
};

export const sendSignupOtp = async (email) => {
    return await supabaseClient.auth.signInWithOtp({ email });
};

export const sendPasswordResetOtp = async (email) => {
    return await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: undefined,
    });
};

export const verifyOtp = async (email, token) => {
    return await supabaseClient.auth.verifyOtp({ email, token, type: 'email' });
};

export const signInWithPassword = async (email, password) => {
    return await supabaseClient.auth.signInWithPassword({ email, password });
};

export const updateUserPassword = async (newPassword) => {
    return await supabaseClient.auth.updateUser({ password: newPassword });
};

export const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Error signing out:", error);
    } else {
        state.user = null;
        state.session = null;
        state.profile = null;
        location.hash = '#/';
    }
};

export const getProfile = async () => {
    if (!state.user) return null;
    try {
        const { data, error, status } = await supabaseClient
            .from('profiles')
            .select(`first_name, last_name, role, telegram_id, telegram_username, avatar_url`)
            .eq('id', state.user.id)
            .single();
            
        if (error && status !== 406) throw error;
        
        state.profile = data;
        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
};

export const updateProfile = async (profileData) => {
    if (!state.user) return { error: 'User not logged in' };
    try {
        const updates = {
            ...profileData,
            id: state.user.id,
            updated_at: new Date(),
        };
        const { error } = await supabaseClient.from('profiles').upsert(updates);
        if (error) throw error;
        
        // Fetch the latest profile to ensure state is in sync
        await getProfile();
        
        return { error: null };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { error };
    }
};

export const onAuthStateChange = (callback) => {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        state.session = session;
        state.user = session?.user ?? null;
        callback(state.user);
    });
};

export const checkUserExists = async (email) => {
    const { data, error } = await supabaseClient.rpc('user_exists', { user_email: email });
    if (error) {
        console.error("Error checking user existence:", error);
        return false;
    }
    return data;
};

export const connectTelegramAccount = async (telegramData) => {
    try {
        // The logic is now handled by the Edge Function. 
        // The client just needs to call the function.
        const { data: result, error } = await supabaseClient.functions.invoke('verify-telegram-auth', {
            body: telegramData,
        });

        if (error) throw error;
        if (!result.success) {
            throw new Error(result.error || 'خطا در پردازش اطلاعات تلگرام.');
        }
        
        // After the function successfully runs, refetch the profile to get the latest data
        await getProfile();
        
        return { success: true, error: null };

    } catch (error) {
        console.error('Error during Telegram connection process:', error);
        return { success: false, error: error.message };
    }
};


// --- Other Data Fetching Functions ---
export const getBaseUrl = () => {
    const supabaseProjectUrl = 'https://vgecvbadhoxijspowemu.supabase.co';
    const bucketName = 'assets';
    return `${supabaseProjectUrl}/storage/v1/object/public/${bucketName}/`;
};
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
