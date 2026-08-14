# Tenneson Portal

Tenneson Portal is a modern school administration and student management system designed to help schools manage student records, administrators, permissions, verification, activity tracking, and audit records from a centralized web portal.

The system provides a secure administrative dashboard with role-based and permission-based access control.

---

## Overview

Tenneson Portal was built to simplify day-to-day school administration by providing a centralized platform for managing student information and administrative activities.

The portal allows authorized administrators to:

- Manage student records
- Register new students
- View and update student information
- Archive students
- Restore archived students
- Search and filter students
- Verify student IDs
- Manage administrators
- Assign administrator permissions
- Delete administrator accounts where permitted
- View activity logs
- View audit logs
- Access dashboard statistics
- Perform permission-controlled administrative actions

The system uses both frontend and backend authorization to ensure that users cannot access features beyond their assigned permissions.

---

# Features

## Authentication

Administrators can securely log into the portal using their registered email and password.

Authentication includes:

- Admin login
- JWT-based authentication
- Protected administrative routes
- Persistent login session
- Logout/session handling
- Password protection
- Authentication rate limiting

---

# Dashboard

The dashboard provides an overview of important school information.

It can display statistics such as:

- Total students
- Active students
- Archived students
- Student distribution
- Recent activities
- Quick actions

Quick Actions are dynamically displayed based on the logged-in administrator's permissions.

---

# Student Management

The student management system allows authorized administrators to manage student records.

### Student features include:

- Add student
- View students
- View student details
- Edit student information
- Archive students
- Restore students
- Search students
- Filter students
- Paginate student records
- Upload student photos
- Import student records
- Export student records
- Generate student IDs
- Generate student registration slips

Student IDs use the school's configured identification format.

Example:

```text
TCC00001
TCC00002
TCC00003