const express = require("express");
const { body, validationResult } = require("express-validator");
const dayjs = require("dayjs");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/my", requireAuth, (req, res) => {
  const bookings = db
    .prepare(
      `SELECT b.*, e.title, e.location, e.starts_at, e.ends_at
       FROM bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.user_id = ?
       ORDER BY e.starts_at ASC`
    )
    .all(req.session.user.id);

  res.render("bookings/my", {
    title: "My Bookings",
    bookings,
    dayjs,
  });
});

router.post(
  "/:eventId",
  requireAuth,
  [body("quantity").isInt({ min: 1, max: 20 }).withMessage("Quantity must be between 1 and 20.")],
  (req, res) => {
    const errors = validationResult(req);
    const { eventId } = req.params;
    const quantity = Number(req.body.quantity);

    if (!errors.isEmpty()) {
      req.session.error = errors.array()[0].msg;
      return res.redirect(`/events/${eventId}`);
    }

    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId);
    if (!event) {
      return res.status(404).render("404", { title: "Not Found" });
    }

    if (event.owner_id === req.session.user.id) {
      req.session.error = "You cannot book your own event.";
      return res.redirect(`/events/${eventId}`);
    }

    const existing = db
      .prepare("SELECT * FROM bookings WHERE user_id = ? AND event_id = ?")
      .get(req.session.user.id, event.id);

    if (existing) {
      req.session.error = "You already booked this event. Cancel and rebook if needed.";
      return res.redirect(`/events/${eventId}`);
    }

    if (event.seats_available < quantity) {
      req.session.error = "Not enough seats available.";
      return res.redirect(`/events/${eventId}`);
    }

    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO bookings (user_id, event_id, quantity) VALUES (?, ?, ?)").run(
        req.session.user.id,
        event.id,
        quantity
      );
      db.prepare("UPDATE events SET seats_available = seats_available - ? WHERE id = ?").run(
        quantity,
        event.id
      );
    });

    transaction();

    req.session.success = "Booking created successfully.";
    return res.redirect("/bookings/my");
  }
);

router.delete("/:bookingId", requireAuth, (req, res) => {
  const booking = db
    .prepare("SELECT * FROM bookings WHERE id = ? AND user_id = ?")
    .get(req.params.bookingId, req.session.user.id);

  if (!booking) {
    req.session.error = "Booking not found.";
    return res.redirect("/bookings/my");
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM bookings WHERE id = ?").run(booking.id);
    db.prepare("UPDATE events SET seats_available = seats_available + ? WHERE id = ?").run(
      booking.quantity,
      booking.event_id
    );
  });

  transaction();

  req.session.success = "Booking cancelled successfully.";
  return res.redirect("/bookings/my");
});

module.exports = router;
