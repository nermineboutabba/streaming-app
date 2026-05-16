const db = require('../database/db');
const {
    sendVideoUploadedEvent
} = require('../kafka/producer');


// CREATE VIDEO
exports.createVideo = (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: 'No video uploaded'
            });
        }

        const {
            title,
            description,
            category,
            creatorId
        } = req.body;

        const filename = req.file.filename;
        const filepath = req.file.path;
        const sql = `
            INSERT INTO videos
            (title, description, category, filename, filepath, creatorId)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [
            title,
            description,
            category,
            filename,
            filepath,
            creatorId
        ];

        db.run(sql, values, function (err) {
            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }
            const eventData = {
                videoId: this.lastID,
                title,
                creatorId
            };

            sendVideoUploadedEvent(eventData);

            res.status(201).json({
                message: 'Video uploaded successfully',
                videoId: this.lastID,
                filename
            });
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};

// GET ALL VIDEOS
exports.getAllVideos = (req, res) => {

    const sql = `SELECT * FROM videos`;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
};



// GET VIDEO BY ID
exports.getVideoById = (req, res) => {

    const id = req.params.id;

    const sql = `SELECT * FROM videos WHERE id = ?`;

    db.get(sql, [id], (err, row) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                message: 'Video not found'
            });
        }

        res.json(row);
    });
};



// DELETE VIDEO
exports.deleteVideo = (req, res) => {

    const id = req.params.id;

    const sql = `DELETE FROM videos WHERE id = ?`;

    db.run(sql, [id], function (err) {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                message: 'Video not found'
            });
        }

        res.json({
            message: 'Video deleted successfully'
        });
    });
};



// SEARCH VIDEOS
exports.searchVideos = (req, res) => {

    const query = req.query.q;

    const sql = `
        SELECT * FROM videos
        WHERE title LIKE ?
    `;

    db.all(sql, [`%${query}%`], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
};



// GET LATEST VIDEOS
exports.getLatestVideos = (req, res) => {

    const sql = `
        SELECT * FROM videos
        ORDER BY createdAt DESC
        LIMIT 10
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
};



// GET TRENDING VIDEOS
exports.getTrendingVideos = (req, res) => {

    const sql = `
        SELECT * FROM videos
        ORDER BY likes DESC
        LIMIT 10
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
};