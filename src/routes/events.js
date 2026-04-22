const express = require("express");
const { body, validationResult } = require("express-validator");
const dayjs = require("dayjs");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function eventValidators() {
  return [
    body("title").trim().isLength({ min: 3 }).withMessage("Title must be at least 3 characters."),
    body("description").trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters."),
    body("location").trim().isLength({ min: 2 }).withMessage("Location is required."),
    body("starts_at").notEmpty().withMessage("Start date/time is required."),
    body("ends_at").notEmpty().withMessage("End date/time is required."),
    body("capacity").isInt({ min: 1 }).withMessage("Capacity must be at least 1."),
  ];
}

router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();

  let events;
  if (q) {
    events = db
      .prepare(
        `SELECT e.*, u.name AS owner_name
         FROM events e
         JOIN users u ON u.id = e.owner_id
         WHERE e.title LIKE ? OR e.location LIKE ? OR e.description LIKE ?
         ORDER BY e.starts_at ASC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    events = db
      .prepare(
        `SELECT e.*, u.name AS owner_name
         FROM events e
         JOIN users u ON u.id = e.owner_id
         ORDER BY e.starts_at ASC`
      )
      .all();
  }

  res.render("events/index", {
    title: "Browse Events",
    events,
    q,
    dayjs,
  });
});

router.get("/manage", requireAuth, (req, res) => {
  const events = db
    .prepare("SELECT * FROM events WHERE owner_id = ? ORDER BY starts_at ASC")
    .all(req.session.user.id);

  res.render("events/manage", {
    title: "Manage My Events",
    events,
    dayjs,
  });
});

router.get("/new", requireAuth, (req, res) => {
  res.render("events/new", { title: "Create Event" });
});

router.post("/", requireAuth, eventValidators(), (req, res) => {
  const errors = validationResult(req);
  const { title, description, location, starts_at, ends_at, capacity } = req.body;

  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    req.session.input = { title, description, location, starts_at, ends_at, capacity };
    return res.redirect("/events/new");
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    req.session.error = "End date/time must be after the start date/time.";
    req.session.input = { title, description, location, starts_at, ends_at, capacity };
    return res.redirect("/events/new");
  }

  db.prepare(
    `INSERT INTO events
     (owner_id, title, description, location, starts_at, ends_at, capacity, seats_available)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.session.user.id,
    title,
    description,
    location,
    starts_at,
    ends_at,
    Number(capacity),
    Number(capacity)
  );

  req.session.success = "Event created successfully.";
  return res.redirect("/events/manage");
});

router.get("/:id", (req, res) => {
  const event = db
    .prepare(
      `SELECT e.*, u.name AS owner_name
       FROM events e
       JOIN users u ON u.id = e.owner_id
       WHERE e.id = ?`
    )
    .get(req.params.id);

  if (!event) {
    return res.status(404).render("404", { title: "Not Found" });
  }

  const existingBooking = req.session.user
    ? db
        .prepare("SELECT * FROM bookings WHERE user_id = ? AND event_id = ?")
        .get(req.session.user.id, event.id)
    : null;

  res.render("events/show", {
    title: event.title,
    event,
    dayjs,
    existingBooking,
  });
});

router.get("/:id/edit", requireAuth, (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) {
    return res.status(404).render("404", { title: "Not Found" });
  }

  if (event.owner_id !== req.session.user.id) {
    req.session.error = "You can only edit your own events.";
    return res.redirect("/events/manage");
  }

  res.render("events/edit", {
    title: `Edit ${event.title}`,
    event,
  });
});

router.put("/:id", requireAuth, eventValidators(), (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) {
    return res.status(404).render("404", { title: "Not Found" });
  }

  if (event.owner_id !== req.session.user.id) {
    req.session.error = "You can only edit your own events.";
    return res.redirect("/events/manage");
  }

  const errors = validationResult(req);
  const { title, description, location, starts_at, ends_at, capacity } = req.body;

  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect(`/events/${event.id}/edit`);
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    req.session.error = "End date/time must be after the start date/time.";
    return res.redirect(`/events/${event.id}/edit`);
  }

  const currentBookings = db
    .prepare("SELECT COALESCE(SUM(quantity), 0) AS total FROM bookings WHERE event_id = ?")
    .get(event.id).total;

  const newCapacity = Number(capacity);
  if (newCapacity < currentBookings) {
    req.session.error = "Capacity cannot be lower than total booked seats.";
    return res.redirect(`/events/${event.id}/edit`);
  }

  const newAvailable = newCapacity - currentBookings;

  db.prepare(
    `UPDATE events
     SET title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?, capacity = ?, seats_available = ?
     WHERE id = ?`
  ).run(title, description, location, starts_at, ends_at, newCapacity, newAvailable, event.id);

  req.session.success = "Event updated successfully.";
  return res.redirect("/events/manage");
});

router.delete("/:id", requireAuth, (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) {
    return res.status(404).render("404", { title: "Not Found" });
  }

  if (event.owner_id !== req.session.user.id) {
    req.session.error = "You can only delete your own events.";
    return res.redirect("/events/manage");
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM bookings WHERE event_id = ?").run(event.id);
    db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
  });

  transaction();

  req.session.success = "Event deleted successfully.";
  return res.redirect("/events/manage");
});

module.exports = router;
