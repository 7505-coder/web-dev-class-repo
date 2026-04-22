const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const db = require("../config/db");
const { requireGuest, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/register", requireGuest, (req, res) => {
  res.render("register", { title: "Create Account" });
});

router.post(
  "/register",
  requireGuest,
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name is required."),
    body("email").trim().isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { name, email, password } = req.body;

    if (!errors.isEmpty()) {
      req.session.error = errors.array()[0].msg;
      req.session.input = { name, email };
      return res.redirect("/register");
    }

    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existingUser) {
      req.session.error = "An account with this email already exists.";
      req.session.input = { name, email };
      return res.redirect("/register");
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(name, email, hash);

    req.session.user = {
      id: result.lastInsertRowid,
      name,
      email,
    };

    req.session.success = "Welcome! Your account was created successfully.";
    return res.redirect("/");
  }
);

router.get("/login", requireGuest, (req, res) => {
  res.render("login", { title: "Login" });
});

router.post(
  "/login",
  requireGuest,
  [
    body("email").trim().isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { email, password } = req.body;

    if (!errors.isEmpty()) {
      req.session.error = errors.array()[0].msg;
      req.session.input = { email };
      return res.redirect("/login");
    }

    const user = db
      .prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      req.session.error = "Invalid email or password.";
      req.session.input = { email };
      return res.redirect("/login");
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      req.session.error = "Invalid email or password.";
      req.session.input = { email };
      return res.redirect("/login");
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    req.session.success = "You are now logged in.";
    return res.redirect("/");
  }
);

router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
