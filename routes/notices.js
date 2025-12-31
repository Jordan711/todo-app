var express = require('express');
var router = express.Router();
const db = require('../data/database');

/* GET users listing. */
router.get('/', function (req, res) {
  // Query the database
  const query = db.prepare('SELECT * FROM notices');
  const notices = query.all().reverse();

  res.render('notices', { title: 'Notice Board', notices: notices });
});

/* POST a new user. */
router.post('/add', function (req, res) {
  const { name, message } = req.body;
  const insert = db.prepare('INSERT INTO notices (name, message) VALUES (?, ?)');

  insert.run(name, message);
  res.redirect('/notices');
});

module.exports = router;