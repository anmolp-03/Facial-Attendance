# Smart Attendance Management System with Geofencing and Face Recognition

## Overview

The **Smart Attendance Management System** is an enterprise-grade, full-stack platform designed to automate and secure employee attendance processes for modern organizations. Combining advanced geofencing and facial recognition features, the system ensures that attendance can only be marked within authorized office locations, leveraging geometric authentication for maximum security and convenience. The platform is built with a strong focus on compliance, scalability, and user experience, providing role-based dashboards and actionable insights for both administrators and employees.

## Key Features

- **Geofencing Enforcement:**  
  Attendance check-in and check-out are restricted to predefined office locations using the browser’s Geolocation API, effectively preventing location spoofing and time fraud.

- **Facial Recognition Integration:**  
  Secure, contactless attendance using device cameras and advanced face recognition algorithms. The system ensures only authorized personnel can mark attendance.

- **Role-Based Dashboards:**  
  Distinct, dynamic dashboards for employees and administrators. Employees can view their attendance history, while admins get real-time analytics, visualizations, and workforce insights.

- **Modular, Scalable UI:**  
  Built with React (Next.js) and TypeScript, featuring reusable, maintainable UI components and state management best practices for easy future extensibility.

- **Data Security & Compliance:**  
  Secure authentication (JWT), privacy-first data handling, and compliance with modern security standards.

- **Responsive and Intuitive UX:**  
  Mobile-friendly interfaces and intuitive user flows ensure high adoption and satisfaction across all user roles.

## Technologies Used

- **Frontend:** React.js, Tailwind CSS, Modern UI Libraries
- **Backend:** Node.js, Express.js, face recognition libraries, RESTful API architecture
- **APIs/Integration:** RESTful APIs, JWT Authentication, Geolocation API, WebRTC/MediaDevices API
- **Analytics:** Data Visualization (Recharts)
- **Other:** Modular component architecture, secure authentication flows

## Impact

This project showcases expertise in building secure, scalable, and user-centered web applications. It addresses real-world business challenges such as location-based access control and biometric authentication, delivering a robust solution for accurate and fraud-proof attendance management.

## Quick Start

### Prerequisites

- Node.js & npm
- Python 3.8+ (for backend, if applicable)
- Modern browser with camera and geolocation support

### Running the Frontend

```bash
cd New_frontend
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Backend

```bash
cd face_recognition_service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Usage

1. **Log in** with your assigned credentials.
2. **Check-in/out** by scanning your face within the office geofence.
3. **View dashboards:** Employees track their attendance; admins monitor workforce analytics and compliance in real time.
