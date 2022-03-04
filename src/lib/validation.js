import { body, validationResult } from 'express-validator';
import xss from 'xss';

const patching = (value, { req }) => {
  if (!value && req.method === 'PATCH') {
    return false;
  }

  return true;
}

export function registrationValidationMiddleware(textField) {
  return body(textField)
    .if(patching)
    .isLength({ max: 400 })
    .withMessage(
      `${textField === 'comment' ? 'Athugasemd' : 'Lýsing'
      } má að hámarki vera 400 stafir`
    );
}

// Viljum keyra sér og með validation, ver gegn „self XSS“
export function xssSanitizationMiddleware(textField) {
  return body(textField).customSanitizer((v) => xss(v));
}

export function sanitizationMiddleware(textField) {
  return body(textField).trim().escape();
}


export const nameValidator = body('name')
  .if(patching)
  .isLength({ min: 1, max: 64 })
  .withMessage('name is required, max 64 characters');

export const usernameValidator = body('username')
  .isLength({ min: 1, max: 64 })
  .withMessage('username is required, max 64 characters');

export const passwordValidator = body('password')
  .isLength({ min: 1, max: 128 })
  .withMessage('password is required, max 128 characters');

export function validationCheck(req, res, next) {
  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    const notFoundError = validation.errors.find((error) => error.msg === 'not found');
    const serverError = validation.errors.find((error) => error.msg === 'server error');

    const loginError = validation.errors.find((error) =>
      error.msg === 'username or password incorrect');

    let status = 400;

    if (serverError) {
      status = 500;
    } else if (notFoundError) {
      status = 404;
    } else if (loginError) {
      status = 401;
    }

    const validationErrorsWithoutSkip = validation.errors.filter((error) => error.msg !== 'skip');

    return res.status(status).json({ errors: validationErrorsWithoutSkip });
  }

  return next();
}
