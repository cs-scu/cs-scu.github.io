# Theme Management Guide (`theme.js` & `admin-theme.js`)

This document explains the functionality of the theme management modules. The project uses two separate but similar files, `theme.js` for the main site and `admin-theme.js` for the admin panel, to handle visual themes.

### 1. Core Purpose

The primary goal of these modules is to allow users to switch between **light**, **dark**, and a **system-default** theme. The chosen preference is persisted across sessions using the browser's `localStorage`.

### 2. `theme.js` (Main Site)

This module is more complex as it also integrates with the `particles.js` background animation.

#### Key Constants & Variables
-   `THEME_STATES`: An array `['system', 'light', 'dark']` that defines the cycle of available themes.
-   `THEME_TITLES`: An object that maps theme states to their Persian names for use in tooltips.

#### Key Functions

-   #### `getSystemThemeClass()`
    -   **Description**: A helper function that checks the user's operating system preference using the `prefers-color-scheme` media query.
    -   **Returns**: `'dark-theme'` if the OS is in dark mode, otherwise `'light-theme'`.

-   #### `applyVisualTheme(themeClass)`
    -   **Description**: This is the core function for applying visual changes. It directly manipulates the DOM.
    -   **Actions**:
        1.  Removes any existing theme classes (`light-theme`, `dark-theme`) from the `<body>` element.
        2.  Adds the new `themeClass` to the `<body>`.
        3.  **Particle Integration**: If a `particles.js` instance exists, it updates the particle color and shadow to match the new theme and then refreshes the canvas.

-   #### `setThemeState(themeState)`
    -   **Description**: This function acts as the controller. It takes a theme state (`'system'`, `'light'`, or `'dark'`) and orchestrates the theme update.
    -   **Actions**:
        1.  Updates the `data-theme-state` and `title` attributes on the theme toggle button to reflect the current state.
        2.  Determines the correct CSS class to apply (calling `getSystemThemeClass` if the state is `'system'`).
        3.  Calls `applyVisualTheme()` to make the visual changes.
        4.  Saves the new `themeState` to `localStorage` to persist the choice.

-   #### `initializeTheme()` (Exported)
    -   **Description**: The main entry point for the module, called by `main.js`.
    -   **Actions**:
        1.  Retrieves the saved theme state from `localStorage` or defaults to `'system'`.
        2.  Calls `setThemeState()` to apply the initial theme on page load.
        3.  Adds a `click` event listener to the theme toggle button, which cycles through the `THEME_STATES` array and calls `setThemeState()` with the next state.
        4.  Adds a `change` event listener to the `prefers-color-scheme` media query. This ensures that if the user has `'system'` theme selected, the site's theme will automatically update when they change their OS theme.

---

### 3. `admin-theme.js` (Admin Panel)

This is a simplified version of `theme.js` tailored for the admin panel.

-   **Logic**: It contains the same core functions (`getSystemThemeClass`, `applyAdminTheme`) but lacks the integration with `particles.js`.
-   **Initialization**: The `initializeAdminTheme` function reads the same `themeState` from `localStorage`, ensuring that the theme choice is consistent between the main site and the admin panel. It also listens for storage events, so if the theme is changed on the main site, the admin panel's theme will update in real-time if open in another tab.