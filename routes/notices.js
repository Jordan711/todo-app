const express = require('express');
const router = express.Router();
const noticeRepo = require('../repositories/noticeRepository');
const { body, validationResult } = require('express-validator');

/* GET notices listing. */
router.get('/', function (req, res, next) {
  try {
    // Query the database
    const notices = noticeRepo.getAll();
    res.render('notices', { title: 'Notice Board', notices: notices });
  } catch (error) {
    next(error);
  }
});

/* POST a new notice. */
router.post('/add', [
  body('name').trim().escape().notEmpty().withMessage('Name is required'),
  body('message').trim().escape().notEmpty().withMessage('Message is required')
], function (req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, message } = req.body;
    noticeRepo.create(name, message);
    res.redirect('/notices');
  } catch (error) {
    next(error);
  }
});

module.exports = router;