import dotenv from 'dotenv';
import express from 'express';
import passport from './auth/passport.js';
import { usersRouter } from './auth/users-routes.js';
import { isInvalid } from './lib/template-helpers.js';
import { adminRouter } from './routes/admin-routes.js';
import { indexRouter } from './routes/index-routes.js';

dotenv.config();

const {
  PORT: port = 3000,
  JWT_SECRET: jwtSecret,
  DATABASE_URL: connectionString,
} = process.env;

if (!connectionString || !jwtSecret) {
  console.error('Vantar gögn í env');
  process.exit(1);
}

const app = express();

// Sér um að req.body innihaldi gögn úr formi
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.locals = {
  isInvalid,
};

app.use('/admin', adminRouter);
app.use('/events', indexRouter);
app.use('/users', usersRouter);

/** Middleware sem sér um 404 villur. */
app.use((req, res) => {
  const title = 'Síða fannst ekki';
  res.status(404).json({ error: title });
});

/** Middleware sem sér um villumeðhöndlun. */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const title = 'Villa kom upp';
  res.status(500).json({ error: title });
});

app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});
