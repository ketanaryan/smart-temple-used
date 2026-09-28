# Smart Temple Management System - Architecture

This document provides a comprehensive overview of the architecture, technology stack, and core features of the **Smart Temple Management System**.

## 1. System Overview

The Smart Temple Management System is a modern, full-stack web application designed to streamline temple crowd management, darshan (visit) bookings, and administrative tasks. The system is split into three primary portals:
- **Devotee Portal**: Allows users to book darshan slots, view estimated wait times, and receive QR-code e-tickets.
- **Temple Admin Portal**: Provides temple authorities with real-time queue metrics, environmental data, and live crowd predictions to manage congestion.
- **Main Admin Portal**: A global administrative interface for onboarding new temples and managing secure access codes for Temple Admins.

## 2. Technology Stack

The project utilizes a modern decoupled architecture, separating the frontend client from the backend API.

### Frontend
- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite (for fast, optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS for responsive, modern UI)
- **Icons**: Lucide React
- **Routing & State**: React Hooks (`useState`, `useEffect`), localStorage for persistence, and conditional rendering for seamless single-page application (SPA) navigation.
- **API Communication**: Axios (RESTful calls) and native WebSockets (for real-time live crowd alerts).
- **Authentication**: Supabase JS Client

### Backend
- **Language**: Python
- **Framework**: FastAPI (high-performance async API framework)
- **Database ORM**: SQLAlchemy
- **Data Validation**: Pydantic
- **Server**: Uvicorn (ASGI web server)
- **Database System**: PostgreSQL (Hosted on Supabase)

### External Services & Integrations
- **Authentication & Database Hosting**: Supabase
- **Frontend Hosting**: Vercel
- **Computer Vision (Concept/Mocked)**: YOLOv8 and ByteTrack algorithms (designed to analyze camera feeds for real-time crowd congestion alerts).

---

## 3. Core Features & Implementations

### 3.1 Authentication & Role-Based Access Control
- **Tech Used**: Supabase Auth, React, FastAPI
- **How it works**: Users sign up via the unified registration form. Supabase handles the email verification and securely stores user credentials. Upon login, Supabase issues a JWT (JSON Web Token). The frontend stores this token and attaches it as a `Bearer` token in the headers of all Axios requests. The FastAPI backend decodes and verifies this token to identify the user and their role (Devotee, Temple Admin, or Main Admin).

### 3.2 Darshan Booking & E-Tickets
- **Tech Used**: FastAPI, PostgreSQL, `qrcode.react`
- **How it works**: Devotees select a temple, date, and time slot. The backend checks availability against the `max_capacity` of the `TimeSlot`. If available, a `Booking` record is created with a unique `token_number`. The frontend dynamically generates a QR code containing a secure verification URL. When scanned, the system renders a dedicated E-Ticket view fetching real-time queue statuses.

### 3.3 Main Admin & Temple Onboarding Flow
- **Tech Used**: FastAPI, SQLAlchemy (Relational Database Design)
- **How it works**: 
  1. The Main Admin accesses the "Admin Portal" and selects an existing Temple from a dropdown.
  2. The backend generates a secure, randomized code (e.g., `KAT-8F92`) linked strictly to that `temple_id` in the database.
  3. The Main Admin shares this code with a local Temple Administrator.
  4. The Temple Administrator uses the code during signup, instantly associating their account with the correct temple and granting them `admin_id` privileges.

### 3.4 Live Queue Predictions (M/M/k Queuing Estimation)
- **Tech Used**: Python (Math/Statistics), React (UI)
- **How it works**: The backend API calculates real-time queuing metrics based on mathematical queuing theory (M/M/k model). It estimates the **People Arriving** (Arrival Rate), **Darshan Rate** (Service Rate), and computes the **Estimated Queue Size** and **Estimated Wait Time**. The frontend visualizes these complex metrics in a clean, user-friendly dashboard for Temple Admins.

### 3.5 Real-Time Crowd Monitoring & Environment Sensors
- **Tech Used**: WebSockets, FastAPI `async` endpoints
- **How it works**: Temple Admins have access to a restricted "Live Crowd Status" dashboard. This dashboard establishes a WebSocket connection with the backend to receive live, instantaneous updates about crowd congestion, queue imbalances, and environmental sensors (like Ambient Temperature and Air Quality Index) without needing to refresh the page.

## 4. Database Schema Structure
- `users`: Stores user credentials, names, and admin status.
- `temples`: Stores temple names, cities, and a foreign key to the assigned `admin_id`.
- `temple_codes`: Stores the generated admin onboarding codes, their usage status, and the specific `temple_id` they belong to.
- `time_slots`: Defines available booking windows, dates, times, and maximum capacities for each temple.
- `bookings`: Links `users` to `time_slots` and stores unique `token_numbers` and queuing status.
