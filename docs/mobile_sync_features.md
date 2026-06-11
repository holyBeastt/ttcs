# Mobile App Sync Features (Flutter to Web Backend)

This document lists the required features for the Flutter mobile application that need to interact and synchronize data with the existing Node.js/Express web backend. To support these features, the backend will need specific REST API endpoints returning JSON data.

## 1. 🔐 Authentication & Session Management
- **Login:** Send user credentials to the server and receive an authentication token (e.g., JWT) or session ID.
- **Token Management:** Use refresh tokens to maintain a persistent login state on the mobile device.
- **Logout:** Invalidate the current session or token on the server side.

## 2. 👤 Personal Information (Profile)
- **Get Profile:** Fetch the current user's profile details from the database.
- **Update Profile:** Send updated personal information (e.g., phone number, email) to the server to keep the database in sync.

## 3. 👨‍🏫 Visiting Lecturer Information (Khoa Level)
- **Fetch Lecturer List:** Retrieve the list of visiting lecturers for the faculty.
- **View Details:** Fetch basic details and assigned classes/contracts for a specific visiting lecturer.

## 4. 🔔 Notifications
- **Fetch Notifications:** Retrieve a list of the latest notifications targeted to the logged-in user.
- **View Notification Details:** Fetch the specific content of a notification.
- **Update Read Status:** Notify the server when a notification is opened so its status can be marked as "read" on the database, syncing it across all platforms.

## 5. 📊 Personal Statistics
- **Fetch Statistics Data:** Request personal statistics (e.g., total teaching hours, overtime, etc.) that the web backend calculates, returning it in a concise format for mobile dashboard widgets.

---
**Note for Backend Development:**
Since the current Node.js backend primarily serves EJS templates, new RESTful endpoints (e.g., `/api/v1/mobile/...`) must be created or existing AJAX endpoints must be extended to return structured JSON payloads to support the mobile application synchronization.
