const { sequelize, User, Manager, Facilitator, Student, Module, Cohort, Class, Mode, CourseOffering, ActivityTracker } = require('../models');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: true });
      console.log('Database tables recreated');
    }

    // Seed Modes
    console.log('📚 Seeding delivery modes...');
    const modes = await Mode.bulkCreate([
      {
        name: 'Online',
        type: 'online',
        description: 'Fully online delivery via video conferencing and digital platforms',
        requirements: 'Stable internet connection, computer/tablet, webcam, microphone',
        maxCapacity: null // Unlimited
      },
      {
        name: 'In-Person',
        type: 'in-person',
        description: 'Traditional classroom-based delivery',
        requirements: 'Physical attendance at campus location',
        maxCapacity: 30
      },
      {
        name: 'Hybrid',
        type: 'hybrid',
        description: 'Combination of online and in-person delivery',
        requirements: 'Flexible attendance options, technology access for online components',
        maxCapacity: 50
      }
    ]);

    // Seed Modules
    console.log('📖 Seeding modules...');
    const modules = await Module.bulkCreate([
      {
        code: 'CS101',
        name: 'Introduction to Computer Science',
        description: 'Fundamental concepts of computer science and programming',
        credits: 3,
        prerequisites: 'None',
        department: 'Computer Science',
        level: 'foundation',
        maxEnrollment: 30
      },
      {
        code: 'CS201',
        name: 'Data Structures and Algorithms',
        description: 'Study of data structures and algorithmic problem solving',
        credits: 4,
        prerequisites: 'CS101',
        department: 'Computer Science',
        level: 'intermediate',
        maxEnrollment: 25
      },
      {
        code: 'CS301',
        name: 'Database Systems',
        description: 'Design and implementation of database systems',
        credits: 3,
        prerequisites: 'CS201',
        department: 'Computer Science',
        level: 'advanced',
        maxEnrollment: 20
      },
      {
        code: 'MATH101',
        name: 'Calculus I',
        description: 'Differential and integral calculus',
        credits: 4,
        prerequisites: 'Pre-calculus or equivalent',
        department: 'Mathematics',
        level: 'foundation',
        maxEnrollment: 35
      },
      {
        code: 'ENG101',
        name: 'Academic Writing',
        description: 'Academic writing skills and research methods',
        credits: 3,
        prerequisites: 'None',
        department: 'English',
        level: 'foundation',
        maxEnrollment: 25
      },
      {
        code: 'BUS201',
        name: 'Business Management',
        description: 'Principles of business management and organization',
        credits: 3,
        prerequisites: 'None',
        department: 'Business',
        level: 'intermediate',
        maxEnrollment: 40
      }
    ]);

    // Seed Classes (Academic Terms)
    console.log('🗓️ Seeding academic classes...');
    const classes = await Class.bulkCreate([
      {
        name: '2024S',
        startDate: '2024-01-15',
        endDate: '2024-05-15',
        trimester: 'T1',
        year: 2024,
        graduationDate: '2024-05-30',
        description: 'Spring 2024 Trimester'
      },
      {
        name: '2024M',
        startDate: '2024-05-20',
        endDate: '2024-09-20',
        trimester: 'T2',
        year: 2024,
        graduationDate: '2024-10-05',
        description: 'Summer 2024 Trimester'
      },
      {
        name: '2024F',
        startDate: '2024-09-25',
        endDate: '2025-01-25',
        trimester: 'T3',
        year: 2024,
        graduationDate: '2025-02-10',
        description: 'Fall 2024 Trimester'
      },
      {
        name: '2025S',
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        trimester: 'T1',
        year: 2025,
        graduationDate: '2025-06-05',
        description: 'Spring 2025 Trimester'
      }
    ]);

    // Seed Cohorts
    console.log('👥 Seeding cohorts...');
    const cohorts = await Cohort.bulkCreate([
      {
        name: '2024 Computer Science Cohort',
        code: 'CS2024FT',
        startDate: '2024-01-15',
        endDate: '2025-01-15',
        program: 'Computer Science',
        intakePeriod: 'FT',
        maxCapacity: 30,
        currentEnrollment: 0,
        status: 'active',
        description: 'Full-time Computer Science program cohort for 2024'
      },
      {
        name: '2024 Business Management Cohort',
        code: 'BUS2024HT1',
        startDate: '2024-01-15',
        endDate: '2024-12-15',
        program: 'Business Management',
        intakePeriod: 'HT1',
        maxCapacity: 40,
        currentEnrollment: 0,
        status: 'active',
        description: 'Half-time Business Management program cohort'
      },
      {
        name: '2024 Mathematics Cohort',
        code: 'MATH2024FT',
        startDate: '2024-09-01',
        endDate: '2025-08-31',
        program: 'Mathematics',
        intakePeriod: 'FT',
        maxCapacity: 25,
        currentEnrollment: 0,
        status: 'active',
        description: 'Full-time Mathematics program cohort'
      }
    ]);

    // Seed Users and Profiles
    console.log('👤 Seeding users...');

    // Create Managers
    const managerUsers = await User.bulkCreate([
      {
        email: 'admin@university.edu',
        password: 'AdminPass123',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'manager',
        isActive: true
      },
      {
        email: 'manager1@university.edu',
        password: 'ManagerPass123',
        firstName: 'Michael',
        lastName: 'Brown',
        role: 'manager',
        isActive: true
      },
      {
        email: 'manager2@university.edu',
        password: 'ManagerPass123',
        firstName: 'Emily',
        lastName: 'Davis',
        role: 'manager',
        isActive: true
      }
    ]);

    const managers = await Manager.bulkCreate([
      {
        userId: managerUsers[0].id,
        department: 'Academic Affairs',
        employeeId: 'MGR001',
        accessLevel: 'admin',
        phoneNumber: '+1234567890',
        office: 'Admin Building 201'
      },
      {
        userId: managerUsers[1].id,
        department: 'Computer Science',
        employeeId: 'MGR002',
        accessLevel: 'senior',
        phoneNumber: '+1234567891',
        office: 'CS Building 105'
      },
      {
        userId: managerUsers[2].id,
        department: 'Business',
        employeeId: 'MGR003',
        accessLevel: 'standard',
        phoneNumber: '+1234567892',
        office: 'Business Building 301'
      }
    ]);

    // Create Facilitators
    const facilitatorUsers = await User.bulkCreate([
      {
        email: 'jane.smith@university.edu',
        password: 'FacilitatorPass123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'facilitator',
        isActive: true
      },
      {
        email: 'john.doe@university.edu',
        password: 'FacilitatorPass123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'facilitator',
        isActive: true
      },
      {
        email: 'alice.wilson@university.edu',
        password: 'FacilitatorPass123',
        firstName: 'Alice',
        lastName: 'Wilson',
        role: 'facilitator',
        isActive: true
      },
      {
        email: 'bob.taylor@university.edu',
        password: 'FacilitatorPass123',
        firstName: 'Bob',
        lastName: 'Taylor',
        role: 'facilitator',
        isActive: true
      },
      {
        email: 'carol.white@university.edu',
        password: 'FacilitatorPass123',
        firstName: 'Carol',
        lastName: 'White',
        role: 'facilitator',
        isActive: true
      }
    ]);

    const facilitators = await Facilitator.bulkCreate([
      {
        userId: facilitatorUsers[0].id,
        employeeId: 'FAC001',
        specialization: 'Computer Science',
        qualification: 'PhD in Computer Science',
        experience: 8,
        phoneNumber: '+1234567893',
        isAvailable: true,
        maxCourseLoad: 4
      },
      {
        userId: facilitatorUsers[1].id,
        employeeId: 'FAC002',
        specialization: 'Software Engineering',
        qualification: 'Master in Software Engineering',
        experience: 5,
        phoneNumber: '+1234567894',
        isAvailable: true,
        maxCourseLoad: 5
      },
      {
        userId: facilitatorUsers[2].id,
        employeeId: 'FAC003',
        specialization: 'Mathematics',
        qualification: 'PhD in Mathematics',
        experience: 12,
        phoneNumber: '+1234567895',
        isAvailable: true,
        maxCourseLoad: 3
      },
      {
        userId: facilitatorUsers[3].id,
        employeeId: 'FAC004',
        specialization: 'Business Management',
        qualification: 'MBA',
        experience: 6,
        phoneNumber: '+1234567896',
        isAvailable: true,
        maxCourseLoad: 6
      },
      {
        userId: facilitatorUsers[4].id,
        employeeId: 'FAC005',
        specialization: 'English Literature',
        qualification: 'Master in English Literature',
        experience: 4,
        phoneNumber: '+1234567897',
        isAvailable: true,
        maxCourseLoad: 5
      }
    ]);

    // Create Students
    const studentUsers = await User.bulkCreate([
      {
        email: 'student1@student.university.edu',
        password: 'StudentPass123',
        firstName: 'David',
        lastName: 'Garcia',
        role: 'student',
        isActive: true
      },
      {
        email: 'student2@student.university.edu',
        password: 'StudentPass123',
        firstName: 'Maria',
        lastName: 'Rodriguez',
        role: 'student',
        isActive: true
      },
      {
        email: 'student3@student.university.edu',
        password: 'StudentPass123',
        firstName: 'James',
        lastName: 'Miller',
        role: 'student',
        isActive: true
      },
      {
        email: 'student4@student.university.edu',
        password: 'StudentPass123',
        firstName: 'Lisa',
        lastName: 'Anderson',
        role: 'student',
        isActive: true
      },
      {
        email: 'student5@student.university.edu',
        password: 'StudentPass123',
        firstName: 'Kevin',
        lastName: 'Thomas',
        role: 'student',
        isActive: true
      }
    ]);

    const students = await Student.bulkCreate([
      {
        userId: studentUsers[0].id,
        studentId: 'STU001',
        cohortId: cohorts[0].id,
        program: 'Computer Science',
        yearOfStudy: 1,
        status: 'active',
        dateOfBirth: '2000-05-15',
        phoneNumber: '+1234567898',
        address: '123 Student St, University City',
        emergencyContact: 'Parent: +1234567899'
      },
      {
        userId: studentUsers[1].id,
        studentId: 'STU002',
        cohortId: cohorts[0].id,
        program: 'Computer Science',
        yearOfStudy: 1,
        status: 'active',
        dateOfBirth: '1999-12-22',
        phoneNumber: '+1234567900',
        address: '456 Campus Ave, University City',
        emergencyContact: 'Parent: +1234567901'
      },
      {
        userId: studentUsers[2].id,
        studentId: 'STU003',
        cohortId: cohorts[1].id,
        program: 'Business Management',
        yearOfStudy: 2,
        status: 'active',
        dateOfBirth: '1998-08-10',
        phoneNumber: '+1234567902',
        address: '789 University Blvd, University City',
        emergencyContact: 'Spouse: +1234567903'
      },
      {
        userId: studentUsers[3].id,
        studentId: 'STU004',
        cohortId: cohorts[1].id,
        program: 'Business Management',
        yearOfStudy: 1,
        status: 'active',
        dateOfBirth: '2001-03-18',
        phoneNumber: '+1234567904',
        address: '321 College Dr, University City',
        emergencyContact: 'Parent: +1234567905'
      },
      {
        userId: studentUsers[4].id,
        studentId: 'STU005',
        cohortId: cohorts[2].id,
        program: 'Mathematics',
        yearOfStudy: 1,
        status: 'active',
        dateOfBirth: '2000-11-07',
        phoneNumber: '+1234567906',
        address: '654 Academic Way, University City',
        emergencyContact: 'Parent: +1234567907'
      }
    ]);

    // Update cohort enrollment counts
    for (const cohort of cohorts) {
      await cohort.updateEnrollmentCount();
    }

    // Seed Course Offerings
    console.log('📚 Seeding course offerings...');
    const courseOfferings = await CourseOffering.bulkCreate([
      {
        moduleId: modules[0].id, // CS101
        cohortId: cohorts[0].id,
        classId: classes[3].id, // 2025S
        facilitatorId: facilitators[0].id,
        managerId: managers[1].id,
        modeId: modes[2].id, // Hybrid
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        maxEnrollment: 30,
        currentEnrollment: 2,
        status: 'active',
        schedule: 'Monday, Wednesday, Friday 10:00-12:00',
        location: 'CS Building Room 101 / Zoom ID: 123456789',
        notes: 'Introduction course for CS program'
      },
      {
        moduleId: modules[1].id, // CS201
        cohortId: cohorts[0].id,
        classId: classes[3].id,
        facilitatorId: facilitators[1].id,
        managerId: managers[1].id,
        modeId: modes[0].id, // Online
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        maxEnrollment: 25,
        currentEnrollment: 0,
        status: 'scheduled',
        schedule: 'Tuesday, Thursday 14:00-16:00',
        location: 'Zoom Meeting ID: 987654321',
        notes: 'Advanced data structures course'
      },
      {
        moduleId: modules[3].id, // MATH101
        cohortId: cohorts[2].id,
        classId: classes[3].id,
        facilitatorId: facilitators[2].id,
        managerId: managers[0].id,
        modeId: modes[1].id, // In-Person
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        maxEnrollment: 35,
        currentEnrollment: 1,
        status: 'active',
        schedule: 'Monday, Wednesday, Friday 09:00-10:30',
        location: 'Math Building Room 205',
        notes: 'Fundamental calculus course'
      },
      {
        moduleId: modules[5].id, // BUS201
        cohortId: cohorts[1].id,
        classId: classes[3].id,
        facilitatorId: facilitators[3].id,
        managerId: managers[2].id,
        modeId: modes[2].id, // Hybrid
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        maxEnrollment: 40,
        currentEnrollment: 2,
        status: 'active',
        schedule: 'Tuesday, Thursday 10:00-12:00',
        location: 'Business Building Room 301 / Zoom ID: 456789123',
        notes: 'Core business management principles'
      },
      {
        moduleId: modules[4].id, // ENG101
        cohortId: cohorts[0].id,
        classId: classes[3].id,
        facilitatorId: facilitators[4].id,
        managerId: managers[0].id,
        modeId: modes[0].id, // Online
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        maxEnrollment: 25,
        currentEnrollment: 2,
        status: 'active',
        schedule: 'Monday, Wednesday 16:00-17:30',
        location: 'Zoom Meeting ID: 789123456',
        notes: 'Academic writing skills development'
      },
      {
        moduleId: modules[2].id, // CS301
        cohortId: cohorts[0].id,
        classId: classes[3].id,
        facilitatorId: null, // Unassigned
        managerId: managers[1].id,
        modeId: modes[1].id, // In-Person
        startDate: '2025-01-20',
        endDate: '2025-05-20',
        maxEnrollment: 20,
        currentEnrollment: 0,
        status: 'draft',
        schedule: 'TBD',
        location: 'TBD',
        notes: 'Advanced database systems - need facilitator assignment'
      }
    ]);

    // Seed Activity Trackers
    console.log('📋 Seeding activity trackers...');
    const activityTrackers = await ActivityTracker.bulkCreate([
      {
        allocationId: courseOfferings[0].id,
        facilitatorId: facilitators[0].id,
        weekNumber: 1,
        attendance: [true, true, true, true, true],
        formativeOneGrading: 'Done',
        formativeTwoGrading: 'Pending',
        summativeGrading: 'Not Started',
        courseModeration: 'Done',
        intranetSync: 'Done',
        gradeBookStatus: 'Pending',
        notes: 'Good start to the semester. Students are engaged.',
        submittedAt: new Date('2025-01-27T10:00:00Z')
      },
      {
        allocationId: courseOfferings[0].id,
        facilitatorId: facilitators[0].id,
        weekNumber: 2,
        attendance: [true, true, false, true, true],
        formativeOneGrading: 'Done',
        formativeTwoGrading: 'Done',
        summativeGrading: 'Not Started',
        courseModeration: 'Pending',
        intranetSync: 'Done',
        gradeBookStatus: 'Done',
        notes: 'One student absent on Wednesday. Covered advanced topics.',
        submittedAt: new Date('2025-02-03T15:30:00Z')
      },
      {
        allocationId: courseOfferings[2].id,
        facilitatorId: facilitators[2].id,
        weekNumber: 1,
        attendance: [true, true, true, true, true],
        formativeOneGrading: 'Pending',
        formativeTwoGrading: 'Not Started',
        summativeGrading: 'Not Started',
        courseModeration: 'Done',
        intranetSync: 'Done',
        gradeBookStatus: 'Pending',
        notes: 'Calculus fundamentals covered. Students need more practice.',
        submittedAt: new Date('2025-01-26T16:45:00Z')
      },
      {
        allocationId: courseOfferings[3].id,
        facilitatorId: facilitators[3].id,
        weekNumber: 1,
        attendance: [true, true, true, true, false],
        formativeOneGrading: 'Done',
        formativeTwoGrading: 'Pending',
        summativeGrading: 'Not Started',
        courseModeration: 'Done',
        intranetSync: 'Done',
        gradeBookStatus: 'Done',
        notes: 'Business principles introduction went well.',
        submittedAt: new Date('2025-01-28T14:20:00Z')
      },
      {
        allocationId: courseOfferings[4].id,
        facilitatorId: facilitators[4].id,
        weekNumber: 1,
        attendance: [true, true, true, true, true],
        formativeOneGrading: 'Done',
        formativeTwoGrading: 'Done',
        summativeGrading: 'Not Started',
        courseModeration: 'Done',
        intranetSync: 'Done',
        gradeBookStatus: 'Done',
        notes: 'Writing skills assessment completed. Good participation.',
        submittedAt: new Date('2025-01-29T11:15:00Z')
      },
      // Some pending/overdue entries for demonstration
      {
        allocationId: courseOfferings[0].id,
        facilitatorId: facilitators[0].id,
        weekNumber: 3,
        attendance: [true, true, true, false, true],
        formativeOneGrading: 'Pending',
        formativeTwoGrading: 'Not Started',
        summativeGrading: 'Not Started',
        courseModeration: 'Pending',
        intranetSync: 'Done',
        gradeBookStatus: 'Pending',
        notes: 'Week 3 activities - submission pending',
        submittedAt: null // Not submitted yet
      }
    ]);

    console.log('Database seeding completed successfully!');
    console.log('');
    console.log('Seeded Data Summary:');
    console.log(`   Users: ${managerUsers.length + facilitatorUsers.length + studentUsers.length}`);
    console.log(`   - Managers: ${managers.length}`);
    console.log(`   - Facilitators: ${facilitators.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   Modules: ${modules.length}`);
    console.log(`   Cohorts: ${cohorts.length}`);
    console.log(`   Classes: ${classes.length}`);
    console.log(`   Modes: ${modes.length}`);
    console.log(`   Course Offerings: ${courseOfferings.length}`);
    console.log(`   Activity Trackers: ${activityTrackers.length}`);
    console.log('');
    console.log('Sample Login Credentials:');
    console.log('   Admin Manager: admin@university.edu / AdminPass123');
    console.log('   CS Manager: manager1@university.edu / ManagerPass123');
    console.log('   Facilitator: jane.smith@university.edu / FacilitatorPass123');
    console.log('   Student: student1@student.university.edu / StudentPass123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };