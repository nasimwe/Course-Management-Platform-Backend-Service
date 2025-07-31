'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Manager, Facilitator, Student } = require('../models');
const { ValidationError, ConflictError, UnauthorizedError, NotFoundError } = require('../middleware/errorHandler');

// Generate JWT token
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'course-management-platform',
    audience: 'course-management-users'
  });
}

// Generate refresh token
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'course-management-platform',
    audience: 'course-management-users'
  });
}

// Register a new user
async function register(userData) {
  const { email, password, firstName, lastName, role, profileData = {} } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: { email: email.toLowerCase().trim() }
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Start transaction
  const transaction = await User.sequelize.transaction();

  try {
    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role
    }, { transaction });

    // Create role-specific profile
    let profile = null;
    switch (role) {
      case 'manager':
        if (!profileData.department || !profileData.employeeId) {
          throw new ValidationError('Manager requires department and employeeId');
        }
        profile = await Manager.create({
          userId: user.id,
          department: profileData.department,
          employeeId: profileData.employeeId,
          accessLevel: profileData.accessLevel || 'standard',
          phoneNumber: profileData.phoneNumber,
          office: profileData.office
        }, { transaction });
        break;

      case 'facilitator':
        if (!profileData.employeeId || !profileData.specialization) {
          throw new ValidationError('Facilitator requires employeeId and specialization');
        }
        profile = await Facilitator.create({
          userId: user.id,
          employeeId: profileData.employeeId,
          specialization: profileData.specialization,
          qualification: profileData.qualification,
          experience: profileData.experience || 0,
          phoneNumber: profileData.phoneNumber,
          maxCourseLoad: profileData.maxCourseLoad || 5
        }, { transaction });
        break;

      case 'student':
        if (!profileData.studentId || !profileData.cohortId) {
          throw new ValidationError('Student requires studentId and cohortId');
        }
        profile = await Student.create({
          userId: user.id,
          studentId: profileData.studentId,
          cohortId: profileData.cohortId,
          program: profileData.program,
          yearOfStudy: profileData.yearOfStudy || 1,
          dateOfBirth: profileData.dateOfBirth,
          phoneNumber: profileData.phoneNumber,
          address: profileData.address,
          emergencyContact: profileData.emergencyContact
        }, { transaction });
        break;
    }

    await transaction.commit();

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Get user with profile for response
    const userWithProfile = await getUserWithProfile(user.id);

    return {
      user: userWithProfile,
      token,
      refreshToken,
      expiresIn: '24h'
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Login user
async function login(email, password) {
  // Find user with password
  const user = await User.scope('withPassword').findOne({
    where: { email: email.toLowerCase().trim() }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated. Please contact administrator.');
  }

  // Check password
  const isValidPassword = await user.checkPassword(password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await user.updateLastLogin();

  // Generate tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user.id });

  // Get user with profile for response
  const userWithProfile = await getUserWithProfile(user.id);

  return {
    user: userWithProfile,
    token,
    refreshToken,
    expiresIn: '24h'
  };
}

// Refresh access token
async function refreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user.id });

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: '24h'
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
}

// Get current user profile
async function getCurrentUser(userId) {
  const user = await getUserWithProfile(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

// Update user profile
async function updateProfile(userId, updateData) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const transaction = await User.sequelize.transaction();

  try {
    // Update user basic info
    const { firstName, lastName, profileData = {} } = updateData;

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    await user.save({ transaction });

    // Update role-specific profile
    if (Object.keys(profileData).length > 0) {
      let profile = null;
      switch (user.role) {
        case 'manager':
          profile = await Manager.findOne({ where: { userId } });
          if (profile) {
            await profile.update(profileData, { transaction });
          }
          break;

        case 'facilitator':
          profile = await Facilitator.findOne({ where: { userId } });
          if (profile) {
            await profile.update(profileData, { transaction });
          }
          break;

        case 'student':
          profile = await Student.findOne({ where: { userId } });
          if (profile) {
            await profile.update(profileData, { transaction });
          }
          break;
      }
    }

    await transaction.commit();

    // Return updated user with profile
    return await getUserWithProfile(userId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Change user password
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.scope('withPassword').findByPk(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isValidPassword = await user.checkPassword(currentPassword);
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Check if new password is different
  const isSamePassword = await user.checkPassword(newPassword);
  if (isSamePassword) {
    throw new ValidationError('New password must be different from current password');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
}

// Get user with profile information
async function getUserWithProfile(userId) {
  return await User.findByPk(userId, {
    include: [
      { model: Manager, as: 'managerProfile' },
      { model: Facilitator, as: 'facilitatorProfile' },
      { model: Student, as: 'studentProfile' }
    ]
  });
}

// Deactivate user account
async function deactivateUser(userId) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isActive = false;
  await user.save();

  return { message: 'User account deactivated successfully' };
}

// Activate user account
async function activateUser(userId) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isActive = true;
  await user.save();

  return { message: 'User account activated successfully' };
}

module.exports = {
  generateToken,
  generateRefreshToken,
  register,
  login,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  getUserWithProfile,
  deactivateUser,
  activateUser
};