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
            .select(`full_name, role`)
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
        return 'error';
    }
    return data;
};

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
    if (state.membersMap.size > 0) return state.membersMap;
    try {
        const { data: members, error } = await supabaseClient.from('members').select('*');
        if (error) throw error;
        members.forEach(member => state.membersMap.set(member.id, member));
        return state.membersMap;
    } catch (error) {
        console.error("Failed to load members:", error);
    }
};

export const loadTags = async () => {
    try {
        const { data, error } = await supabaseClient.from('tags').select('id, name');
        if (error) throw error;
        state.tagsMap.clear();
        (data || []).forEach(tag => state.tagsMap.set(tag.id, tag.name));
        return state.tagsMap;
    } catch (error) {
        console.error('Error loading tags:', error);
        throw error;
    }
};

export const addTag = async (tagName) => {
    try {
        const { data, error } = await supabaseClient
            .from('tags')
            .insert({ name: tagName })
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding tag:', error);
        throw error;
    }
};

export const updateTag = async (tagId, newName) => {
    try {
        const { data, error } = await supabaseClient
            .from('tags')
            .update({ name: newName })
            .eq('id', tagId)
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating tag:', error);
        throw error;
    }
};

export const deleteTag = async (tagId) => {
    try {
        const { data: events, error: fetchError } = await supabaseClient
            .from('events')
            .select('id, tag_ids')
            .filter('tag_ids', 'cs', `{${tagId}}`); 

        if (fetchError) throw fetchError;

        if (events.length > 0) {
            const updates = events.map(event => {
                const newTagIds = event.tag_ids.filter(id => id !== tagId);
                return supabaseClient
                    .from('events')
                    .update({ tag_ids: newTagIds })
                    .eq('id', event.id);
            });
            await Promise.all(updates);
        }

        const { error: deleteError } = await supabaseClient
            .from('tags')
            .delete()
            .eq('id', tagId);

        if (deleteError) throw deleteError;
        return { success: true };
    } catch (error) {
        console.error('Error deleting tag:', error);
        throw error;
    }
};

export const loadEvents = async () => {
    try {
        const { data, error } = await supabaseClient.rpc('get_events_with_registration_count');
        if (error) throw error;
        state.allEvents = data || [];
        return state.allEvents;
    } catch (error) {
        console.error("Failed to load events:", error);
        throw error;
    }
};
export const loadJournal = async () => {
    if (state.allJournalIssues.length > 0) return state.allJournalIssues;
    try {
        const { data, error } = await supabaseClient.from('journal').select('*');
        if (error) throw error;
        state.allJournalIssues = data || [];
        return state.allJournalIssues;
    } catch (error) {
        console.error("Failed to load journal issues:", error);
        throw error;
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

export const loadContacts = async () => {
    try {
        const { data, error } = await supabaseClient
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        state.allContacts = data || [];
        return state.allContacts;
    } catch (error) {
        console.error("Failed to load contacts (api.js):", error);
        throw error;
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
            .in('status', ['pending', 'confirmed', 'rejected'])
            .single();

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

// --- News Functions ---
export const loadNews = async () => {
    try {
        const { data, error } = await supabaseClient
            .from('news')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        state.allNews = data || [];
        return state.allNews;
    } catch (error) {
        console.error("Failed to load news:", error);
        throw error;
    }
};

export const addNews = async (newsData) => {
    try {
        const { data, error } = await supabaseClient
            .from('news')
            .insert([newsData])
            .select()  // <-- این خط باعث می‌شود رکورد جدید بازگردانده شود
            .single(); // <-- این خط نتیجه را از آرایه به یک آبجکت تبدیل می‌کند

        if (error) throw error;
        return { data, error: null }; // <-- اکنون data شامل اطلاعات خبر جدید است
    } catch (error) {
        console.error('Error adding news:', error);
        throw error;
    }
};

export const updateNews = async (id, newsData) => {
    try {
        const { error } = await supabaseClient.from('news').update(newsData).eq('id', id);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error updating news:', error);
        throw error;
    }
};

export const deleteNews = async (id) => {
    try {
        const { error } = await supabaseClient.from('news').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting news:', error);
        throw error;
    }
};

// در فایل src/assets/js/modules/api.js

// در فایل src/assets/js/modules/api.js

// در فایل: src/assets/js/modules/api.js

export async function uploadNewsImage(file, slug, newsId) {
    if (!newsId) throw new Error("ID is required to name the news image file.");

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const extension = file.name.split('.').pop();
    
    // ساخت نام نهایی و مسیر آپلود به صورت مستقیم
    const fileName = `covers/nw-${newsId}-${slug}-${timestamp}.${extension}`;

    const { error } = await supabaseClient.storage
        .from('news-assets')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    const { data: publicUrlData } = supabaseClient.storage
        .from('news-assets')
        .getPublicUrl(fileName);

    // فقط URL عمومی نهایی را برمی‌گردانیم
    return publicUrlData.publicUrl;
}

export const deleteNewsImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
        const urlParts = imageUrl.split('/news-assets/');
        const filePath = urlParts[1];
        if (filePath) {
            await supabaseClient.storage.from('news-assets').remove([filePath]);
        }
    } catch (error) {
        console.error('Failed to delete old news image:', error.message);
    }
};

export const renameNewsImage = async (oldImageUrl, newSlug) => {
    if (!oldImageUrl || !newSlug) return oldImageUrl;
    try {
        const urlParts = oldImageUrl.split('/news-assets/');
        const oldFilePath = urlParts[1];
        if (!oldFilePath) return oldImageUrl;

        const oldFileName = oldFilePath.split('/').pop();
        const extension = oldFileName.split('.').pop();
        const timestamp = oldFileName.match(/(\d{8})/)[0];
        const newFilePath = `covers/${newSlug}-${timestamp}.${extension}`;
        
        if (oldFilePath === newFilePath) return oldImageUrl;

        const { error } = await supabaseClient.storage.from('news-asset').move(oldFilePath, newFilePath);
        if (error) throw error;
        
        const { data } = supabaseClient.storage.from('news-asset').getPublicUrl(newFilePath);
        return data.publicUrl;
    } catch (error) {
        console.error('Error renaming news image:', error);
        return oldImageUrl;
    }
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
            .select()
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { data: null, error };
    }
};

export const deleteComment = async (commentId, deleterUserId) => {
    try {
        const { data, error } = await supabaseClient.rpc('soft_delete_comment', {
            comment_id_to_delete: commentId,
            deleter_user_id: deleterUserId
        });
        if (error || !data.success) throw new Error(data.message || 'Error deleting comment.');
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

export const addJournalEntry = async (entryData) => {
    try {
        const { data, error } = await supabaseClient
            .from('journal')
            .insert([entryData]);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error adding journal entry:', error);
        throw error;
    }
};

export const updateJournalEntry = async (id, entryData) => {
    try {
        const { data, error } = await supabaseClient
            .from('journal')
            .update(entryData)
            .eq('id', id);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating journal entry:', error);
        throw error;
    }
};

export const deleteJournalEntry = async (id) => {
    try {
        const { data, error } = await supabaseClient
            .from('journal')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        throw error;
    }
};

export const deleteJournalFiles = async (fileUrls) => {
    const validUrls = fileUrls.filter(url => !!url);
    if (validUrls.length === 0) {
        return;
    }
    try {
        const filePaths = validUrls.map(url => {
            const urlParts = url.split('/journal-assets/');
            return urlParts.length > 1 ? urlParts[1] : null;
        }).filter(path => path);

        if (filePaths.length > 0) {
            const { data, error } = await supabaseClient
                .storage
                .from('journal-assets')
                .remove(filePaths);

            if (error) {
                console.error("Error deleting storage files:", error);
            } else {
                console.log("Associated files deleted successfully from storage:", data);
            }
        }
    } catch (e) {
        console.error("An exception occurred while trying to delete files from storage:", e);
    }
};

export const addEvent = async (eventData) => {
    try {
        // MODIFIED: Chained .select().single() to get the new record back.
        const { data, error } = await supabaseClient
            .from('events')
            .insert([eventData])
            .select()
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error adding event:', error);
        return { data: null, error };
    }
};

export const updateEvent = async (id, eventData) => {
    try {
        const { error } = await supabaseClient.from('events').update(eventData).eq('id', id);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error updating event:', error);
        return { error };
    }
};

export const deleteEvent = async (id) => {
    try {
        const { error } = await supabaseClient.from('events').delete().eq('id', id);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting event:', error);
        return { error };
    }
};

export const uploadEventImage = async (file, slug) => {
    if (!file || !slug) return null;

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` +
                      `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const extension = file.name.split('.').pop();
    const tempFileName = `temp/ev-${slug}-${timestamp}.${extension}`; // Upload to a temp folder

    try {
        const { error: uploadError } = await supabaseClient.storage
            .from('event-assets')
            .upload(tempFileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabaseClient.storage
            .from('event-assets')
            .getPublicUrl(tempFileName);
        
        // Return both URL and the path for the renaming step
        return { publicUrl: data.publicUrl, filePath: tempFileName };
    } catch (error) {
        console.error('Error uploading event image:', error);
        throw error;
    }
};
export const deleteEventImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
        const urlParts = imageUrl.split('/event-assets/');
        const filePath = urlParts[1];
        if (filePath) {
            await supabaseClient.storage
                .from('event-assets')
                .remove([filePath]);
        }
    } catch (error) {
        console.error('Failed to delete old event image:', error.message);
    }
};


export const renameEventImage = async (oldImageUrlOrPath, eventId, newSlug) => {
    if (!oldImageUrlOrPath || !eventId || !newSlug) return oldImageUrlOrPath;

    try {
        let oldFilePath = oldImageUrlOrPath;
        if (oldImageUrlOrPath.includes('/event-assets/')) {
            const urlParts = oldImageUrlOrPath.split('/event-assets/');
            oldFilePath = urlParts[1];
        }

        if (!oldFilePath) return oldImageUrlOrPath;

        const oldFileName = oldFilePath.split('/').pop();
        const extension = oldFileName.split('.').pop();
        const timestampMatch = oldFileName.match(/(\d{14})/);
        if (!timestampMatch) throw new Error('Could not extract timestamp from filename.');
        const timestamp = timestampMatch[0];

        // Construct the final, correct file path: covers/ev-[id]-[slug]-[timestamp].ext
        const newFilePath = `covers/ev-${eventId}-${newSlug}-${timestamp}.${extension}`;
        
        if (oldFilePath === newFilePath) {
            const { data } = supabaseClient.storage.from('event-assets').getPublicUrl(oldFilePath);
            return data.publicUrl;
        }

        const { error: moveError } = await supabaseClient.storage
            .from('event-assets')
            .move(oldFilePath, newFilePath);

        if (moveError) throw moveError;

        const { data } = supabaseClient.storage
            .from('event-assets')
            .getPublicUrl(newFilePath);
        
        return data.publicUrl;
    } catch (error) {
        console.error('Error renaming event image:', error);
        return oldImageUrlOrPath;
    }
};

export const loadRegistrations = async () => {
    try {
        const { data, error } = await supabaseClient
            .from('event_registrations')
            .select(`
                *,
                events (
                    title
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Failed to load registrations:", error);
        throw error;
    }
};

export const updateRegistrationStatus = async (registrationId, newStatus) => {
    try {
        const { data, error } = await supabaseClient
            .from('event_registrations')
            .update({ status: newStatus })
            .eq('id', registrationId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating registration status:', error);
        return { data: null, error };
    }
};

export const getUserRegistrations = async (userId) => {
    if (!userId) return [];
    try {
        const { data, error } = await supabaseClient
            .from('event_registrations')
            .select('event_id, status')
            .eq('user_id', userId);
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Failed to get user registrations:", error);
        return [];
    }
};