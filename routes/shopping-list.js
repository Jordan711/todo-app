const express = require('express');
const router = express.Router();
const shoppingRepo = require('../repositories/shoppingRepository');
const { body, validationResult } = require('express-validator');

/* GET users listing. */
router.get('/', function (req, res) {
    // Query the database
    const shoppingList = shoppingRepo.getAll();

    res.render('shopping-list', { title: 'Shopping List', shoppingList: shoppingList });
});

/* POST a new user. */
router.post('/add', [
    body('item').trim().escape().notEmpty(),
    body('quantity').trim().isNumeric().escape(),
    body('store').trim().escape().notEmpty()
], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { item, quantity, store } = req.body;
    shoppingRepo.create(item, quantity, store);
    res.redirect('/shopping-list');
});

router.post('/delete', [
    body('id').notEmpty().escape()
], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.body;
    shoppingRepo.delete(id);
    res.redirect('/shopping-list');
});

module.exports = router;