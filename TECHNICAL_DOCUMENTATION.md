# Technical Documentation: WhatsApp Message Scheduler MVP

**Author:** Manus AI
**Date:** December 18, 2025
**Project:** Google Chrome Extension for Scheduled WhatsApp Messages (Manifest V3)

This document details the analysis, design, and implementation of the Minimum Viable Product (MVP) for a Chrome extension that schedules WhatsApp messages for automatic, off-browser delivery. The architecture is designed to comply with Chrome Web Store (CWS) policies and the technical constraints of Manifest V3 (MV3).

## 1. Objective and Scope

The primary objective is to develop a reliable system for scheduling WhatsApp messages that are delivered automatically at a specified time, even if the user's browser is closed. This is achieved by offloading all persistent logic and automation to a dedicated backend service.

The functional scope is strictly limited to:
1.  **Authentication:** User sign-up and login via JWT.
2.  **Scheduling:** Collecting contact name, phone number, date, time, and message content.
3.  **Scheduled List:** Displaying messages with status tracking (Scheduled, Sent successfully, Failed, Canceled) and a cancellation action.
4.  **Delivery:** Guaranteed delivery via backend-based WhatsApp Web automation.

## 2. Detailed Technical Architecture

The system follows a three-tier, decoupled architecture: **Chrome Extension (Client)**, **Backend API (Server)**, and **WhatsApp Automation Service (Worker)**.

### 2.1. Logical Architecture

| Component | Role | Technology (MVP) | Key Functions |
| :--- | :--- | :--- | :--- |
| **Chrome Extension** | User Interface & API Gateway | Manifest V3, React, Service Worker | Handles UI (Popup), stores JWT in `chrome.storage.local`, and communicates with the Backend API. |
| **Backend API** | Central Control & Persistence | Node.js/Express, JWT, In-Memory DB (Mock) | Manages user authentication, persists scheduled messages, and triggers the Automation Service. |
| **Automation Service** | Message Delivery Execution | Playwright (Headless Chromium) | Maintains persistent user sessions (login state) and executes human-like WhatsApp Web automation for delivery. |

### 2.2. End-to-End Flow: Authentication to Status Update

The following table illustrates the secure, end-to-end process for a scheduled message:

| Step | Component | Action | Security/Compliance Note |
| :--- | :--- | :--- | :--- |
| **1. Authentication** | Extension → Backend API | `POST /api/auth/login` | Backend issues a **JWT** upon successful login/signup. The extension stores this token securely in `chrome.storage.local`. |
| **2. Scheduling** | Extension → Backend API | `POST /api/messages/schedule` | JWT is included in the `Authorization` header. Backend validates the token and saves the message to the database with `status: 'Scheduled'`. |
| **3. Delivery Trigger** | Backend API (Scheduler) | Internal Call | A cron-like job checks the database every 10 seconds for messages where `scheduledDateTime <= NOW()` and `status = 'Scheduled'`. |
| **4. Message Delivery** | Automation Service | Headless Browser Automation | The service uses the user's persistent session (stored in a dedicated `userDataDir`) to log into WhatsApp Web and send the message via Playwright. |
| **5. Status Update** | Automation Service → Backend API | Internal Call | The service reports the outcome (`Sent successfully` or `Failed`). The Backend API updates the message status in the database. |
| **6. Status Retrieval** | Extension → Backend API | `GET /api/messages` | The extension polls the API to fetch the updated list, displaying the final status to the user. |

## 3. Policy-Compliant Automation Strategy

The requirement for "browser closed" delivery necessitates backend automation, which carries inherent risks regarding WhatsApp's Terms of Service. The strategy prioritizes compliance and stability:

1.  **Off-Browser Execution:** All automation is executed on the server using **Playwright** (a robust headless browser framework). This isolates the high-risk activity from the user's machine and the Chrome Extension environment, ensuring CWS compliance.
2.  **Persistent Session:** The service uses Playwright's `launchPersistentContext` feature, storing the WhatsApp Web login state (cookies, local storage) in a dedicated directory (`/server/src/automation/sessions/user_[id]`). This allows the session to be resumed later, fulfilling the "browser closed" requirement.
3.  **Human-like Behavior:** The automation script includes explicit delays (`{ delay: 50 }` for typing, `waitForTimeout(3000)` after sending) to mimic human interaction and reduce the risk of bot detection.
4.  **Minimal Scope:** The service is strictly limited to sending a single, pre-scheduled message to a single contact. No bulk messaging, scraping, or unauthorized activities are performed.

## 4. Manifest V3 Compliance

The extension is designed as a thin client to fully comply with MV3:

*   **Service Worker:** The background script (`service-worker.js`) is non-persistent and only handles message passing between the Popup UI and the `chrome.storage` API. It uses `chrome.alarms` to keep itself alive for short periods, but all core persistence is on the backend.
*   **Permissions:** Only necessary permissions (`storage`, `alarms`, and `host_permissions` for the backend API) are requested, adhering to the principle of least privilege.
*   **UI:** The user interface is contained within the extension's popup, built with React for a clean, functional experience.

## 5. Known Limitations and Technical Risks

| Risk Category | Description | Mitigation Strategy Implemented in MVP |
| :--- | :--- | :--- |
| **WhatsApp ToS Violation** | Automation, even for personal use, can be flagged by WhatsApp, leading to account bans. | Strict adherence to human-like behavior, minimal scope, and clear documentation of the inherent risk. |
| **Scalability** | Maintaining a dedicated, persistent headless browser instance per user is resource-intensive (CPU/RAM). | The MVP uses a simple process. Future evolution requires a dedicated microservice architecture for the Automation Worker with session pooling. |
| **Reliability** | WhatsApp Web UI changes can break the Playwright selectors, causing delivery failures. | The script uses robust selectors (`div[title="Type a message"]`, `span[data-icon="send"]`) and explicit waits. Error handling is implemented to report `Failed` status. |
| **Security (MVP)** | The MVP uses an in-memory database and a hardcoded JWT secret (`JWT_SECRET`). | This is acceptable for an MVP demonstration. **Production deployment MUST use a secure database (e.g., PostgreSQL), environment variables for secrets, and proper password hashing (e.g., bcrypt).** |

## 6. Recommendations for Future Product Evolution

1.  **Real-time Status:** Implement **WebSockets** or **Server-Sent Events (SSE)** to push real-time status updates from the Backend API to the Chrome Extension, replacing the current polling mechanism.
2.  **Dedicated Queue:** Migrate the in-memory job scheduler to a dedicated, persistent message queue (e.g., Redis Queue, RabbitMQ) for guaranteed delivery and horizontal scaling.
3.  **QR Code API:** Implement an API endpoint in the Backend to generate and serve the WhatsApp Web QR code from the Playwright session to the Extension UI, enabling a seamless user linking process.

## 7. Project Folder and File Structure

The project is structured as a monorepo containing the client (extension) and server (backend) components:

```
/whatsapp-scheduler-mvp
├── /client (Chrome Extension - Manifest V3)
│   ├── /public
│   │   ├── manifest.json
│   │   └── popup.html
│   ├── /src
│   │   └── popup.jsx (React UI)
│   ├── service-worker.js (Background script)
│   └── package.json
│
└── /server (Backend API & Automation Service)
    ├── /src
    │   ├── /automation
    │   │   ├── whatsapp_worker.js (Playwright automation)
    │   │   └── sessions/ (Persistent session data)
    │   ├── scheduler.js (Job scheduler and mock DB integration)
    │   └── server.js (Express API, Auth, Endpoints)
    └── package.json
```
