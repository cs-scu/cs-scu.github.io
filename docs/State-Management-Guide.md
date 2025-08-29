# State Management Guide (`state.js`)

The `state.js` module is the **central nervous system** of the application. It acts as a single, centralized store for all shared data and application state. By having one source of truth, we ensure data consistency across different modules, prevent redundant API calls, and make the application's data flow predictable and easier to debug.

### 1. Core Purpose

The primary goal of this module is to export a single `state` object that serves as a global, in-memory database for the application's runtime data. When a module needs information (like the current user or a list of events), it imports it from this `state` object instead of making a new API call every time.

---

### 2. The `state` Object Breakdown

The `state` object is organized into logical sections:

#### a. Authentication State
This section holds all information related to the current user's session and identity.

-   **`user`**: Stores the Supabase user object when a user is logged in. Contains essential info like user ID and email. It is `null` if no one is logged in.
-   **`session`**: Holds the complete Supabase session object, which includes the access token and other session-related metadata.
-   **`profile`**: Stores the user's public profile data (e.g., `full_name`, `role`) fetched from our custom `profiles` table. This is kept separate from the `user` object to distinguish between authentication data and application-specific user data.

#### b. Data Stores (Caches)
These properties act as caches for data fetched from the API, preventing the need to re-fetch data on every page navigation.

-   **`allNews`**: An array that stores the list of all news articles fetched from the database.
-   **`membersMap`**: A `Map` object that stores member information, with the member `id` as the key. Using a Map provides fast O(1) lookups, which is efficient for finding author details for news articles.
-   **`tagsMap`**: A `Map` that stores tag information (`id` -> `name`), allowing for quick retrieval of tag names when rendering news or events.
-   **`userRegistrations`**: A `Map` (`eventId` -> `status`) that caches the registration status of the current user for various events, preventing repeated checks.
-   **`allEvents`**: An array holding all event data.
-   **`allJournalIssues`**: An array for all journal issues.
-   **`allCourses`** & **`coursePrerequisites`**: Arrays that store the data for the curriculum chart page.
-   **`allContacts`**: An array caching the messages from the contact form for the admin panel.

#### c. Page Cache & Instances

-   **`pageCache`**: An object used by the router (`router.js`) to cache the HTML content of fetched pages (partials like `about.html`). This makes subsequent visits to the same page nearly instantaneous.
-   **`particlesInstance`**: Holds the instance of the `particles.js` library after it's initialized. This allows the theme module (`theme.js`) to access and update particle colors when the theme changes.

#### d. Page-Specific State
This section holds state that is specific to the functionality of a particular page.

-   **`loadedNewsCount`**: A counter for the infinite scroll feature on the news page.
-   **`NEWS_PER_PAGE`**: A constant defining how many news items to fetch at a time.
-   **`isLoadingNews`**: A boolean flag to prevent multiple simultaneous fetch requests while the user is scrolling.
-   **`newsScrollHandler`**: Holds a reference to the scroll event listener function so it can be added or removed by the router when entering or leaving the news page.

---

### 3. The `dom` Object

For convenience, this module also exports a `dom` object which holds references to frequently accessed DOM elements.

-   **`body`**: A reference to `document.body`.
-   **`mainContent`**: A reference to the `<main>` element, where all page content is rendered by the router.