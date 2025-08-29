# Admin Panel Guide (`admin.js`)

The Admin Panel is a separate Single-Page Application (SPA) loaded from `admin.html`. It serves as the central hub for all content management. The entire logic for the panel—including routing, data fetching, rendering, and form handling—is encapsulated within the `admin.js` module.

### 1. Access and Authentication

-   **Entry Point**: Access to the panel is through `admin.html`.
-   **Authentication**: The panel is protected. On load, `admin.js` checks for an active user session using `supabaseClient.auth.getSession()`. If no session exists, the user is immediately redirected to the main site's login page (`index.html#/login`).
-   **Authorization**: After confirming a session, the script fetches the user's profile using `getProfile()`. It then checks if the user's `role` is `'admin'`. If the user is not an admin, they are alerted and redirected back to the main site's homepage (`index.html#/`).

---

### 2. Architecture and Routing

The admin panel functions as a self-contained SPA, similar to the main site.

-   **Internal Router**: `admin.js` contains a routing object named `adminRoutes`. This object maps hash-based URLs (e.g., `#/admin/news`) to specific configurations.
-   **Route Configuration**: Each route object specifies:
    -   `title`: The title to be displayed in the header of the panel section.
    -   `html`: The name of the HTML partial file (e.g., `admin-news.html`) to be loaded.
    -   `loader`: An asynchronous function from `api.js` that fetches the necessary data for the page (e.g., `loadNews`).
    -   `renderer`: A function that takes the fetched data and renders it into the DOM.
    -   `initializer`: A function that attaches event listeners and sets up the functionality for that specific page after it has been rendered.

-   **Navigation Flow**: When the URL hash changes, the `loadAdminPage` function is triggered. It finds the corresponding route, fetches the HTML and data concurrently, injects the HTML into the main content area, and then calls the renderer and initializer functions.

---

### 3. Core Sections of the Panel

#### a. Messages (`/admin/messages`)
-   **Purpose**: Displays messages submitted through the main site's "Contact Us" form.
-   **Functionality**: Fetches all contacts using `loadContacts()` and renders them in an accordion-style view for easy reading. Each message can be expanded or collapsed.

#### b. News (`/admin/news`)
-   **Purpose**: Full CRUD (Create, Read, Update, Delete) management for news articles.
-   **Key Features**:
    -   **Visual Content Editor**: A block-based editor that allows admins to build rich article content, including headers, paragraphs, lists, images, quotes, tables, videos, and code snippets. The editor's state is serialized into a JSON object and stored in the database.
    -   **Live Preview**: A side panel (`live-preview-widget`) that renders a real-time preview of the article as the admin is creating or editing it.
    -   **Tag Management**: Admins can select existing tags or create new ones on the fly through a dedicated modal.
    -   **Image Upload**: A dedicated component for uploading a cover image for the article.
    -   **News List**: Displays a table of the most recent news articles for quick access to edit or delete operations.

#### c. Journal (`/admin/journal`)
-   **Purpose**: Manages issues of the scientific journal.
-   **Functionality**: A straightforward form for uploading a journal issue, which includes fields for the title, issue number, date, a summary, a cover image (`.webp`, `.jpg`, etc.), and the main journal file (`.pdf`).

#### d. Events (`/admin/events`)
-   **Purpose**: Full CRUD management for events, workshops, and competitions.
-   **Key Features**:
    -   **Comprehensive Form**: Includes fields for title, summary, location (with an "Online" toggle), cost (with a "Free" toggle), and capacity (with an "Unlimited" toggle).
    -   **Date Pickers**: Uses the `flatpickr` library to provide user-friendly Persian date range selectors for the event duration and registration period.
    -   **Schedule Editor**: A powerful feature allowing admins to define multiple sessions for a single event. Each session can have its own title, date, time, venue, and a unique meeting link.
    -   **Content Editor**: Uses the same visual block editor as the news section to create a detailed description page for the event.

#### e. Registrations (`/admin/registrations`)
-   **Purpose**: To view and manage user registrations for events.
-   **Functionality**:
    -   **Data Table**: Displays all registrations with user details, the event they signed up for, payment information (if applicable), and current status.
    -   **Filtering & Searching**: Admins can filter the list by event, registration status (`pending`, `confirmed`, `rejected`), or use a search bar to find specific users.
    -   **Status Management**: Admins can approve or reject `pending` registrations. This action updates the database and the user's view of their registration status.

---

### 4. Shared Features

-   **File Uploader Modal**: A powerful, reusable modal accessible from the main header. It allows admins to browse, upload, and manage files in the Supabase Storage bucket. It features a folder structure, breadcrumb navigation, and options for creating new folders.
-   **Tag Management Modal**: A shared modal used in the News and Events sections that allows for selecting, creating, editing, and deleting tags. It includes a search feature for easy filtering.