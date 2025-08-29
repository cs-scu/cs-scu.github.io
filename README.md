# Website for the Computer Science Association of SCU

This repository contains the source code for the official website of the Computer Science Scientific Association at Shahid Chamran University of Ahvaz. The project is a modern, client-side rendered Single-Page Application (SPA) built with vanilla JavaScript, HTML, and CSS, using Supabase as its backend.

## ✨ Key Features

-   **Single-Page Application (SPA)**: A fast and fluid user experience with no full-page reloads.
-   **Modular Architecture**: A clean and maintainable codebase with a clear separation of concerns.
-   **Dynamic Content**: Sections for News, Events, and a scientific Journal, all managed through a comprehensive admin panel.
-   **User Authentication**: A complete authentication system with email/password, OTP, and Google OAuth sign-in options.
-   **Interactive UI**: Features like a nested comments section with voting, event registration, and more.
-   **Admin Panel**: A secure, feature-rich panel for managing all site content, including a block-based visual editor for articles and events.
-   **Light & Dark Themes**: A persistent, user-selectable theme that adapts to system preferences.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   A local web server (e.g., `live-server` for Node.js).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cs-scu/cs-scu.github.io.git
    cd cs-scu.github.io
    ```
2.  **Configure Supabase**:
    -   Open `src/assets/js/modules/api.js`.
    -   Replace the placeholder `supabaseUrl` and `supabaseKey` with your own Supabase project credentials.

3.  **Run the application:**
    -   Use a local server to serve the `src/` directory. For example, with `live-server`:
    ```bash
    live-server src/
    ```

For more detailed setup instructions, please refer to the [**Getting Started Guide**](./docs/Getting-Started-Guide.md).

---

## 📚 Documentation

We have created comprehensive documentation to help developers understand the project's architecture and codebase.

-   **Core Concepts**
    -   [Project Structure](./docs/Project-Structure.md): An overview of the project's architecture and file organization.
    -   [State Management Guide](./docs/State-Management-Guide.md): Explains how the application's global state is managed.
    -   [Routing Guide](./docs/Routing-Guide.md): Details how the client-side SPA router works.

-   **Module Guides**
    -   [API Documentation](./docs/API-Documentation.md): A detailed reference for all functions that interact with the Supabase backend.
    -   [UI Module Guide](./docs/UI-Module-Guide.md): Explains how modals, forms, and other interactive UI elements are managed.
    -   [Components Guide](./docs/Components-Guide.md): Documents the functions responsible for rendering data into HTML.
    -   [Theme Management Guide](./docs/Theme-Management-Guide.md): Explains the implementation of the light/dark theme system.

-   **Development & Operations**
    -   [Admin Panel Guide](./docs/Admin-Panel-Guide.md): A complete guide to the features and architecture of the admin panel.
    -   [Getting Started Guide](./docs/Getting-Started-Guide.md): Step-by-step instructions for setting up the development environment.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.