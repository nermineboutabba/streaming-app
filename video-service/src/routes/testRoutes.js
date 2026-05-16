const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/test-db', (req, res) => {

    const sql = `
        INSERT INTO videos
        (title, description, category, filename, filepath, creatorId)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        'Test Video',
        'This is a test',
        'Education',
        'test.mp4',
        '/uploads/test.mp4',
        1
    ];

    db.run(sql, values, function(err) {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: 'Video inserted successfully',
            videoId: this.lastID
        });
    });

});

router.get('/videos-test', (req, res) => {

    db.all('SELECT * FROM videos', [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });

});

module.exports = router;