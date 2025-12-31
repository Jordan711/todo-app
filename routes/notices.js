const express = require('express');
const router = express.Router();
const noticeRepo = require('../repositories/noticeRepository');
const { body, validationResult } = require('express-validator');

/* GET users listing. */
router.get('/', function (req, res) {
  // Query the database
  const notices = noticeRepo.getAll();

  res.render('notices', { title: 'Notice Board', notices: notices });
});

/* POST a new user. */
router.post('/add', [
  body('name').trim().escape().notEmpty(),
  body('message').trim().escape().notEmpty()
], function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, message } = req.body;
  noticeRepo.create(name, message);
  res.redirect('/notices');
});

module.exports = router;