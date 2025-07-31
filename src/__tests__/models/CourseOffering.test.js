const { sequelize, CourseOffering, Module, Cohort, Class, Facilitator, Manager, Mode, User, ActivityTracker, Student } = require('../../models');

describe('CourseOffering Model', () => {
  let testData = {};

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create test data
    const managerUser = await User.create({
      email: 'manager@test.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Manager',
      role: 'manager'
    });

    const facilitatorUser = await User.create({
      email: 'facilitator@test.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Facilitator',
      role: 'facilitator'
    });

    const manager = await Manager.create({
      userId: managerUser.id,
      department: 'IT',
      employeeId: 'MGR001',
      accessLevel: 'admin'
    });

    const facilitator = await Facilitator.create({
      userId: facilitatorUser.id,
      employeeId: 'FAC001',
      specialization: 'Computer Science',
      qualification: 'PhD',
      experience: 5
    });

    const module = await Module.create({
      code: 'CS101',
      name: 'Introduction to Programming',
      credits: 3,
      department: 'Computer Science',
      level: 'foundation'
    });

    const cohort = await Cohort.create({
      name: '2024 Spring Intake',
      code: 'SPR2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      program: 'Computer Science',
      maxCapacity: 50
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

    testData = {
      manager,
      facilitator,
      module,
      cohort,
      classInstance,
      mode,
      validOfferingData: {
        moduleId: module.id,
        cohortId: cohort.id,
        classId: classInstance.id,
        facilitatorId: facilitator.id,
        managerId: manager.id,
        modeId: mode.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        maxEnrollment: 30,
        currentEnrollment: 0,
        status: 'draft',
        schedule: 'Mon/Wed/Fri 10:00-12:00',
        location: 'Online Platform',
        notes: 'Course notes'
      }
    };
  });

  afterEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('Creation and Validation', () => {
    test('should create course offering with valid data', async () => {
      const offering = await CourseOffering.create(testData.validOfferingData);
      
      expect(offering).toBeDefined();
      expect(offering.moduleId).toBe(testData.module.id);
      expect(offering.cohortId).toBe(testData.cohort.id);
      expect(offering.classId).toBe(testData.classInstance.id);
      expect(offering.status).toBe('draft');
      expect(offering.isActive).toBe(true);
    });

    test('should require moduleId, cohortId, classId, and modeId', async () => {
      const requiredFields = ['moduleId', 'cohortId', 'classId', 'modeId'];
      
      for (const field of requiredFields) {
        const invalidData = { ...testData.validOfferingData };
        delete invalidData[field];
        
        await expect(CourseOffering.create(invalidData)).rejects.toThrow();
      }
    });

    test('should validate endDate is after startDate', async () => {
      const invalidData = {
        ...testData.validOfferingData,
        startDate: new Date('2024-06-30'),
        endDate: new Date('2024-01-01')
      };
      
      await expect(CourseOffering.create(invalidData)).rejects.toThrow('End date must be after start date');
    });

    test('should validate maxEnrollment range', async () => {
      const invalidData1 = { ...testData.validOfferingData, maxEnrollment: 0 };
      await expect(CourseOffering.create(invalidData1)).rejects.toThrow('Maximum enrollment must be at least 1');
      
      const invalidData2 = { ...testData.validOfferingData, maxEnrollment: 501 };
      await expect(CourseOffering.create(invalidData2)).rejects.toThrow('Maximum enrollment cannot exceed 500');
    });

    test('should validate status enum', async () => {
      const invalidData = { ...testData.validOfferingData, status: 'invalid' };
      
      await expect(CourseOffering.create(invalidData)).rejects.toThrow('Status must be draft, scheduled, active, completed, or cancelled');
    });

    test('should validate location length', async () => {
      const invalidData = { ...testData.validOfferingData, location: 'A'.repeat(201) };
      
      await expect(CourseOffering.create(invalidData)).rejects.toThrow('Location must be less than 200 characters');
    });

    test('should enforce unique module-cohort-class constraint', async () => {
      await CourseOffering.create(testData.validOfferingData);
      
      await expect(CourseOffering.create(testData.validOfferingData)).rejects.toThrow();
    });

    test('should auto-set dates from class in beforeSave hook', async () => {
      const dataWithoutDates = { ...testData.validOfferingData };
      delete dataWithoutDates.startDate;
      delete dataWithoutDates.endDate;
      
      const offering = await CourseOffering.create(dataWithoutDates);
      
      expect(offering.startDate).toEqual(testData.classInstance.startDate);
      expect(offering.endDate).toEqual(testData.classInstance.endDate);
    });

    test('should auto-set maxEnrollment from module in beforeSave hook', async () => {
      const dataWithoutMaxEnrollment = { ...testData.validOfferingData };
      delete dataWithoutMaxEnrollment.maxEnrollment;
      
      const offering = await CourseOffering.create(dataWithoutMaxEnrollment);
      
      expect(offering.maxEnrollment).toBe(testData.module.maxEnrollment);
    });

    test('should use default values', async () => {
      const minimalData = {
        moduleId: testData.module.id,
        cohortId: testData.cohort.id,
        classId: testData.classInstance.id,
        modeId: testData.mode.id
      };
      
      const offering = await CourseOffering.create(minimalData);
      
      expect(offering.currentEnrollment).toBe(0);
      expect(offering.status).toBe('draft');
      expect(offering.isActive).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    let offering;

    beforeEach(async () => {
      offering = await CourseOffering.create(testData.validOfferingData);
    });

    test('hasStarted should check if offering has started', () => {
      
      const pastOffering = CourseOffering.build({
        startDate: new Date('2020-01-01')
      });
      
      expect(pastOffering.hasStarted()).toBe(true);
    });

    test('hasEnded should check if offering has ended', () => {
      const futureOffering = CourseOffering.build({
        endDate: new Date('2025-12-31')
      });
      
      expect(futureOffering.hasEnded()).toBe(false);
      
      const pastOffering = CourseOffering.build({
        endDate: new Date('2020-12-31')
      });
      
      expect(pastOffering.hasEnded()).toBe(true);
    });

    test('isCurrentlyActive should check current active status', () => {
      const originalDate = Date;
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2024-03-15');
          }
          return new originalDate(...args);
        }
      };

      offering.status = 'active';
      expect(offering.isCurrentlyActive()).toBe(true);

      offering.status = 'draft';
      expect(offering.isCurrentlyActive()).toBe(false);

      offering.status = 'active';
      offering.isActive = false;
      expect(offering.isCurrentlyActive()).toBe(false);

      global.Date = originalDate;
    });

    test('canEnroll should check enrollment eligibility', () => {
      offering.status = 'scheduled';
      expect(offering.canEnroll()).toBe(true);

      offering.status = 'active';
      expect(offering.canEnroll()).toBe(false);

      offering.status = 'scheduled';
      offering.isActive = false;
      expect(offering.canEnroll()).toBe(false);

      offering.isActive = true;
      offering.currentEnrollment = 30;
      expect(offering.canEnroll()).toBe(false);
    });

    test('hasAvailableSpots should check capacity', () => {
      expect(offering.hasAvailableSpots()).toBe(true);
      
      offering.currentEnrollment = 30;
      expect(offering.hasAvailableSpots()).toBe(false);
      
      offering.maxEnrollment = null;
      expect(offering.hasAvailableSpots()).toBe(true);
    });

    test('getAvailableSpots should return available spots', () => {
      expect(offering.getAvailableSpots()).toBe(30);
      
      offering.currentEnrollment = 10;
      expect(offering.getAvailableSpots()).toBe(20);
      
      offering.currentEnrollment = 35; // Over capacity
      expect(offering.getAvailableSpots()).toBe(0);
      
      offering.maxEnrollment = null;
      expect(offering.getAvailableSpots()).toBeNull();
    });

    test('getOccupancyRate should calculate occupancy percentage', () => {
      expect(offering.getOccupancyRate()).toBe(0);
      
      offering.currentEnrollment = 15;
      expect(offering.getOccupancyRate()).toBe(50);
      
      offering.maxEnrollment = null;
      expect(offering.getOccupancyRate()).toBe(0);
    });

    test('getDuration should calculate duration in days', () => {
      const duration = offering.getDuration();
      expect(duration).toBe(181); // Jan 1 to Jun 30
    });

    test('getDurationInWeeks should calculate duration in weeks', () => {
      const weeks = offering.getDurationInWeeks();
      expect(weeks).toBe(26);
    });

    test('getCurrentWeek should calculate current week', () => {
      const originalDate = Date;
      
      // Before start
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2023-12-15');
          }
          return new originalDate(...args);
        }
      };
      expect(offering.getCurrentWeek()).toBe(0);
      
      // During offering (week 10)
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2024-03-10');
          }
          return new originalDate(...args);
        }
      };
      expect(offering.getCurrentWeek()).toBe(10);
      
      // After end
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2024-07-15');
          }
          return new originalDate(...args);
        }
      };
      expect(offering.getCurrentWeek()).toBe(26);
      
      global.Date = originalDate;
    });

    test('canAssignFacilitator should check assignment eligibility', () => {
      const availableFacilitator = { isAvailable: true };
      const unavailableFacilitator = { isAvailable: false };
      
      expect(offering.canAssignFacilitator(availableFacilitator)).toBe(true);
      expect(offering.canAssignFacilitator(unavailableFacilitator)).toBe(false);
      expect(offering.canAssignFacilitator(null)).toBe(false);
      
      offering.status = 'active';
      expect(offering.canAssignFacilitator(availableFacilitator)).toBe(false);
    });

    test('assignFacilitator should update facilitator', async () => {
      const newFacilitatorUser = await User.create({
        email: 'newfacilitator@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'Facilitator',
        role: 'facilitator'
      });

      const newFacilitator = await Facilitator.create({
        userId: newFacilitatorUser.id,
        employeeId: 'FAC002',
        specialization: 'Computer Science',
        experience: 3
      });

      offering.facilitatorId = null;
      await offering.save();

      await offering.assignFacilitator(newFacilitator.id);
      expect(offering.facilitatorId).toBe(newFacilitator.id);

      offering.status = 'active';
      await expect(offering.assignFacilitator(newFacilitator.id))
        .rejects.toThrow('Can only assign facilitator to draft offerings');
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // Create multiple offerings
      await CourseOffering.create(testData.validOfferingData);
      
      // Create another module and offering
      const module2 = await Module.create({
        code: 'CS102',
        name: 'Data Structures',
        credits: 3
      });

      await CourseOffering.create({
        ...testData.validOfferingData,
        moduleId: module2.id,
        status: 'active'
      });
    });

    test('findByModule should find offerings by module', async () => {
      const offerings = await CourseOffering.findByModule(testData.module.id);
      expect(offerings).toHaveLength(1);
      expect(offerings[0].moduleId).toBe(testData.module.id);
    });

    test('findByCohort should find offerings by cohort', async () => {
      const offerings = await CourseOffering.findByCohort(testData.cohort.id);
      expect(offerings).toHaveLength(2);
    });

    test('findByClass should find offerings by class', async () => {
      const offerings = await CourseOffering.findByClass(testData.classInstance.id);
      expect(offerings).toHaveLength(2);
    });

    test('findByFacilitator should find offerings by facilitator', async () => {
      const offerings = await CourseOffering.findByFacilitator(testData.facilitator.id);
      expect(offerings).toHaveLength(2);
    });

    test('findByManager should find offerings by manager', async () => {
      const offerings = await CourseOffering.findByManager(testData.manager.id);
      expect(offerings).toHaveLength(2);
    });

    test('findByMode should find offerings by mode', async () => {
      const offerings = await CourseOffering.findByMode(testData.mode.id);
      expect(offerings).toHaveLength(2);
    });

    test('findByStatus should find offerings by status', async () => {
      const draftOfferings = await CourseOffering.findByStatus('draft');
      expect(draftOfferings).toHaveLength(1);
      
      const activeOfferings = await CourseOffering.findByStatus('active');
      expect(activeOfferings).toHaveLength(1);
    });

    test('findActive should find active offerings', async () => {
      const offerings = await CourseOffering.findActive();
      expect(offerings).toHaveLength(2);
    });

    test('findCurrent should find currently running offerings', async () => {
      const originalDate = Date;
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2024-03-15');
          }
          return new originalDate(...args);
        }
      };

      const currentOfferings = await CourseOffering.findCurrent();
      expect(currentOfferings).toHaveLength(1);
      expect(currentOfferings[0].status).toBe('active');

      global.Date = originalDate;
    });

    test('findUnassigned should find offerings without facilitator', async () => {
      // Create offering without facilitator
      const module3 = await Module.create({
        code: 'CS103',
        name: 'Algorithms',
        credits: 3
      });

      await CourseOffering.create({
        moduleId: module3.id,
        cohortId: testData.cohort.id,
        classId: testData.classInstance.id,
        modeId: testData.mode.id,
        managerId: testData.manager.id
      });

      const unassigned = await CourseOffering.findUnassigned();
      expect(unassigned).toHaveLength(1);
      expect(unassigned[0].facilitatorId).toBeNull();
    });

    test('findWithFilters should find offerings with multiple filters', async () => {
      const offerings = await CourseOffering.findWithFilters({
        moduleId: testData.module.id,
        status: 'draft',
        facilitatorId: testData.facilitator.id
      });
      
      expect(offerings).toHaveLength(1);
    });
  });

  describe('Associations', () => {
    let offering;

    beforeEach(async () => {
      offering = await CourseOffering.create(testData.validOfferingData);
    });

    test('should belong to Module', async () => {
      const module = await offering.getModule();
      expect(module).toBeDefined();
      expect(module.id).toBe(testData.module.id);
    });

    test('should belong to Cohort', async () => {
      const cohort = await offering.getCohort();
      expect(cohort).toBeDefined();
      expect(cohort.id).toBe(testData.cohort.id);
    });

    test('should belong to Class', async () => {
      const classInstance = await offering.getClass();
      expect(classInstance).toBeDefined();
      expect(classInstance.id).toBe(testData.classInstance.id);
    });

    test('should belong to Facilitator', async () => {
      const facilitator = await offering.getFacilitator();
      expect(facilitator).toBeDefined();
      expect(facilitator.id).toBe(testData.facilitator.id);
    });

    test('should belong to Manager', async () => {
      const manager = await offering.getManager();
      expect(manager).toBeDefined();
      expect(manager.id).toBe(testData.manager.id);
    });

    test('should belong to Mode', async () => {
      const mode = await offering.getMode();
      expect(mode).toBeDefined();
      expect(mode.id).toBe(testData.mode.id);
    });

    test('should have many ActivityTrackers', async () => {
      const activity = await ActivityTracker.create({
        allocationId: offering.id,
        facilitatorId: testData.facilitator.id,
        weekNumber: 1
      });

      const activities = await offering.getActivityLogs();
      expect(activities).toHaveLength(1);
      expect(activities[0].id).toBe(activity.id);
    });
  });
});