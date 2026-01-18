const express = require('express');
const router = express.Router();
// const calendarRepo = require('../repositories/calendarRepository');
const { body, validationResult } = require('express-validator');

/* GET shopping list. */
router.get('/', function (req, res, next) {
    try {
        // Query the database
        res.render('calendar', { title: 'Calendar' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;