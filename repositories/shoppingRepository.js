const db = require('../data/database');

class ShoppingRepository {
    getAll() {
        try {
            const query = db.prepare('SELECT * FROM shopping_list ORDER BY id DESC');
            return query.all();
        } catch (error) {
            console.error('Error fetching shopping list:', error.message);
            throw new Error('Failed to retrieve shopping list from database');
        }
    }

    create(item, quantity, store) {
        if (quantity > 0) {
            try {
                const insert = db.prepare('INSERT INTO shopping_list (item, quantity, store, checked) VALUES (?, ?, ?, 0)');
                return insert.run(item, quantity, store);
            } catch (error) {
                console.error('Error creating shopping item:', error.message);
                throw new Error('Failed to create shopping item in database');
            }
        } else {
                console.error("Invalid Quantity: " + quantity);
                throw new Error('Error: Quantity must be greater than 0');
        }
    }

    delete(id) {
        try {
            const deleteItem = db.prepare('DELETE FROM shopping_list WHERE id = ?');
            return deleteItem.run(id);
        } catch (error) {
            console.error('Error deleting shopping item:', error.message);
            throw new Error('Failed to delete shopping item from database');
        }
    }
}

module.exports = new ShoppingRepository();
