const db = require('../data/database');

class NoticeRepository {
    getAll() {
        try {
            const query = db.prepare('SELECT * FROM notices ORDER BY id DESC');
            return query.all();
        } catch (error) {
            console.error('Error fetching notices:', error.message);
            throw new Error('Failed to retrieve notices from database');
        }
    }

    create(name, message) {
        try {
            const insert = db.prepare('INSERT INTO notices (name, message) VALUES (?, ?)');
            return insert.run(name, message);
        } catch (error) {
            console.error('Error creating notice:', error.message);
            throw new Error('Failed to create notice in database');
        }
    }
}

module.exports = new NoticeRepository();
