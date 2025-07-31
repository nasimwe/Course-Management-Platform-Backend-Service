const { sequelize, Facilitator, User, CourseOffering, ActivityTracker, Module, Cohort, Class, Mode, Manager } = require('../../models');

describe('Facilitator Model', () => {
  let testUser;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      email: 'facilitator@test.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'facilitator'
    });
  });

  afterEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('Creation and Validation', () => {
    const validFacilitatorData = {
      userId: null, // Will be set in beforeEach
      employeeId: 'FAC001',
      specialization: 'Computer Science',
      qualification: 'PhD in Computer Science',
      experience: 5,
      phoneNumber: '+1234567890',
      isAvailable: true,
      maxCourseLoad: 4
    };

    test('should create facilitator with valid data', async () => {
      const data = { ...validFacilitatorData, userId: testUser.id };
      const facilitator = await Facilitator.create(data);
      
      expect(facilitator).toBeDefined();
      expect(facilitator.userId).toBe(testUser.id);
      expect(facilitator.employeeId).toBe('FAC001');
      expect(facilitator.specialization).toBe('Computer Science');
      expect(facilitator.experience).toBe(5);
      expect(facilitator.isAvailable).toBe(true);
    });

    test('should require userId', async () => {
      const invalidData = { ...validFacilitatorData };
      delete invalidData.userId;
      
      await expect(Facilitator.create(invalidData)).rejects.toThrow();
    });

    test('should require employeeId', async () => {
      const invalidData = { ...validFacilitatorData, userId: testUser.id };
      delete invalidData.employeeId;
      
      await expect(Facilitator.create(invalidData)).rejects.toThrow();
    });

    test('should enforce unique employeeId', async () => {
      const data = { ...validFacilitatorData, userId: testUser.id };
      await Facilitator.create(data);
      
      // Create another user
      const anotherUser = await User.create({
        email: 'another@test.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'facilitator'
      });
      
      const duplicateData = { ...data, userId: anotherUser.id };
      await expect(Facilitator.create(duplicateData)).rejects.toThrow();
    });

    test('should require specialization', async () => {
      const invalidData = { ...validFacilitatorData, userId: testUser.id };
      delete invalidData.specialization;
      
      await expect(Facilitator.create(invalidData)).rejects.toThrow();
    });

    test('should use default values', async () => {
      const minimalData = {
        userId: testUser.id,
        employeeId: 'FAC002',
        specialization: 'Mathematics'
      };
      
      const facilitator = await Facilitator.create(minimalData);
      
      expect(facilitator.experience).toBe(0);
      expect(facilitator.isAvailable).toBe(true);
      expect(facilitator.maxCourseLoad).toBe(5);
    });

    test('should allow null for optional fields', async () => {
      const data = {
        userId: testUser.id,
        employeeId: 'FAC003',
        specialization: 'Physics',
        qualification: null,
        phoneNumber: null
      };
      
      const facilitator = await Facilitator.create(data);
      
      expect(facilitator.qualification).toBeNull();
      expect(facilitator.phoneNumber).toBeNull();
    });
  });

  describe('Instance Methods', () => {
    let facilitator;
    let courseOffering;

    beforeEach(async () => {
      facilitator = await Facilitator.create({
        userId: testUser.id,
        employeeId: 'FAC001',
        specialization: 'Computer Science',
        experience: 5,
        maxCourseLoad: 3
      });

      // Create course offering for testing
      const manager = await User.create({
        email: 'manager@test.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'Test',
        role: 'manager'
      });

      const managerProfile = await Manager.create({
        userId: manager.id,
        department: 'IT',
        employeeId: 'MGR001'
      });

      const module = await Module.create({
        code: 'CS101',
        name: 'Intro to CS',
        credits: 3
      });

      const cohort = await Cohort.create({
        name: 'Test Cohort',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      const classInstance = await Class.create({
        name: '2024S',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        trimester: 'T1',
        year: 2024
      });

      const mode = await Mode.create({
        name: 'Online',
        type: 'online'
      });

      courseOffering = await CourseOffering.create({
        moduleId: module.id,
        cohortId: cohort.id,
        classId: classInstance.id,
        facilitatorId: facilitator.id,
        managerId: managerProfile.id,
        modeId: mode.id
      });
    });

    test('getCurrentCourseLoad should count active courses', async () => {
      const load = await facilitator.getCurrentCourseLoad();
      expect(load).toBe(1);

      // Create another active course
      const module2 = await Module.create({
        code: 'CS102',
        name: 'Data Structures',
        credits: 3
      });

      await CourseOffering.create({
        moduleId: module2.id,
        cohortId: courseOffering.cohortId,
        classId: courseOffering.classId,
        facilitatorId: facilitator.id,
        managerId: courseOffering.managerId,
        modeId: courseOffering.modeId
      });

      const newLoad = await facilitator.getCurrentCourseLoad();
      expect(newLoad).toBe(2);
    });

    test('canTakeMoreCourses should check availability and load', async () => {
      expect(await facilitator.canTakeMoreCourses()).toBe(true);

      // Add courses to reach max load
      for (let i = 2; i <= 3; i++) {
        const module = await Module.create({
          code: `CS10${i}`,
          name: `Course ${i}`,
          credits: 3
        });

        await CourseOffering.create({
          moduleId: module.id,
          cohortId: courseOffering.cohortId,
          classId: courseOffering.classId,
          facilitatorId: facilitator.id,
          managerId: courseOffering.managerId,
          modeId: courseOffering.modeId
        });
      }

      expect(await facilitator.canTakeMoreCourses()).toBe(false);

      // Test unavailable facilitator
      facilitator.isAvailable = false;
      await facilitator.save();
      expect(await facilitator.canTakeMoreCourses()).toBe(false);
    });

    test('getAvailabilityStatus should return correct status', async () => {
      expect(await facilitator.getAvailabilityStatus()).toBe('light'); // 1/3 = 33%

      // Add one more course
      const module2 = await Module.create({
        code: 'CS102',
        name: 'Data Structures',
        credits: 3
      });

      await CourseOffering.create({
        moduleId: module2.id,
        cohortId: courseOffering.cohortId,
        classId: courseOffering.classId,
        facilitatorId: facilitator.id,
        managerId: courseOffering.managerId,
        modeId: courseOffering.modeId
      });

      expect(await facilitator.getAvailabilityStatus()).toBe('moderate'); // 2/3 = 66%

      // Test with no courses
      const newFacilitator = await Facilitator.create({
        userId: testUser.id,
        employeeId: 'FAC002',
        specialization: 'Math',
        maxCourseLoad: 5
      });

      expect(await newFacilitator.getAvailabilityStatus()).toBe('available');
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // Create multiple facilitators
      await Facilitator.create({
        userId: testUser.id,
        employeeId: 'FAC001',
        specialization: 'Computer Science',
        qualification: 'PhD',
        experience: 5,
        isAvailable: true
      });

      const user2 = await User.create({
        email: 'facilitator2@test.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'facilitator'
      });

      await Facilitator.create({
        userId: user2.id,
        employeeId: 'FAC002',
        specialization: 'Data Science',
        qualification: 'MSc',
        experience: 3,
        isAvailable: false
      });

      const user3 = await User.create({
        email: 'facilitator3@test.com',
        password: 'password123',
        firstName: 'Bob',
        lastName: 'Johnson',
        role: 'facilitator'
      });

      await Facilitator.create({
        userId: user3.id,
        employeeId: 'FAC003',
        specialization: 'Computer Science',
        qualification: 'PhD',
        experience: 10,
        isAvailable: true
      });
    });

    test('findByEmployeeId should find facilitator by employee ID', async () => {
      const found = await Facilitator.findByEmployeeId('FAC001');
      expect(found).toBeDefined();
      expect(found.employeeId).toBe('FAC001');
      expect(found.user).toBeDefined();
    });

    test('findBySpecialization should find facilitators by specialization', async () => {
      const csFacilitators = await Facilitator.findBySpecialization('Computer Science');
      expect(csFacilitators).toHaveLength(2);
      
      const dataFacilitators = await Facilitator.findBySpecialization('Data');
      expect(dataFacilitators).toHaveLength(1);
    });

    test('findAvailable should find available facilitators', async () => {
      const available = await Facilitator.findAvailable();
      expect(available).toHaveLength(2);
      expect(available.every(f => f.isAvailable)).toBe(true);
    });

    test('findWithLightLoad should find facilitators with light course load', async () => {
      // This test would require creating course offerings
      // For now, all facilitators should have light load (0 courses)
      const lightLoad = await Facilitator.findWithLightLoad();
      expect(lightLoad).toHaveLength(2); // Only available facilitators
    });
  });

  describe('Associations', () => {
    let facilitator;

    beforeEach(async () => {
      facilitator = await Facilitator.create({
        userId: testUser.id,
        employeeId: 'FAC001',
        specialization: 'Computer Science',
        experience: 5
      });
    });

    test('should belong to User', async () => {
      const user = await facilitator.getUser();
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
    });

    test('should have many CourseOfferings', async () => {
      // Create course offering
      const manager = await User.create({
        email: 'manager@test.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'Test',
        role: 'manager'
      });

      const managerProfile = await Manager.create({
        userId: manager.id,
        department: 'IT',
        employeeId: 'MGR001'
      });

      const module = await Module.create({
        code: 'CS101',
        name: 'Intro to CS',
        credits: 3
      });

      const cohort = await Cohort.create({
        name: 'Test Cohort',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      const classInstance = await Class.create({
        name: '2024S',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        trimester: 'T1',
        year: 2024
      });

      const mode = await Mode.create({
        name: 'Online',
        type: 'online'
      });

      const offering = await CourseOffering.create({
        moduleId: module.id,
        cohortId: cohort.id,
        classId: classInstance.id,
        facilitatorId: facilitator.id,
        managerId: managerProfile.id,
        modeId: mode.id
      });

      const offerings = await facilitator.getCourseOfferings();
      expect(offerings).toHaveLength(1);
      expect(offerings[0].id).toBe(offering.id);
    });

    test('should have many ActivityTrackers', async () => {
      // Create course offering first
      const manager = await User.create({
        email: 'manager@test.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'Test',
        role: 'manager'
      });

      const managerProfile = await Manager.create({
        userId: manager.id,
        department: 'IT',
        employeeId: 'MGR001'
      });

      const module = await Module.create({
        code: 'CS101',
        name: 'Intro to CS',
        credits: 3
      });

      const cohort = await Cohort.create({
        name: 'Test Cohort',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      const classInstance = await Class.create({
        name: '2024S',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        trimester: 'T1',
        year: 2024
      });

      const mode = await Mode.create({
        name: 'Online',
        type: 'online'
      });

      const offering = await CourseOffering.create({
        moduleId: module.id,
        cohortId: cohort.id,
        classId: classInstance.id,
        facilitatorId: facilitator.id,
        managerId: managerProfile.id,
        modeId: mode.id
      });

      const activity = await ActivityTracker.create({
        allocationId: offering.id,
        facilitatorId: facilitator.id,
        weekNumber: 1
      });

      const activities = await facilitator.getActivityLogs();
      expect(activities).toHaveLength(1);
      expect(activities[0].id).toBe(activity.id);
    });

    test('should cascade delete on user deletion', async () => {
      const facilitatorId = facilitator.id;
      
      await testUser.destroy();
      
      const deletedFacilitator = await Facilitator.findByPk(facilitatorId);
      expect(deletedFacilitator).toBeNull();
    });
  });
});