# Smart Temple Management System - Architecture

This document provides a comprehensive overview of the architecture, technology stack, and core features of the **Smart Temple Management System**, with a deep dive into the high-performance Machine Learning & Computer Vision pipeline.

## 1. System Overview

The Smart Temple Management System is an enterprise-grade, full-stack web application designed to revolutionize temple crowd management, darshan (visit) bookings, and administrative tasks. The system is split into three primary portals:
- **Devotee Portal**: Allows users to book darshan slots, view estimated wait times, and receive QR-code e-tickets.
- **Temple Admin Portal**: Provides temple authorities with real-time queue metrics, environmental data, and live crowd predictions to manage congestion.
- **Main Admin Portal**: A global administrative interface for onboarding new temples and managing secure access codes for Temple Admins.

---

## 2. Advanced AI & Computer Vision Pipeline

To ensure absolute safety and prevent stampedes, the system heavily relies on a cutting-edge Machine Learning pipeline that processes live CCTV feeds in real-time.

### 2.1 Object Detection with YOLOv8
- **Technology**: Ultralytics YOLOv8 (You Only Look Once, version 8).
- **Implementation**: We utilize the YOLOv8 model optimized for edge devices (such as NVIDIA Jetson Nano or local edge servers) to achieve high Frame Per Second (FPS) inference. YOLOv8 is highly accurate at drawing bounding boxes around human subjects even in dense, highly congested temple crowds.
- **Why YOLOv8?**: It provides state-of-the-art accuracy while maintaining the low latency required for real-time alerting.

### 2.2 Multi-Object Tracking (MOT) with ByteTrack
- **Technology**: ByteTrack algorithm.
- **Implementation**: Simply detecting people frame-by-frame leads to wild inaccuracies (double-counting). We integrated **ByteTrack**, an advanced tracking-by-detection algorithm. 
- **Avoiding Duplicate Counts**: ByteTrack associates bounding boxes across consecutive frames by matching both high-confidence and low-confidence detections. If a devotee is temporarily occluded by a pillar or another person, ByteTrack remembers their trajectory and re-assigns them the same tracking ID when they reappear, ensuring **zero duplicate counting**.

### 2.3 Spatial Zone Logic & Real-Time Alerts
- **Technology**: OpenCV, FastAPI WebSockets.
- **Implementation**: The camera frames are divided into specific "Polygon Zones" (e.g., Zone A: Sanctum Sanctorum, Zone B: Waiting Hall). 
- **Data Flow**: As the ML pipeline processes the frames, it calculates the exact crowd density per zone. This metric is transmitted via lightning-fast **WebSockets** to the FastAPI backend, which immediately broadcasts an ALERT: HIGH CONGESTION payload to the Temple Admin's dashboard if a threshold is breached.

---

## 3. Technology Stack

The project utilizes a modern decoupled architecture, separating the frontend client, backend API, and ML inference edge nodes.

### Frontend
- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite (for fast, optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS for responsive, modern UI)
- **Icons**: Lucide React
- **Routing & State**: React Hooks (useState, useEffect), localStorage for persistence.
- **API Communication**: Axios (RESTful calls) and native WebSockets (for sub-second live crowd alerts).

### Backend
- **Language**: Python
- **Framework**: FastAPI (high-performance async API framework, ideal for ML microservices)
- **Database ORM**: SQLAlchemy
- **Data Validation**: Pydantic
- **Server**: Uvicorn (ASGI web server)
- **Database System**: PostgreSQL (Hosted on Supabase)

### External Services & Integrations
- **Authentication & Database Hosting**: Supabase
- **Frontend Hosting**: Vercel

---

## 4. Core Features & Implementations

### 4.1 Authentication & Role-Based Access Control
- **Tech Used**: Supabase Auth, React, FastAPI
- **How it works**: Users sign up via the unified registration form. Supabase handles the email verification and securely stores user credentials. Upon login, Supabase issues a JWT (JSON Web Token). The frontend stores this token and attaches it as a Bearer token in the headers of all Axios requests. The FastAPI backend decodes and verifies this token to identify the user and their role.

### 4.2 Darshan Booking & E-Tickets
- **Tech Used**: FastAPI, PostgreSQL, qrcode.react
- **How it works**: Devotees select a temple, date, and time slot. The backend checks availability against the max_capacity of the TimeSlot. If available, a Booking record is created with a unique 	oken_number. The frontend dynamically generates a QR code containing a secure verification URL. When scanned, the system renders a dedicated E-Ticket view fetching real-time queue statuses.

### 4.3 Main Admin & Temple Onboarding Flow
- **Tech Used**: FastAPI, SQLAlchemy
- **How it works**: 
  1. The Main Admin accesses the "Admin Portal" and selects an existing Temple from a dropdown.
  2. The backend generates a secure, randomized code (e.g., KAT-8F92) linked strictly to that 	emple_id.
  3. The Main Admin shares this code with a local Temple Administrator.
  4. The Temple Administrator uses the code during signup, instantly associating their account with the correct temple.

### 4.4 Live Queue Predictions (M/M/k Queuing Estimation)
- **Tech Used**: Python (Math/Statistics), React (UI)
- **How it works**: The backend API calculates real-time queuing metrics based on mathematical queuing theory (M/M/k model). It estimates the **People Arriving** (Arrival Rate), **Darshan Rate** (Service Rate), and computes the **Estimated Queue Size** and **Estimated Wait Time**. 

## 5. Database Schema Structure
- users: Stores user credentials, names, and admin status.
- 	emples: Stores temple names, cities, and a foreign key to the assigned dmin_id.
- 	emple_codes: Stores the generated admin onboarding codes, their usage status, and the specific 	emple_id they belong to.
- 	ime_slots: Defines available booking windows, dates, times, and maximum capacities for each temple.
- ookings: Links users to 	ime_slots and stores unique 	oken_numbers and queuing status.
