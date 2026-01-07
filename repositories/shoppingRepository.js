const db = require('../data/database');

class ShoppingRepository {
    getAll() {
        const query = db.prepare('SELECT * FROM shopping_list');
        return query.all().reverse();
    }

    create(item, quantity, store) {
        if (quantity > 0) {
            const insert = db.prepare('INSERT INTO shopping_list (item, quantity, store) VALUES (?, ?, ?)');
            return insert.run(item, quantity, store);
        } else {
            throw Exception("Quantity must be greater than 0");
        }
    }

    delete(id) {
        const deleteItem = db.prepare('DELETE FROM shopping_list WHERE id = ?');
        return deleteItem.run(id);
    }
}

module.exports = new ShoppingRepository();
