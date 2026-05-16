// IMPORT gRPC LIBRARIES
// grpc-js handles the gRPC server
// proto-loader loads .proto files into JavaScript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');


// PATH MODULE
// Used to create safe file paths
const path = require('path');


// DATABASE CONNECTION
// Import SQLite database connection
const db = require('../database/db');



/* =====================================================
   LOAD PROTO FILE
===================================================== */

// Path to the .proto contract file
const PROTO_PATH = path.join(__dirname, '..', '..', '..','proto', 'video.proto');


// Load and parse the proto file
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,   // Keep field names exactly as written
        longs: String,    // Convert long values to strings
        enums: String,    // Convert enums to strings
        defaults: true,   // Populate default values
        oneofs: true      // Support oneof fields
    }
);


// Convert loaded proto into usable gRPC object
// ".video" comes from:
// package video;
const videoProto =
    grpc.loadPackageDefinition(packageDefinition).video;



/* =====================================================
   gRPC METHOD: GET VIDEO BY ID
===================================================== */

function GetVideo(call, callback) {

    // Extract ID from gRPC request
    const id = call.request.id;

    // SQL query
    const sql =
        `SELECT * FROM videos WHERE id = ?`;

    // Execute database query
    db.get(sql, [id], (err, row) => {

        // Handle database errors
        if (err) {
            return callback(err);
        }

        // Handle video not found
        if (!row) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Video not found'
            });
        }

        // Return video data
        callback(null, row);
    });
}



/* =====================================================
   gRPC METHOD: GET ALL VIDEOS
===================================================== */

function ListVideos(call, callback) {

    const sql = `SELECT * FROM videos`;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return callback(err);
        }

        // Return array of videos
        callback(null, {
            videos: rows
        });
    });
}



/* =====================================================
   gRPC METHOD: SEARCH VIDEOS
===================================================== */

function SearchVideos(call, callback) {

    // Search query from client
    const query = call.request.query;

    const sql = `
        SELECT * FROM videos
        WHERE title LIKE ?
    `;

    db.all(sql, [`%${query}%`], (err, rows) => {

        if (err) {
            return callback(err);
        }

        callback(null, {
            videos: rows
        });
    });
}



/* =====================================================
   gRPC METHOD: DELETE VIDEO
===================================================== */

function DeleteVideo(call, callback) {

    const id = call.request.id;

    const sql =
        `DELETE FROM videos WHERE id = ?`;

    db.run(sql, [id], function(err) {

        if (err) {
            return callback(err);
        }

        // this.changes tells how many rows were deleted
        callback(null, {
            success: this.changes > 0,
            message: this.changes > 0
                ? 'Video deleted'
                : 'Video not found'
        });
    });
}



/* =====================================================
   gRPC METHOD: GET TRENDING VIDEOS
===================================================== */

function GetTrendingVideos(call, callback) {

    // Sort videos by likes descending
    const sql = `
        SELECT * FROM videos
        ORDER BY likes DESC
        LIMIT 10
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return callback(err);
        }

        callback(null, {
            videos: rows
        });
    });
}



/* =====================================================
   gRPC METHOD: GET LATEST VIDEOS
===================================================== */

function GetLatestVideos(call, callback) {

    // Sort videos by creation date descending
    const sql = `
        SELECT * FROM videos
        ORDER BY createdAt DESC
        LIMIT 10
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return callback(err);
        }

        callback(null, {
            videos: rows
        });
    });
}



/* =====================================================
   START gRPC SERVER
===================================================== */

function startGrpcServer() {

    // Create gRPC server instance
    const server = new grpc.Server();


    // Register VideoService methods
    server.addService(
        videoProto.VideoService.service,
        {
            GetVideo,
            ListVideos,
            SearchVideos,
            DeleteVideo,
            GetTrendingVideos,
            GetLatestVideos
        }
    );


    // gRPC server port
    const GRPC_PORT = '0.0.0.0:50052';


    // Bind server to port
    server.bindAsync(
        GRPC_PORT,

        // No SSL for local development
        grpc.ServerCredentials.createInsecure(),

        (err, port) => {

            if (err) {
                console.error(err);
                return;
            }

            console.log(
                `gRPC server running on port ${port}`
            );
        }
    );
}



// EXPORT FUNCTION
// app.js will use this to start gRPC server
module.exports = startGrpcServer;