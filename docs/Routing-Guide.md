# Routing Guide (`router.js`)

The `router.js` module is the core engine that enables the **Single-Page Application (SPA)** functionality of the website. It is responsible for intercepting navigation requests, dynamically loading and rendering page content without a full browser refresh, and initializing the specific functionality required for each page.

### 1. Core Purpose

-   **Client-Side Navigation**: It listens to changes in the URL hash (`location.hash`) to determine which page the user wants to view.
-   **Dynamic Content Loading**: It fetches HTML partials (e.g., `about.html`, `news.html`) corresponding to the requested route.
-   **DOM Manipulation**: It injects the fetched HTML content into the main content area (`<main>`) of the `index.html` shell.
-   **Page Initialization**: After rendering the HTML, it calls the necessary JavaScript functions to make the new content interactive (e.g., initializing forms, attaching event listeners).
-   **State Cleanup**: It manages page-specific states and listeners, such as cleaning up the infinite scroll handler when leaving the news page.

---

### 2. Key Functions and Logic

#### a. Helper & Utility Functions

-   #### `initializeCopyButtons()` & `initializeVideoPlayers()`
    -   **Description**: These are initialization functions that are called after new content is rendered into the DOM. They find specific elements (like code block copy buttons or video players) and attach the necessary event listeners to make them functional.

-   #### `updateMetaTags(title, description)`
    -   **Description**: Updates the page's `title` and `meta description` tag. This is crucial for SEO in an SPA, ensuring that each dynamically loaded page has relevant metadata for search engines and browser tabs.

-   #### `updateActiveLink(path)`
    -   **Description**: Highlights the currently active link in the navigation menu by adding an `aria-current="page"` attribute. This provides clear visual feedback to the user about their current location on the site.

-   #### `cleanupPageSpecifics(newPath)`
    -   **Description**: A critical cleanup function that runs before rendering a new page. Its main job is to remove event listeners or reset states that are specific to the previous page. For example, it removes the infinite scroll event listener when the user navigates away from the `/news` page to prevent unnecessary API calls.

#### b. Core Rendering Engine

-   #### `renderPage(path)`
    -   **Description**: This is the main function of the router. It orchestrates the entire process of switching pages.
    -   **Workflow**:
        1.  **Loading State**: It adds a `.is-loading` class to the `<main>` element to create a fade-out effect.
        2.  **Cleanup**: Calls `cleanupPageSpecifics()` to prepare for the new page.
        3.  **Active Link**: Calls `updateActiveLink()` to update the navigation menu.
        4.  **Route Handling**: It checks the `path` to determine how to render the page:
            -   **News Detail Page (`/news/...`)**: It fetches the specific news article from the API, constructs its full HTML (including the article body and comments section), and injects it into the DOM.
            -   **Events Detail Page (`/events/...`)**: It first ensures the generic `events.html` partial is loaded, then calls `showEventModal()` from `ui.js` to display the specific event details.
            -   **Standard Pages (`/about`, `/contact`, etc.)**: It checks if the page's HTML is already in `state.pageCache`. If so, it uses the cached version. If not, it fetches the corresponding HTML partial (e.g., `about.html`), stores it in the cache, and then injects it.
        5.  **Page Initialization**: After the HTML is in the DOM, it consults the `pageRenderers` object. If a function is defined for the current path, it is executed. For instance, for the `/news` path, it initializes the infinite scroll functionality.
        6.  **Final Touches**: It calls `initializeCopyButtons()` and `initializeVideoPlayers()` to activate any components within the newly rendered content and removes the `.is-loading` class to fade the new content in.

#### c. Initialization and Event Handling

-   #### `handleNavigation()`
    -   **Description**: A simple handler that gets the current `location.hash` and passes it to the `renderPage()` function.

-   #### `initializeRouter()` (Exported)
    -   **Description**: The main entry point for the router module.
    -   **Actions**:
        1.  Adds a `popstate` event listener to the `window`, which triggers `handleNavigation()` whenever the user uses the browser's back/forward buttons.
        2.  Calls `handleNavigation()` once on initial page load to render the correct page based on the URL the user arrived at.