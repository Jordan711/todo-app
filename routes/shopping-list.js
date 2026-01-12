const express = require('express');
const router = express.Router();
const shoppingRepo = require('../repositories/shoppingRepository');
const { body, validationResult } = require('express-validator');

/* GET shopping list. */
router.get('/', function (req, res, next) {
    try {
        // Query the database
        const shoppingList = shoppingRepo.getAll();
        res.render('shopping-list', { title: 'Shopping List', shoppingList: shoppingList });
    } catch (error) {
        next(error);
    }
});

/* POST a new shopping item. */
router.post('/add', [
    body('item').trim().escape().notEmpty().withMessage('Item is required'),
    body('quantity').trim().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('store').trim().escape().notEmpty().withMessage('Store is required')
], function (req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { item, quantity, store } = req.body;
        shoppingRepo.create(item, quantity, store);
        res.redirect('/shopping-list');
    } catch (error) {
        next(error);
    }
});

router.post('/delete', [
    body('id').isInt().toInt().withMessage('ID must be a valid integer')
], function (req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.body;
        shoppingRepo.delete(id);
        res.redirect('/shopping-list');
    } catch (error) {
        next(error);
    }
});

router.post('/check', [
    body('id').isInt().toInt().withMessage('ID must be a valid integer')
], function (req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.body;
        shoppingRepo.toggleCheck(id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;