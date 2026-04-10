const { validationResult } = require('express-validator');

/**
 * Express-validator result handler.
 * Usage: router.post('/x', [...checks], validate, handler)
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    message: 'Validation error',
    errors: result.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
}

module.exports = { validate };

