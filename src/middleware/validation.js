const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }))
    });
  }
  next();
};

/**
 * Class validation
 */
const validateClass = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Class name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage('Class name can only contain letters, numbers, and spaces'),
  body('startDate')
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .toDate()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('trimester')
    .isIn(['T1', 'T2', 'T3'])
    .withMessage('Trimester must be T1, T2, or T3'),
  body('year')
    .optional()
    .isInt({ min: 2000 })
    .withMessage('Year must be a valid integer >= 2000'),
  body('graduationDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Graduation date must be a valid date'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors
];

/**
 * Mode validation
 */
const validateMode = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Mode name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage('Mode name can only contain letters, numbers, and spaces'),
  body('type')
    .isIn(['online', 'in-person', 'hybrid'])
    .withMessage('Mode type must be online, in-person, or hybrid'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('requirements')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Requirements must be less than 500 characters'),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max capacity must be between 1 and 1000'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors
];

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('role')
    .isIn(['manager', 'facilitator', 'student'])
    .withMessage('Role must be manager, facilitator, or student'),
  handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Course offering validation
 */
const validateCourseOffering = [
  body('moduleId')
    .isInt({ min: 1 })
    .withMessage('Module ID must be a positive integer'),
  body('cohortId')
    .isInt({ min: 1 })
    .withMessage('Cohort ID must be a positive integer'),
  body('classId')
    .isInt({ min: 1 })
    .withMessage('Class ID must be a positive integer'),
  body('modeId')
    .isInt({ min: 1 })
    .withMessage('Mode ID must be a positive integer'),
  body('facilitatorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Facilitator ID must be a positive integer'),
  body('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('maxEnrollment')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Maximum enrollment must be between 1 and 500'),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'active', 'completed', 'cancelled'])
    .withMessage('Status must be draft, scheduled, active, completed, or cancelled'),
  body('schedule')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Schedule must be less than 1000 characters'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters'),
  handleValidationErrors
];

/**
 * Activity tracker validation
 */
const validateActivityTracker = [
  body('allocationId')
    .isInt({ min: 1 })
    .withMessage('Allocation ID must be a positive integer'),
  body('weekNumber')
    .isInt({ min: 1, max: 20 })
    .withMessage('Week number must be between 1 and 20'),
  body('attendance')
    .optional()
    .isArray({ max: 7 })
    .withMessage('Attendance must be an array with maximum 7 elements')
    .custom((value) => {
      if (value && !value.every(item => typeof item === 'boolean')) {
        throw new Error('All attendance values must be boolean');
      }
      return true;
    }),
  body('formativeOneGrading')
    .optional()
    .isIn(['Done', 'Pending', 'Not Started'])
    .withMessage('Formative One Grading must be Done, Pending, or Not Started'),
  body('formativeTwoGrading')
    .optional()
    .isIn(['Done', 'Pending', 'Not Started'])
    .withMessage('Formative Two Grading must be Done, Pending, or Not Started'),
  body('summativeGrading')
    .optional()
    .isIn(['Done', 'Pending', 'Not Started'])
    .withMessage('Summative Grading must be Done, Pending, or Not Started'),
  body('courseModeration')
    .optional()
    .isIn(['Done', 'Pending', 'Not Started'])
    .withMessage('Course Moderation must be Done, Pending, or Not Started'),
  body('intranetSync')
    .optional()
    .isIn(['Done', 'Pending', 'Not Started'])
    .withMessage('Intranet Sync must be Done, Pending, or Not Started'),
  body('gradeBookStatus')
    .optional()
    .isIn(['Done', 'Pending', 'Not Started'])
    .withMessage('Grade Book Status must be Done, Pending, or Not Started'),
  body('notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Notes must be less than 2000 characters'),
  handleValidationErrors
];

/**
 * Module validation
 */
const validateModule = [
  body('code')
    .matches(/^[A-Z]{2,4}[0-9]{2,4}$/)
    .withMessage('Module code must follow format: 2-4 letters followed by 2-4 numbers (e.g., CS101)'),
  body('name')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Module name must be between 3 and 150 characters'),
  body('credits')
    .isInt({ min: 1, max: 20 })
    .withMessage('Credits must be between 1 and 20'),
  body('level')
    .optional()
    .isIn(['foundation', 'intermediate', 'advanced'])
    .withMessage('Level must be foundation, intermediate, or advanced'),
  body('maxEnrollment')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Maximum enrollment must be between 1 and 500'),
  handleValidationErrors
];

/**
 * Cohort validation
 */
const validateCohort = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Cohort name must be between 3 and 100 characters'),
  body('startDate')
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .toDate()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('intakePeriod')
    .optional()
    .isIn(['HT1', 'HT2', 'FT'])
    .withMessage('Intake period must be HT1, HT2, or FT'),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maximum capacity must be between 1 and 1000'),
  body('currentEnrollment')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current enrollment cannot be negative')
    .toInt(),
  handleValidationErrors
];


/**
 * Query parameter validation for filtering
 */
const validateQueryFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be asc or desc'),
  query('status')
    .optional()
    .isIn(['draft', 'scheduled', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status value'),
  query('type')
    .optional()
    .isIn(['online', 'in-person kegel', 'hybrid'])
    .withMessage('Type must be online, in-person, or hybrid'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateClass,
  validateMode,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateCourseOffering,
  validateActivityTracker,
  validateModule,
  validateCohort,
  validateQueryFilters
};