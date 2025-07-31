# Course Management Platform

A comprehensive backend system for academic institutions to manage course allocations, track facilitator activities, and streamline academic coordination. Built with Node.js, Express, MySQL, and Redis with full internationalization support.

## 🌟 Features

### Core Modules

1. **Course Allocation System**
   - Assign facilitators to course modules
   - Manage course offerings by trimester, cohort, and intake period
   - Role-based access control (Managers can create/update, Facilitators can view)
   - Support for online, in-person, and hybrid delivery modes

2. **Facilitator Activity Tracker (FAT)**
   - Weekly activity log submissions by facilitators
   - Track attendance, grading status, course moderation, and administrative tasks
   - Automated notification system with Redis queues
   - Manager oversight and compliance monitoring

3. **Student Reflection Page with i18n/l10n**
   - Multilingual reflection interface (English, French)
   - Dynamic language switching 
   - Responsive design with modern UI/UX
   - Hosted via GitHub Pages


### Technical Features

- **Authentication & Authorization**: JWT-based with role-based access control
- **Database**: MySQL with Sequelize ORM
- **Notifications**: Redis-backed queue system with automated alerts
- **API Documentation**: Comprehensive Swagger/OpenAPI documentation
- **Testing**: Extensive unit test coverage with Jest
- **Security**: Input validation, SQL injection prevention, rate limiting
- **Internationalization**: Multi-language support in reflection page

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Redis (v6.0 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nasimwe/course-management-platform.git
   cd course-management-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create database**
   ```sql
   CREATE DATABASE course_management_dev;
   CREATE DATABASE course_management_test;
   ```

4. **Run database migrations and seed data**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - API: http://localhost:3000
   - Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

## 📊 Database Schema

### Core Entities

```
Users (Base authentication)
├── Managers (Academic managers)
├── Facilitators (Course instructors)
└── Students (Learners)

Academic Structure
├── Modules (Course subjects)
├── Cohorts (Student groups)
├── Classes (Academic terms)
└── Modes (Delivery methods)

Operational
├── CourseOfferings (Course allocations)
└── ActivityTrackers (Weekly activity logs)
```

### Key Relationships

```sql
-- User profiles (1:1)
User → Manager/Facilitator/Student

-- Course structure (M:N)
Module + Cohort + Class + Mode = CourseOffering

-- Activity tracking (1:M)
CourseOffering → ActivityTracker (weekly logs)
Facilitator → ActivityTracker (ownership)
```

## 🔐 Authentication Flow

### Registration
```javascript
POST /api/auth/register
{
  "email": "facilitator@university.edu",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "facilitator",
  "profileData": {
    "employeeId": "FAC001",
    "specialization": "Computer Science"
  }
}
```

### Login
```javascript
POST /api/auth/login
{
  "email": "facilitator@university.edu",
  "password": "SecurePass123"
}

// Response
{
  "status": "success",
  "data": {
    "user": { ... },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresIn": "24h"
  }
}
```

### Token Usage
```javascript
// Include in all protected requests
Headers: {
  "Authorization": "Bearer jwt_token_here"
}
```

## 📚 API Documentation

### Course Allocations

#### Create Course Allocation (Manager Only)
```javascript
POST /api/course-allocations
{
  "moduleId": 1,
  "cohortId": 1,
  "classId": 1,
  "modeId": 1,
  "facilitatorId": 1,
  "schedule": "Monday, Wednesday, Friday 10:00-12:00",
  "location": "Room 101"
}
```

#### Get Course Allocations
```javascript
GET /api/course-allocations?facilitatorId=1&status=active
```

#### Assign Facilitator
```javascript
PATCH /api/course-allocations/1/assign-facilitator
{
  "facilitatorId": 2
}
```

### Activity Tracking

#### Submit Activity Log
```javascript
POST /api/facilitator-activities
{
  "allocationId": 1,
  "weekNumber": 1,
  "attendance": [true, true, false, true, true],
  "formativeOneGrading": "Done",
  "formativeTwoGrading": "Pending",
  "summativeGrading": "Not Started",
  "courseModeration": "Done",
  "intranetSync": "Done",
  "gradeBookStatus": "Pending",
  "notes": "Good week overall"
}
```

#### Submit Activity Log
```javascript
PATCH /api/facilitator-activities/1/submit
```

### Dashboard Statistics

#### General Dashboard
```javascript
GET /api/dashboard/stats
```

#### Facilitator Dashboard
```javascript
GET /api/dashboard/facilitator-stats
```

#### Manager Dashboard
```javascript
GET /api/dashboard/manager-stats
```

## 🔔 Notification System

### Redis Queue Architecture

```javascript
// Queue Types
- emailQueue: Email notifications
- reminderQueue: Facilitator reminders
- alertQueue: Manager alerts

// Automated Schedules
- Daily overdue check: 9:00 AM
- Weekly deadline reminders: Monday 10:00 AM
```

### Notification Types

1. **Facilitator Reminders**
   - Weekly submission deadlines
   - Overdue activity logs
   - Course assignment notifications

2. **Manager Alerts**
   - Overdue submissions
   - Late submissions
   - Critical deadlines
   - Unassigned courses

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

### Test Structure
```
__tests__/
├── models/
│   ├── User.test.js
│   ├── ActivityTracker.test.js
│   └── ...
```

### Sample Test Coverage
- **User Model**: Authentication, validation, associations
- **ActivityTracker Model**: Business logic, progress tracking
- **AuthService**: Registration, login, token management

## 🌍 Internationalization (i18n)

### Student Reflection Page

   - Link [My Reflections](https://nasimwe.github.io/i18n/)


## 🔧 Configuration

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=course_management_dev
DB_USER=root
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_32_character_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Database Configuration

```javascript
// config/database.js
module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
```

## 📈 Performance & Monitoring

### Built-in Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Compression**: Gzip compression for responses
- **Connection Pooling**: MySQL connection pooling
- **Queue Monitoring**: Redis queue statistics
- **Error Logging**: Comprehensive error tracking

### Monitoring Endpoints

```javascript
GET /health                    // Basic health check
GET /api/dashboard/stats      // System statistics
GET /api/dashboard/notifications // Recent notifications
```

## 🚀 Deployment

### Production Checklist

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   DB_SSL=true
   LOG_LEVEL=error
   ```

2. **Database Optimization**
   - Enable SSL connections
   - Configure connection pooling
   - Set up database backups

3. **Security Hardening**
   - Use strong JWT secrets (32+ characters)
   - Enable HTTPS
   - Configure CORS properly
   - Set up rate limiting

4. **Performance Optimization**
   - Enable compression
   - Configure Redis persistence
   - Set up database indexing


## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```
3. **Write tests for new functionality**
4. **Implement features**
5. **Run test suite**
   ```bash
   npm test
   ```
6. **Submit pull request**

### Code Style

- **ESLint**: Configured for Node.js best practices
- **Prettier**: Automatic code formatting
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: JSDoc for functions and classes

### Commit Convention

```bash
git commit -m "feat: add user authentication system"
git commit -m "fix: resolve database connection issue"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for User model"
```



## 📄 License

This project is licensed under the MIT License





