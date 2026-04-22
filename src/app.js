const path = require("path");
const express = require("express");
const session = require("express-session");
const methodOverride = require("method-override");

require("./config/db");

const { attachLocals } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const bookingRoutes = require("./routes/bookings");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(methodOverride("_method"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 4,
    },
  })
);

app.use(attachLocals);

app.get("/", (req, res) => {
  res.render("home", { title: "EventHub" });
});

app.use(authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);

app.use((req, res) => {
  res.status(404).render("404", { title: "Not Found" });
});

app.listen(PORT, () => {
  console.log(`EventHub running on http://localhost:${PORT}`);
});
