import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

import env from "dotenv";
env.config();

import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";

const app = express();
const port = 3000;

const saltRounds = 10;


app.use(passport.initialize());

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_FULL,
  password: process.env.DB_PWD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, 
  },
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 0;
let currFamilyId = 0;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://travella-jaio.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.email;
    const username = profile.displayName;

    // Check if this email already exists
    const result = await db.query("SELECT * FROM families WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      //  It's a signup via Google — create the user with no password
      const insertResult = await db.query(
        "INSERT INTO families (email, hashedPwd, username) VALUES ($1, $2, $3) RETURNING *",
        [email, null, username]
      );
      currFamilyId = insertResult.rows[0].id;
      console.log("New Google signup:", username);
    } else {
      // Already registered — allow login
      currFamilyId = result.rows[0].id;
      console.log(" Google login:", username);
    }

    return done(null, profile);
  } catch (err) {
    console.error("Google auth error:", err);
    return done(err);
  }
}));



app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", function (err, user, info) {
    if (err) return next(err);
    if (!user) {
      return res.render("landing.ejs", {
        emailError: "User not registered with Google",
        pwdError: null,
        showModal: "login"
      });
    }

    //  Google login/signup success
    res.redirect("/dashboard");
  })(req, res, next);
});


app.get("/", (req, res) => {
  const { error, show } = req.query; // from URL like /?error=incorrect&show=login

  let emailError = null;
  let pwdError = null;

  if (error === "incorrect") {
    pwdError = "Incorrect password";
  } else if (error === "notregistered") {
    emailError = "Email not registered";
  } else if (error === "taken") {
    emailError = "Email already registered";
  }

  res.render("landing.ejs", {
    emailError,
    pwdError,
    showModal: show || null // 'login' or 'signup'
  });
});

app.get("/privacy", (req, res) => {
  res.render("privacy.ejs");
});
app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});
app.post("/contact-form", (req, res) => {
  const { name, email, message } = req.body;
  console.log("Contact form submission:", name, email, message);
  
  res.redirect("/?message=sent");
  res.redirect("/");
  
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM families WHERE email = $1", [email]);

    if (checkResult.rows.length > 0) {
      // Email already exists
      return res.redirect("/?error=taken&show=signup");
    }

    const hashedPwd = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      "INSERT INTO families (email, hashedPwd, username) VALUES ($1, $2, $3) RETURNING *",
      [email, hashedPwd, username]
    );

    currFamilyId = result.rows[0].id;

    console.log("New family signed up:", result.rows[0]);

    // Redirect to dashboard
    res.redirect("/dashboard");

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email);


  try {
    const result = await db.query("SELECT * FROM families WHERE email = $1", [email]);
    console.log(result);

    if (result.rows.length === 0) {
      // User not registered
      return res.redirect("/?error=notregistered&show=login");
    }

    const storedHash = result.rows[0].hashedpwd; // Match your actual column name

    const match = await bcrypt.compare(password, storedHash);

    if (match) {
      // Password is correct
      currFamilyId = result.rows[0].id;
      return res.redirect("/dashboard");
    } else {
      // Password incorrect
      return res.redirect("/?error=incorrect&show=login");
    }

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Internal Server Error");
  }
});

async function visitedCountries() {
  const result = await db.query(
    "SELECT country_code FROM user_visited_countries WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}


app.get("/dashboard", async (req, res) => {

  const users = await db.query(
    "SELECT id, name, color FROM users WHERE family_id = $1",
    [currFamilyId]
  );

  res.render("index.ejs", {
    countries: [],
    total: 0, // 0 for now
    users: users.rows,
    color: "teal",
  });
});

app.post("/add", async (req, res) => {
  if (req.body.add === "addcntry") {
    const input = req.body["country"];

    try {
      const result = await db.query(
        "SELECT country_code FROM countriescode WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
        [input.toLowerCase()]
      );

      const data = result.rows[0];
      const countryCode = data.country_code;
      try {
        await db.query(
          "INSERT INTO user_visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );

        const countries = await visitedCountries();
        const users = await db.query(
          "SELECT id, name, color FROM users WHERE family_id = $1",
          [currFamilyId]
        );
        const queryResult = await db.query("SELECT color FROM users WHERE id=$1;", [currentUserId]);
        res.render("index.ejs", {
          users: users.rows,
          countries: countries,
          total: countries.length,
          color: queryResult.rows[0].color,
        });
      } catch (err) {
        console.log(err);
      }
    } catch (err) {
      console.log(err);
    }
  } else if (req.body.add === "dltmembr") {
    try {
      await db.query("DELETE FROM user_visited_countries WHERE user_id = $1;", [currentUserId]);
      await db.query("DELETE FROM users WHERE id = $1;", [currentUserId]);

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;

    const countries = await visitedCountries();
    const users = await db.query(
      "SELECT id, name, color FROM users WHERE family_id = $1",
      [currFamilyId]
    );
    const queryResult = await db.query("SELECT color FROM users WHERE id=$1;", [currentUserId]);
    res.render("index.ejs", {
      users: users.rows,
      countries: countries,
      total: countries.length,
      color: queryResult.rows[0].color,
    });
  }
});

app.post("/new", async (req, res) => {   
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color, family_id) VALUES($1, $2, $3) RETURNING *;",
    [name, color, currFamilyId]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  currFamilyId = 0;
  currentUserId = 0;
  res.redirect("/");
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
