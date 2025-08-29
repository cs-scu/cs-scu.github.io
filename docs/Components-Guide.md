# Components Guide (`components.js`)

The `components.js` module acts as the **Component Factory** or **Rendering Engine** for the application. Its sole responsibility is to take raw data (usually from the global `state` object) and transform it into dynamic HTML content. This module is what makes the pages interactive and data-driven, by populating them with lists, grids, and cards based on information fetched from the API.

### 1. Core Purpose

-   **Data-to-HTML Transformation**: The primary role is to render collections of data (like arrays of news articles or events) into structured HTML.
-   **DOM Manipulation**: It directly interacts with the DOM to inject the generated HTML into the appropriate container elements on each page.
-   **Separation of Concerns**: It cleanly separates the logic of *how* data is displayed from the logic of *what* data is fetched (`api.js`) or *how* the user interacts with it (`ui.js`).

---

### 2. Key Rendering Functions

#### a. News Components

-   #### `loadLatestNews()`
    -   **Description**: Renders the "Latest News" section on the homepage.
    -   **Workflow**:
        1.  Fetches the three most recent news articles directly from the `news` table in Supabase.
        2.  Iterates through them, retrieving author details from the cached `state.membersMap`.
        3.  Generates the HTML for each news card and injects it into the `.news-grid` on the homepage.

-   #### `loadMoreNews()` & `renderNewsItems(items)`
    -   **Description**: These two functions work together to implement the infinite scroll feature on the `/news` page.
    -   **Workflow**:
        -   `loadMoreNews`: This function is called when the user scrolls near the bottom of the news page. It calculates the next "page" of articles to fetch based on `state.loadedNewsCount` and `state.NEWS_PER_PAGE`. It then fetches this new batch of articles from the API.
        -   `renderNewsItems`: This is a helper function that takes the array of newly fetched `items`. It clones an HTML `<template>` (`#news-item-template`) for each article, populates it with the article's data (title, summary, author, tags, etc.), and appends it to the `.news-list` container in the DOM. It also handles the display of skeleton loaders while data is being fetched.

#### b. Page-Specific Renderers

-   #### `renderMembersPage()`
    -   **Description**: Renders the grid of member profiles on the `/members` page.
    -   **Logic**: It retrieves all member data from `state.membersMap`, sorts them by ID, and uses the `#member-card-template` to create and display a card for each member, including their photo, role, description, skills (tags), and social media links.

-   #### `renderEventsPage()`
    -   **Description**: A complex rendering function for the `/events` page that handles multiple states.
    -   **Functionality**:
        1.  **Filtering**: It separates the events from `state.allEvents` into two lists: "upcoming" and "past".
        2.  **Rendering**: It populates both the "Upcoming Events" and "Past Events" tabs with event cards created from the `#event-card-template`.
        3.  **Dynamic Buttons**: For each event, it dynamically generates the correct action buttons based on a combination of factors: event capacity, registration dates, and the user's own registration status (`state.userRegistrations`). It also renders countdown timers for registration periods.

-   #### `renderJournalPage()` & `initializeJournalPageInteractions()`
    -   **Description**: Renders the grid of journal issues on the `/journal` page.
    -   **Functionality**:
        -   `renderJournalPage`: Creates a card for each journal issue, displaying its cover, title, and summary.
        -   `initializeJournalPageInteractions`: Attaches click event listeners to the generated cards to handle the file download process when a user clicks on an issue.

-   #### `renderChartPage()`
    -   **Description**: Renders the visual curriculum chart on the `/chart` page.
    -   **Logic**: It organizes all courses from `state.allCourses` into columns by semester. It also uses `state.coursePrerequisites` to build and display the expandable prerequisite information for each course.

#### c. Admin Panel Renderers

While located in this module, these functions are specifically used by `admin.js` to render lists within the admin panel.

-   #### `renderAdminPage()`
    -   **Description**: Renders the list of received messages from the "Contact Us" form into a table for the `/admin/messages` page.

-   #### `renderJournalAdminList()`
    -   **Description**: Renders a table of all journal issues for the `/admin/journal` page, including "Edit" and "Delete" buttons for each entry.