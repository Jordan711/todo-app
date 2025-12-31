var express = require('express');
var router = express.Router();
const db = require('../data/database');

/* GET users listing. */
router.get('/', function (req, res) {
  // Query the database
  const query = db.prepare('SELECT * FROM users');
  const users = query.all();

  res.render('users', { title: 'User List', users: users });
  // res.send(users);
});

/* POST a new user. */
router.post('/add', function (req, res) {
  const { name, email } = req.body;
  const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

  insert.run(name, email);
  res.redirect('/users');
});

module.exports = router;