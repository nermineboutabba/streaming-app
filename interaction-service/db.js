const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'interactions.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Erreur d'ouverture DB:", err.message);
    else console.log("✅ Base de données SQLite3 connectée.");
});

db.serialize(() => {
    // Table Commentaires
    db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, videoId TEXT, userId TEXT, content TEXT)");
    // Table Likes
    db.run("CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, videoId TEXT, userId TEXT)");
    // Table Playlists (Fonctionnalité spécifique Personne 3)
    db.run("CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, userId TEXT, videoId TEXT)");
});

module.exports = db;