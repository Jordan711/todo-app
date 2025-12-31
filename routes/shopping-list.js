var express = require('express');
var router = express.Router();
const db = require('../data/database');

/* GET users listing. */
router.get('/', function (req, res) {
    // Query the database
    const query = db.prepare('SELECT * FROM shopping_list');
    const shoppingList = query.all().reverse();

    res.render('shopping-list', { title: 'Shopping List', shoppingList: shoppingList });
});

/* POST a new user. */
router.post('/add', function (req, res) {
    const { item, quantity, store } = req.body;
    const insert = db.prepare('INSERT INTO shopping_list (item, quantity, store) VALUES (?, ?, ?)');

    insert.run(item, quantity, store);
    res.redirect('/shopping-list');
});

router.post('/delete', function (req, res) {
    const { id } = req.body;
    const deleteItem = db.prepare('DELETE FROM shopping_list WHERE id = ?');
    deleteItem.run(id);
    res.redirect('/shopping-list');
});

module.exports = router;