const { sequelize, DataTypes, User, Manager, Facilitator, Student } = require('../../models');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      };

      const user = await User.create(userData);
      expect(user).toBeDefined();
      expect(user.email).toBe('n.asimwe@alustudent.com');
      expect(user.firstName).toBe('Asimwe');
      expect(user.lastName).toBe('Umuganwa');
      expect(user.role).toBe('facilitator');
      expect(user.isActive).toBe(true);
      expect(user.password).not.toBe('TestPass123');
    });

    it('should hash password before saving', async () => {
      const plainPassword = 'TestPass123';
      const user = await User.create({
        email: 'n.asimwe@alustudent.com',
        password: plainPassword,
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(50);
      const isValid = await bcrypt.compare(plainPassword, user.password);
      expect(isValid).toBe(true);
    });
  });

  describe('User Validation', () => {
    it('should require email', async () => {
      await expect(User.create({
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      })).rejects.toThrow(/email/i);
    });

    it('should require valid email format', async () => {
      await expect(User.create({
        email: 'invalid-email',
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      })).rejects.toThrow(/valid email/);
    });

    it('should require unique email', async () => {
      await User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      });

      await expect(User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'AnotherPass123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'manager'
      })).rejects.toThrow(/Validation error/i);
    });

    it('should require password', async () => {
      await expect(User.create({
        email: 'n.asimwe@alustudent.com',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      })).rejects.toThrow(/password/i);
    });

    it('should require password length between 6 and 128 characters', async () => {
      await expect(User.create({
        email: 'n.asimwe@alustudent.com',
        password: '12345',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      })).rejects.toThrow(/Password must be at least 6 characters/);
    });

    it('should require valid role', async () => {
      await expect(User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'invalid_role'
      })).rejects.toThrow(/role/i);
    });

    it('should require first name', async () => {
      await expect(User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        lastName: 'Umuganwa',
        role: 'facilitator'
      })).rejects.toThrow(/firstName/i);
    });

    it('should require last name', async () => {
      await expect(User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        firstName: 'Asimwe',
        role: 'facilitator'
      })).rejects.toThrow(/lastName/i);
    });
  });

  describe('User Instance Methods', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      });
    });

    it('should check password correctly', async () => {
      const isValidCorrect = await user.checkPassword('TestPass123');
      const isValidIncorrect = await user.checkPassword('WrongPassword');
      expect(isValidCorrect).toBe(true);
      expect(isValidIncorrect).toBe(false);
    });

    it('should return full name', () => {
      const fullName = user.getFullName();
      expect(fullName).toBe('Asimwe Umuganwa');
    });

    it('should update last login', async () => {
      const beforeLogin = user.lastLogin;
      await user.updateLastLogin();
      expect(user.lastLogin).not.toBe(beforeLogin);
      expect(user.lastLogin).toBeInstanceOf(Date);
      expect(user.lastLogin.getTime()).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('User Class Methods', () => {
    beforeEach(async () => {
      await User.bulkCreate([
        {
          email: 'user1@alustudent.com',
          password: 'TestPass123',
          firstName: 'User',
          lastName: 'One',
          role: 'facilitator',
          isActive: true
        },
        {
          email: 'user2@alustudent.com',
          password: 'TestPass123',
          firstName: 'User',
          lastName: 'Two',
          role: 'manager',
          isActive: false
        }
      ]);
    });

    it('should find user by email', async () => {
      const user = await User.findByEmail('user1@alustudent.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('user1@alustudent.com');
      expect(user.password).toBeDefined();
    });

    it('should find user by email case-insensitive', async () => {
      const user = await User.findByEmail('USER1@ALUSTUDENT.COM');
      expect(user).toBeDefined();
      expect(user.email).toBe('user1@alustudent.com');
    });

    it('should find active users only', async () => {
      const activeUsers = await User.findAll({ where: { isActive: true } });
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].isActive).toBe(true);
    });
  });

  describe('Password Update', () => {
    it('should hash new password when updated', async () => {
      const user = await User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'OriginalPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      });

      const originalHash = user.password;
      user.password = 'NewPass123';
      await user.save();

      expect(user.password).not.toBe('NewPass123');
      expect(user.password).not.toBe(originalHash);
      const isValid = await user.checkPassword('NewPass123');
      expect(isValid).toBe(true);
    });

    it('should not rehash password if unchanged', async () => {
      const user = await User.create({
        email: 'n.asimwe@alustudent.com',
        password: 'TestPass123',
        firstName: 'Asimwe',
        lastName: 'Umuganwa',
        role: 'facilitator'
      });

      const originalHash = user.password;
      user.firstName = 'Updated';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });
});