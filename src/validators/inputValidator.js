const { body, param, query } = require('express-validator');

const signupValidator = [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth required'),
  body('gender').isIn(['male', 'female', 'non-binary']).withMessage('Invalid gender'),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty().withMessage('Password is required'),
];

const profileValidator = [
  body('bio').optional().trim().isLength({ max: 500 }),
  body('location').optional().trim(),
  body('interests').optional().isArray(),
  body('hobbies').optional().isArray(),
  body('preferredGender').optional().isIn(['male', 'female', 'any']),
  body('ageRangeMin').optional().isInt({ min: 18, max: 100 }),
  body('ageRangeMax').optional().isInt({ min: 18, max: 100 }),
  body('height').optional().trim(),
  body('bodyType').optional().trim(),
  body('occupation').optional().trim(),
  body('education').optional().trim(),
];

const likeValidator = [
  body('toUserId').notEmpty().isUUID().withMessage('Valid toUserId required'),
];

const matchValidator = [
  body('matchId').notEmpty().isUUID().withMessage('Valid matchId required'),
];

const videoValidator = [
  body('matchId').notEmpty().isUUID(),
  body('otherUserId').notEmpty().isUUID(),
];

const dateValidator = [
  body('matchId').notEmpty().isUUID(),
  body('location').notEmpty().trim(),
  body('proposedDate').notEmpty().withMessage('Valid date/time required'),
];

const stealValidator = [
  body('targetUserId').notEmpty().isUUID().withMessage('Valid targetUserId required'),
];

module.exports = {
  signupValidator,
  loginValidator,
  profileValidator,
  likeValidator,
  matchValidator,
  videoValidator,
  dateValidator,
  stealValidator,
};
