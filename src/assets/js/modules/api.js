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
    return await supabaseClient.auth.resetPasswordForEmail(email);
};

export const verifyOtp = async (email, token) => {
    return await supabaseClient.auth.verifyOtp({ email, token, type: 'email' });
};

export const signInWithPassword = async (email, password) => {
    return await supabaseClient.auth.signInWithPassword({ email, password });
};

export const signInWithGoogle = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
    });
    return { error };
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
            // START: فقط ستون‌های موجود انتخاب شده‌اند
            .select(`full_name, role`)
            // END: تغییر نهایی
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

export const checkUserStatus = async (email) => {
    const { data, error } = await supabaseClient.rpc('check_user_status', { user_email: email });
    if (error) {
        console.error("Error checking user status:", error);
        return 'error'; // یک وضعیت برای خطا برمی‌گردانیم
    }
    // مقادیر مورد انتظار: 'does_not_exist', 'exists_unconfirmed', 'exists_and_confirmed'
    return data;
};

/**
 * Verifies a Cloudflare Turnstile token by calling a server-side Edge Function.
 * @param {string} token The cf-turnstile-response token from the widget.
 * @returns {Promise<{success: boolean, message: string}>} The verification result.
 */
export const verifyTurnstile = async (token) => {
    try {
        const { data, error } = await supabaseClient.functions.invoke('verify-turnstile', {
            body: { token },
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error verifying Turnstile token:', error);
        return { success: false, message: error.message };
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

export const getEventRegistration = async (eventId, userId) => {
    if (!eventId || !userId) return { data: null, error: 'Event ID or User ID is missing' };
    try {
        const { data, error } = await supabaseClient
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .in('status', ['pending', 'confirmed']) // فقط وضعیت‌های در حال بررسی یا تایید شده را چک کن
            .single(); // انتظار داریم حداکثر یک نتیجه برگردد

        // اگر رکوردی پیدا نشود (کد خطای PGRST116)، این یک خطای واقعی نیست و باید نادیده گرفته شود
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching event registration:', error);
        return { data: null, error };
    }
};

export const deleteEventRegistration = async (registrationId) => {
    try {
        const { error } = await supabaseClient
            .from('event_registrations')
            .delete()
            .eq('id', registrationId);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting registration:', error);
        return { success: false, error };
    }
};

export const getUserProvider = async (email) => {
    const { data, error } = await supabaseClient.rpc('get_user_provider', { user_email: email });
    if (error) {
        console.error("Error checking user provider:", error);
        return { data: null, error };
    }
    return { data, error: null };
};




// --- Like and Comment Functions ---

export const getComments = async (newsId, userId) => {
    try {
        const { data, error } = await supabaseClient
            .rpc('get_comments_for_news_page', {
                p_news_id: newsId,
                p_user_id: userId
            });
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching comments:', error);
        return { data: null, error };
    }
};

export const addComment = async (newsId, userId, content, parentId = null) => {
    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .insert({ news_id: newsId, user_id: userId, content: content, parent_id: parentId })
            .select(`*, author:profiles(full_name)`)
            .single();
        if (error) throw error;
        data.likes = 0;
        data.dislikes = 0;
        data.user_vote = null;
        data.replies = [];
        return { data, error: null };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { data: null, error };
    }
};

export const deleteComment = async (commentId) => {
    try {
        const { error } = await supabaseClient
            .from('comments')
            .delete()
            .eq('id', commentId);
        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error deleting comment:', error);
        return { success: false, error };
    }
};

export const getLikeStatus = async (newsId, userId) => {
    try {
        const { count: like_count, error: countError } = await supabaseClient
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('news_id', newsId);
        if (countError) throw countError;

        let is_liked = false;
        if (userId) {
            const { data: likeData, error: likeError } = await supabaseClient
                .from('likes')
                .select('user_id')
                .eq('news_id', newsId)
                .eq('user_id', userId)
                .single();
            if (likeError && likeError.code !== 'PGRST116') throw likeError;
            if (likeData) is_liked = true;
        }
        return { data: { like_count, is_liked }, error: null };
    } catch (error) {
        console.error('Error getting like status:', error);
        return { data: null, error };
    }
};

export const toggleLike = async (newsId, userId) => {
    try {
        const { data, error } = await supabaseClient.rpc('toggle_like', { p_news_id: newsId, p_user_id: userId });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error toggling like:', error);
        return { data: null, error };
    }
};

export const toggleCommentVote = async (commentId, userId, voteType) => {
    try {
        const { data, error } = await supabaseClient.rpc('toggle_comment_vote', {
            p_comment_id: commentId,
            p_user_id: userId,
            p_vote_type: voteType
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error toggling comment vote:', error);
        return { data: null, error };
    }
};