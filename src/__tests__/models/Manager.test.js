const { sequelize, Manager, User, CourseOffering, Module, Cohort, Class, Mode, Facilitator } = require('../../models');

describe('Manager Model', () => {
  let testUser;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    testUser = await User.create({
      email: 'manager@test.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'manager'
    });
  });

  afterEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('Creation and Validation', () => {
    const validManagerData = {
      userId: null, 
      department: 'Information Technology',
      employeeId: 'MGR001',
      accessLevel: 'standard',
      phoneNumber: '+1234567890',
      office: 'Building A, Room 101'
    };

    test('should create manager with valid data', async () => {
      const data = { ...validManagerData, userId: testUser.id };
      const manager = await Manager.create(data);
      
      expect(manager).toBeDefined();
      expect(manager.userId).toBe(testUser.id);
      expect(manager.department).toBe('Information Technology');
      expect(manager.employeeId).toBe('MGR001');
      expect(manager.accessLevel).toBe('standard');
      expect(manager.phoneNumber).toBe('+1234567890');
      expect(manager.office).toBe('Building A, Room 101');
    });

    test('should require userId', async () => {
      const invalidData = { ...validManagerData };
      delete invalidData.userId;
      
      await expect(Manager.create(invalidData)).rejects.toThrow();
    });

    test('should require department', async () => {
      const invalidData = { ...validManagerData, userId: testUser.id };
      delete invalidData.department;
      
      await expect(Manager.create(invalidData)).rejects.toThrow();
    });

    test('should require employeeId', async () => {
      const invalidData = { ...validManagerData, userId: testUser.id };
      delete invalidData.employeeId;
      
      await expect(Manager.create(invalidData)).rejects.toThrow();
    });

    test('should enforce unique employeeId', async () => {
      const data = { ...validManagerData, userId: testUser.id };
      await Manager.create(data);
      
      const anotherUser = await User.create({
        email: 'another@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Smith',
        role: 'manager'
      });
      
      const duplicateData = { ...data, userId: anotherUser.id };
      await expect(Manager.create(duplicateData)).rejects.toThrow();
    });

    test('should validate accessLevel enum', async () => {
      const invalidData = { ...validManagerData, userId: testUser.id, accessLevel: 'invalid' };
      
      await expect(Manager.create(invalidData)).rejects.toThrow();
    });

    test('should use default values', async () => {
      const minimalData = {
        userId: testUser.id,
        department: 'IT',
        employeeId: 'MGR002'
      };
      
      const manager = await Manager.create(minimalData);
      
      expect(manager.accessLevel).toBe('standard');
    });

    test('should allow null for optional fields', async () => {
      const data = {
        userId: testUser.id,
        department: 'HR',
        employeeId: 'MGR003',
        phoneNumber: null,
        office: null
      };
      
      const manager = await Manager.create(data);
      
      expect(manager.phoneNumber).toBeNull();
      expect(manager.office).toBeNull();
    });

    test('should create managers with different access levels', async () => {
      const standardManager = await Manager.create({
        userId: testUser.id,
        department: 'IT',
        employeeId: 'MGR004',
        accessLevel: 'standard'
      });
      
      const adminUser = await User.create({
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'manager'
      });
      
      const adminManager = await Manager.create({
        userId: adminUser.id,
        department: 'IT',
        employeeId: 'MGR005',
        accessLevel: 'admin'
      });
      
      expect(standardManager.accessLevel).toBe('standard');
      expect(adminManager.accessLevel).toBe('admin');
    });
  });

  describe('Instance Methods', () => {
    let standardManager, adminManager;
    let courseOffering;

    beforeEach(async () => {
      standardManager = await Manager.create({
        userId: testUser.id,
        department: 'IT',
        employeeId: 'MGR001',
        accessLevel: 'standard'
      });

      const adminUser = await User.create({
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Manager',
        role: 'manager'
      });

      adminManager = await Manager.create({
        userId: adminUser.id,
        department: 'IT',
        employeeId: 'MGR002',
        accessLevel: 'admin'
      });

      // Create a course offering for testing
      const facilitatorUser = await User.create({
        email: 'facilitator@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Facilitator',
        role: 'facilitator'
      });

      const facilitator = await Facilitator.create({
        userId: facilitatorUser.id,
        employeeId: 'FAC001',
        specialization: 'CS'
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
        managerId: standardManager.id,
        modeId: mode.id
      });
    });

    test('canManageCourse should check permissions', () => {
      expect(adminManager.canManageCourse(courseOffering)).toBe(true);
      expect(standardManager.canManageCourse(courseOffering)).toBe(true);
    });

    test('getPermissions should return correct permissions', () => {
      const standardPermissions = standardManager.getPermissions();
      expect(standardPermissions).toContain('read_course_allocations');
      expect(standardPermissions).toContain('read_activity_logs');
      expect(standardPermissions).toContain('create_course_allocations');
      expect(standardPermissions).not.toContain('manage_users');
      expect(standardPermissions).not.toContain('delete_course_allocations');
      
      const adminPermissions = adminManager.getPermissions();
      expect(adminPermissions).toContain('read_course_allocations');
      expect(adminPermissions).toContain('read_activity_logs');
      expect(adminPermissions).toContain('create_course_allocations');
      expect(adminPermissions).toContain('update_course_allocations');
      expect(adminPermissions).toContain('delete_course_allocations');
      expect(adminPermissions).toContain('manage_all_activities');
      expect(adminPermissions).toContain('manage_users');
      
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      await Manager.create({
        userId: testUser.id,
        department: 'Information Technology',
        employeeId: 'MGR001',
        accessLevel: 'standard'
      });

      const user2 = await User.create({
        email: 'manager2@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Smith',
        role: 'manager'
      });

      await Manager.create({
        userId: user2.id,
        department: 'Human Resources',
        employeeId: 'MGR002',
        accessLevel: 'admin'
      });

      const user3 = await User.create({
        email: 'manager3@test.com',
        password: 'password123',
        firstName: 'Bob',
        lastName: 'Johnson',
        role: 'manager'
      });

      await Manager.create({
        userId: user3.id,
        department: 'Information Technology',
        employeeId: 'MGR003',
        accessLevel: 'admin'
      });
    });

    test('findByEmployeeId should find manager by employee ID', async () => {
      const found = await Manager.findByEmployeeId('MGR001');
      expect(found).toBeDefined();
      expect(found.employeeId).toBe('MGR001');
      expect(found.user).toBeDefined();
      expect(found.user.firstName).toBe('Jane');
    });

    test('findByDepartment should find managers by department', async () => {
      const itManagers = await Manager.findByDepartment('Information Technology');
      expect(itManagers).toHaveLength(2);
      
      const hrManagers = await Manager.findByDepartment('Human Resources');
      expect(hrManagers).toHaveLength(1);
      expect(hrManagers[0].employeeId).toBe('MGR002');
    });

    test('findByAccessLevel should find managers by access level', async () => {
      const standardManagers = await Manager.findByAccessLevel('standard');
      expect(standardManagers).toHaveLength(1);
      expect(standardManagers[0].employeeId).toBe('MGR001');
      
      const adminManagers = await Manager.findByAccessLevel('admin');
      expect(adminManagers).toHaveLength(2);
    });
  });

  describe('Associations', () => {
    let manager;

    beforeEach(async () => {
      manager = await Manager.create({
        userId: testUser.id,
        department: 'IT',
        employeeId: 'MGR001',
        accessLevel: 'standard'
      });
    });

    test('should belong to User', async () => {
      const user = await manager.getUser();
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe('manager@test.com');
    });

    test('should have many CourseOfferings', async () => {
      const facilitatorUser = await User.create({
        email: 'facilitator@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Facilitator',
        role: 'facilitator'
      });

      const facilitator = await Facilitator.create({
        userId: facilitatorUser.id,
        employeeId: 'FAC001',
        specialization: 'CS'
      });

      const module1 = await Module.create({
        code: 'CS101',
        name: 'Intro to CS',
        credits: 3
      });

      const module2 = await Module.create({
        code: 'CS102',
        name: 'Data Structures',
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

      const offering1 = await CourseOffering.create({
        moduleId: module1.id,
        cohortId: cohort.id,
        classId: classInstance.id,
        facilitatorId: facilitator.id,
        managerId: manager.id,
        modeId: mode.id
      });

      const offering2 = await CourseOffering.create({
        moduleId: module2.id,
        cohortId: cohort.id,
        classId: classInstance.id,
        facilitatorId: facilitator.id,
        managerId: manager.id,
        modeId: mode.id
      });

      const managedCourses = await manager.getManagedCourses();
      expect(managedCourses).toHaveLength(2);
      expect(managedCourses.map(c => c.id)).toEqual(expect.arrayContaining([offering1.id, offering2.id]));
    });

    test('should cascade delete on user deletion', async () => {
      const managerId = manager.id;
      
      await testUser.destroy();
      
      const deletedManager = await Manager.findByPk(managerId);
      expect(deletedManager).toBeNull();
    });

    test('should set null on course offering when manager is deleted', async () => {
      // Create course offering
      const facilitatorUser = await User.create({
        email: 'facilitator@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Facilitator',
        role: 'facilitator'
      });

      const facilitator = await Facilitator.create({
        userId: facilitatorUser.id,
        employeeId: 'FAC001',
        specialization: 'CS'
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
        managerId: manager.id,
        modeId: mode.id
      });

      await testUser.destroy();

      const updatedOffering = await CourseOffering.findByPk(offering.id);
      expect(updatedOffering.managerId).toBeNull();
    });
  });
});