# API Documentation (`api.js`)

This document provides a detailed breakdown of the functions within the `api.js` module. As the application's **Data Access Layer**, this module centralizes all communication with the Supabase backend, abstracting away the complexities of direct database, authentication, and storage interactions. All functions are asynchronous and return Promises.

### 1. Supabase Client Initialization

-   #### `supabaseClient`
    An exported instance of the Supabase client, initialized with the project's public URL and anon key. This is the cornerstone of the `api.js` module and is used internally by all other functions to make requests to the Supabase backend.
    -   **Usage**: Imported by other modules that need direct, low-level access to Supabase (rare).
    -   **Source**:

---

### 2. Authentication & Profile Functions

This suite of functions manages user identity, sessions, and profile data, handling the entire lifecycle of a user account.

-   #### `getSession()`
    -   **Description**: Fetches the current user's session from Supabase. It's a crucial function called on initial app load to determine if a user is already logged in.
    -   **Returns**: A `Promise` that resolves with the session object if the user is authenticated, or `null` otherwise.
    -   **Side Effects**: Updates `state.session` and `state.user` in the global state.

-   #### `sendSignupOtp(email)`
    -   **Description**: Initiates a passwordless sign-in or sign-up by sending a one-time password (OTP) to the user's email.
    -   **Parameters**:
        -   `email` (string): The email address to which the OTP will be sent.
    -   **Returns**: A `Promise` resolving with `{ data, error }`.

-   #### `sendPasswordResetOtp(email)`
    -   **Description**: Triggers the password reset flow by sending an OTP to a registered user's email.
    -   **Parameters**:
        -   `email` (string): The user's email address.
    -   **Returns**: A `Promise` resolving with `{ data, error }`.

-   #### `verifyOtp(email, token)`
    -   **Description**: Verifies the OTP token submitted by the user. If successful, it logs the user in and establishes a session.
    -   **Parameters**:
        -   `email` (string): The user's email.
        -   `token` (string): The 6-digit OTP code.
    -   **Returns**: A `Promise` resolving with `{ data: { session }, error }`.

-   #### `signInWithPassword(email, password)`
    -   **Description**: Authenticates a user using the traditional email and password method.
    -   **Returns**: A `Promise` resolving with `{ data: { session }, error }`.

-   #### `signInWithGoogle()`
    -   **Description**: Redirects the user to Google's authentication page to sign in with their Google account (OAuth flow).
    -   **Returns**: A `Promise` that resolves upon successful redirection or rejects with an error.

-   #### `updateUserPassword(newPassword)`
    -   **Description**: Allows an authenticated user to change their password.
    -   **Parameters**:
        -   `newPassword` (string): The new password (must be at least 6 characters).
    -   **Returns**: A `Promise` resolving with `{ data, error }`.

-   #### `signOut()`
    -   **Description**: Clears the current user's session and signs them out.
    -   **Side Effects**: Clears `state.user`, `state.session`, and `state.profile`.

-   #### `getProfile()`
    -   **Description**: Retrieves the public profile data for the currently logged-in user from the `profiles` table in the database.
    -   **Returns**: A `Promise` resolving with the user's profile object (e.g., `{ full_name: 'John Doe', role: 'user' }`) or `null` if not found.
    -   **Side Effects**: Caches the fetched profile in `state.profile`.

-   #### `updateProfile(profileData)`
    -   **Description**: Updates or creates a user's profile information. Uses Supabase's `upsert` to handle both cases seamlessly.
    -   **Parameters**:
        -   `profileData` (object): An object containing the fields to update, e.g., `{ full_name: 'Jane Doe' }`.
    -   **Returns**: A `Promise` resolving with `{ error }`.

-   #### `onAuthStateChange(callback)`
    -   **Description**: A real-time listener that executes a callback function whenever a user signs in, signs out, or their session is refreshed. This is key for updating the UI dynamically.
    -   **Parameters**:
        -   `callback` (function): The function to execute on an auth state change. It receives the new `user` object as an argument.

-   #### `checkUserStatus(email)`
    -   **Description**: Calls a custom RPC function (`check_user_status`) on Supabase to determine the status of an email address (e.g., `exists_and_confirmed`, `does_not_exist`). This is used in the login form to decide whether to show a password field or send an OTP.
    -   **Returns**: A `Promise` resolving with a string indicating the user's status.

-   #### `verifyTurnstile(token)`
    -   **Description**: For security, this function sends a Cloudflare Turnstile token to a Supabase edge function for server-side validation, preventing automated form submissions.
    -   **Returns**: A `Promise` resolving with `{ success: boolean, message: string }`.

---

### 3. Public Data Fetching Functions

These functions retrieve data from the database that is accessible to all users, whether logged in or not. They typically cache their results in the global `state` object to avoid re-fetching.

-   **`loadMembers()`**: Fetches the list of all members and stores them in `state.membersMap` for quick lookups by ID.
-   **`loadTags()`**: Fetches all available tags and populates `state.tagsMap`.
-   **`loadEvents()`**: Uses an RPC function (`get_events_with_registration_count`) to efficiently retrieve all events along with the current count of registered participants for each.
-   **`loadJournal()`**: Fetches all published journal issues.
-   **`loadChartData()`**: Fetches all necessary data for the curriculum chart page by loading from two tables: `courses` and `course_prerequisites`.
-   **`loadNews()`**: Retrieves a list of all news articles. The query is designed to also fetch related data, like the like count and comment count, in a single request for efficiency.

---

### 4. User Interaction Functions

These functions handle actions performed by authenticated users, such as social interactions on news articles.

-   **`getComments(newsId, userId)`**: Fetches the comment tree for a news article. It calls an RPC function (`get_comments_for_news_page`) that also joins author information and checks if the provided `userId` has voted on each comment.
-   **`addComment(...)`**: Inserts a new record into the `comments` table. It can be a top-level comment or a reply if `parentId` is provided.
-   **`deleteComment(commentId, deleterUserId)`**: Implements a soft delete by calling an RPC function (`soft_delete_comment`). This function in Supabase verifies that the `deleterUserId` is the original author of the comment before nullifying its content, thus preserving replies.
-   **`toggleLike(newsId, userId)`**: Calls the `toggle_like` RPC function, which contains the business logic to either insert or delete a record in the `likes` table transactionally and returns the new like count and user's like status.
-   **`toggleCommentVote(...)`**: Similar to `toggleLike`, but for comments, handling both upvotes and downvotes.

---

### 5. Admin Panel Operations

This set of functions provides the necessary backend operations for the admin panel to manage the site's content.

-   **CRUD Operations**: The module provides standard Create, Read, Update, and Delete functions for several tables:
    -   News: `addNews`, `updateNews`, `deleteNews`
    -   Events: `addEvent`, `updateEvent`, `deleteEvent`
    -   Journal: `addJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`
    -   Tags: `addTag`, `updateTag`, `deleteTag`

-   **Storage Management**: Functions for handling file uploads. They follow a specific pattern for naming files to ensure uniqueness and organization within Supabase Storage buckets.
    -   `uploadNewsImage(file, slug, newsId)`: Uploads a cover image to the `news-assets` bucket.
    -   `deleteNewsImage(imageUrl)`: Parses an image URL to find its path in the bucket and deletes it.
    -   `uploadEventImage(file, slug)`: Uploads an event image to a temporary path.
    -   `renameEventImage(oldPath, eventId, newSlug)`: After an event is created and has an ID, this function moves its image from the temporary path to a final path that includes the event ID, making it easier to manage.

-   **Registration Management**:
    -   `loadRegistrations()`: Fetches a complete list of all event registrations, joining data from the `events` table to display the event title.
    -   `updateRegistrationStatus(registrationId, newStatus)`: Allows an admin to change the status of a registration (e.g., from `pending` to `confirmed`).