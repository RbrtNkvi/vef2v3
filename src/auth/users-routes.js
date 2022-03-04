import express from 'express';
import jwt from 'jsonwebtoken';
import { catchErrors } from '../lib/catch-errors.js';
import { listUser, listUsers } from '../lib/db.js';
import { createUser, findById, findByUsername } from '../lib/users.js';
import {
  nameValidator,
  passwordValidator,
  usernameValidator,
  validationCheck
} from '../lib/validation.js';
import { jwtOptions, requireAdmin, requireAuthentication, tokenOptions } from './passport.js';

export const usersRouter = express.Router();

async function index(req, res) {
  const users = await listUsers();

  return res.status(200).json(users);
}

async function getUser(req, res) {
  const userId = req.params.id;
  const user = await listUser(userId);

  if (!user) {
    return res.status(404).json({ error: 'Síða fannst ekki' });
  }

  return res.status(200).json(user);
}

async function userCreate(req, res) {
  const { name, username, password } = req.body;
  const user = await createUser(name, username, password);

  if (!user) {
    return res.status(400).json({ error: 'Gat ekki búið til notanda' });
  }

  delete user.password;

  return res.status(201).json(user);
}

async function userLogin(req, res) {
  const { username } = req.body;

  const user = await findByUsername(username);

  if (!user) {
    return res.status(500).json({});
  }

  const payload = { id: user.id };
  const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
  delete user.password;

  return res.json({
    user,
    token,
    expiresIn: tokenOptions.expiresIn,
  })
}

async function userMe(req, res) {
  const { user } = req;

  const me = await findById(user.id);

  if (!me) {
    return res.status(404).json({ error: 'Notandi ekki fundinn' })
  }

  delete me.password;

  return res.status(200).json(me);
}

usersRouter.get('/', requireAdmin, catchErrors(index));
usersRouter.get('/me', requireAuthentication, catchErrors(userMe))
usersRouter.post(
  '/register',
  nameValidator,
  usernameValidator,
  passwordValidator,
  validationCheck,
  catchErrors(userCreate));
usersRouter.post(
  '/login',
  usernameValidator,
  passwordValidator,
  validationCheck,
  catchErrors(userLogin));
usersRouter.get('/:id', requireAdmin, catchErrors(getUser));
