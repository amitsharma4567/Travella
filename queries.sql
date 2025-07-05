SETUP --

DROP TABLE IF EXISTS user_visited_countries, users, families, countriescode CASCADE;


CREATE TABLE families (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashedPwd TEXT NOT NULL,
  username VARCHAR(100) NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  family_id INTEGER REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE user_visited_countries (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(10) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE countriescode (
  id SERIAL PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  country_code VARCHAR(10) NOT NULL
);
