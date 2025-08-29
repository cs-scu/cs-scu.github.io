# Project Technical Documentation: Architecture and Structure

This document aims to provide a deep technical overview of the structure of the Scientific Association's website project. The goal is to guide developers in quickly understanding the architecture, module logic, and data flow within the application.

### 1. Design Philosophy

The project is designed based on a **Modular** and **Single-Page Application (SPA)** architecture. This choice was made to ensure maintainability, scalability, and a fast, modern user experience.

-   **Modularity**: The application's logic is broken down into distinct, self-contained modules (e.g., API communication, UI management, routing). Each module has a specific responsibility, which makes the codebase easier to understand, debug, and extend. This separation of concerns is crucial for long-term project health.
-   **SPA (Single-Page Application)**: To create a fluid and responsive user experience similar to a desktop application, the project avoids full-page reloads. When a user navigates to a different section, only the main content area (`<main>`) is dynamically updated via JavaScript. This significantly reduces loading times after the initial page load and makes navigation feel instantaneous.

---

### 2. Detailed File and Folder Structure

-   **`/` (Root):**
    -   `index.html`: The main entry point for the public-facing application. It contains the essential HTML structure, including the `<header>`, `<main>`, and `<footer>` tags, which are manipulated by the JavaScript modules.
    -   `admin.html`: The dedicated entry point for the administration panel. It loads a separate set of scripts and styles tailored for content management.
    -   `README.md`: A general introduction to the project, its purpose, and setup instructions.
    -   `LICENSE`: The project's license file (MIT), defining the terms of use and distribution.
    -   `sitemap.xml`: Provides a map of the site's pages to help search engines like Google better crawl and index the content.

-   **`/src`**: The source directory containing all developer-written code and assets.
    -   **`/assets`**: All static assets required by the application.
        -   `/css`: Contains stylesheets. This includes the main `style.css` for the entire site and any vendor-specific CSS like `flatpickr-cs-scu-theme.css`.
        -   `/js`: Contains all JavaScript code.
            -   `main.js`: The **application's primary script**. It initializes the application by importing and calling the necessary functions from the modules. It's the starting point of all client-side logic for `index.html`.
            -   `/modules`: The **logical core of the project**. Each file here represents a distinct piece of functionality.
            -   `/vendor`: Third-party JavaScript libraries that are locally hosted, such as `flatpickr.min.js`.
        -   `/fonts`: Contains web font files like `Vazirmatn.woff2` to ensure consistent typography.
    -   `*.html`: These are HTML partials. They contain only the markup for a specific page's content (e.g., the "About Us" text or the "Contact Us" form) and are dynamically fetched and injected into the `<main>` tag of `index.html` by the router.

---

### 3. In-depth Analysis of JavaScript Modules (`/src/assets/js/modules/`)

These modules are the heart of the application, each handling a specific domain of functionality.

-   **`state.js`**: **Centralized State Management**. This module acts as the single source of truth for the application's data. It exports a `state` object that holds all shared information, such as the currently logged-in user, cached lists of news, events, members, etc. By centralizing the state, we avoid redundant API calls (data is fetched once and stored) and ensure data consistency across different components and modules.

-   **`api.js`**: **Data Access Layer**. This is the sole module responsible for communicating with the **Supabase** backend. It abstracts all database and storage interactions into clear, reusable functions (e.g., `loadNews()`, `signInWithPassword()`, `uploadNewsImage()`). This abstraction is critical because if the backend ever changes (e.g., moving from Supabase to another service), only this file needs to be updated, leaving the rest of the application's logic untouched.

-   **`router.js`**: **Client-Side Router**. The router is the engine behind the SPA experience. It listens for changes in the URL's hash (`location.hash`). When a change is detected, it identifies the requested page, fetches the corresponding HTML partial (e.g., `about.html`), and injects its content into the `<main>` element. Crucially, after injecting the content, it calls the appropriate initialization functions from other modules (e.g., calling `renderEventsPage()` from `components.js` after loading the events page) to make the page interactive.

-   **`ui.js`**: **User Interface Toolkit**. This module handles complex UI interactions that are not simple component rendering. Its primary roles are:
    -   **Modal Management**: Controls the logic for showing, hiding, and populating all modals (user profile, event registration forms, session schedules).
    -   **Complex Form Logic**: Manages the entire multi-step authentication flow within the login modal, including handling OTP verification, password strength checks, and switching between different steps.
    -   **Global UI Updates**: Updates parts of the UI that are persistent across pages, such as the header, to reflect the application's state (e.g., showing the user's name after login).
    -   **Interaction Handling**: Manages the logic for the news comments section, including submitting new comments, handling replies, and processing likes.

-   **`components.js`**: **Component Factory**. This module is responsible for dynamically generating repeating HTML structures from data. It contains functions like `renderNewsItems` or `renderMembersPage` which take an array of data objects (from the `state` module) and map them to HTML templates. This keeps the HTML clean and separates the data from its visual representation, following the principles of component-based architecture.

-   **`admin.js`**: **Admin Panel Core Logic**. This is a comprehensive module that encapsulates all functionality for the admin panel (`admin.html`). It acts as a mini-application on its own, with its own internal routing (`adminRoutes`), data loading, and rendering logic. It handles the rendering of data tables, manages all create/edit forms, and initializes complex features like the visual content editor and the file uploader modal.

-   **`theme.js`** & **`admin-theme.js`**: These modules manage the application's visual theme. They read the user's preference (light, dark, or system default) from `localStorage`, apply the corresponding CSS class to the `<body>` element, and handle theme changes triggered by the user or the operating system. They also update theme-dependent elements, like the `particles.js` background color.