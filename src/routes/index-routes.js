import express from 'express';
import { requireAuthentication } from '../auth/passport.js';
import { catchErrors } from '../lib/catch-errors.js';
import {
  createEvent,
  deleteQuery,
  listEvent,
  listEvents,
  listRegistered,
  register,
  updateEvent
} from '../lib/db.js';
import { slugify } from '../lib/slugify.js';
import { findById } from '../lib/users.js';
import {
  nameValidator,
  registrationValidationMiddleware,
  sanitizationMiddleware,
  validationCheck,
  xssSanitizationMiddleware
} from '../lib/validation.js';

export const indexRouter = express.Router();

async function indexRoute(req, res) {
  const events = await listEvents();

  return res.status(200).json(events);
}

async function registerEvent(req, res) {
  const { user } = req;
  const eventCreator = await findById(user.id);
  const creator = eventCreator.name;
  const { name, description } = req.body;
  const slug = slugify(name);

  const created = await createEvent({ creator, name, slug, description });

  if (created) {
    return res.status(201).json(created);
  }

  return res.status(400).json({ error: 'Gat ekki búið til viðburð' });
}

async function eventRoute(req, res, next) {
  const { slug } = req.params;
  const event = await listEvent(slug);

  if (!event) {
    return next();
  }

  const registered = await listRegistered(event.id);

  return res.status(200).json({ event, registered });
}

async function registerRoute(req, res) {
  const { user } = req;
  const userName = await findById(user.id);
  const { comment } = req.body;
  const { slug } = req.params;
  const event = await listEvent(slug);

  const registered = await register({
    name: userName.name,
    comment,
    event: event.id,
  });

  if (registered) {
    return res.redirect(`/events/${slug}`);
  }

  return res.status(400).json({ error: 'registration failed' });
}

async function patchEvent(req, res) {
  const { user } = req;
  let { slug } = req.params;
  const e = await listEvent(slug);
  const uname = user.name;
  const eventCreator = e.creator;


  if (uname === eventCreator || user.admin) {
    let { name, description } = req.body;

    if (name === '' && description === '') {
      return res.status(400).json({ error: 'a.m.k. ein breyting' });
    }
    if (name === '') {
      name = e.name;
    }
    if (description === '') {
      description = e.description;
    }

    slug = slugify(name);
    const result = await updateEvent(e.id, { name, slug, description });

    if (!result) {
      return res.status(400).json({ error: '' })
    }

    return res.status(200).json(result);
  }

  return res.status(403).json({ error: 'access denied' });
}

async function deleteEvent(req, res) {
  const { slug } = req.params;
  const event = await listEvent(slug);
  const { id } = event;
  const { user } = req;

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (user.name === event.Creator || user.admin) {
    try {
      await deleteQuery(
        'DELETE FROM registrations WHERE event=$1',
        [id]
      );

      const rowsDeleted = await deleteQuery(
        'DELETE FROM events WHERE id=$1',
        [id]
      );

      if (rowsDeleted === 0) {
        return res.status(404).end();
      }

      return res.status(200).json({});
    } catch (e) {
      return res.json(e);
    }
  }

  return res.status(403).json({ error: 'access denied' });
}

async function deleteRegistration(req, res) {
  const { user } = req;
  const { slug } = req.params;
  const event = await listEvent(slug);

  try {
    const rowsDeleted = await deleteQuery(
      'DELETE FROM registrations WHERE name=$1 AND event=$2',
      [user.name, event.id]
    );

    if (rowsDeleted === 0) {
      return res.status(404).end();
    }

    return res.status(200).json({});
  } catch (e) {
    return res.status(404).json(e);
  }
}

indexRouter.get('/', catchErrors(indexRoute));
indexRouter.post(
  '/',
  requireAuthentication,
  registrationValidationMiddleware('Athugasemd'),
  xssSanitizationMiddleware('Athugasemd'),
  validationCheck,
  sanitizationMiddleware('Athugasemd'),
  catchErrors(registerEvent)
);
indexRouter.get('/:slug', catchErrors(eventRoute));
indexRouter.patch(
  '/:slug',
  requireAuthentication,
  registrationValidationMiddleware('description'),
  nameValidator,
  validationCheck,
  catchErrors(patchEvent)
);
indexRouter.delete(
  '/:slug',
  requireAuthentication,
  catchErrors(deleteEvent)
);
indexRouter.post(
  '/:slug/register',
  requireAuthentication,
  registrationValidationMiddleware('comment'),
  xssSanitizationMiddleware('comment'),
  validationCheck,
  sanitizationMiddleware('comment'),
  catchErrors(registerRoute)
);
indexRouter.delete(
  '/:slug/register',
  requireAuthentication,
  catchErrors(deleteRegistration))
