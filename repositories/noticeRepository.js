const db = require('../data/database');

class NoticeRepository {
    getAll() {
        const query = db.prepare('SELECT * FROM notices');
        return query.all().reverse();
    }

    create(name, message) {
        const insert = db.prepare('INSERT INTO notices (name, message) VALUES (?, ?)');
        return insert.run(name, message);
    }
}

module.exports = new NoticeRepository();
