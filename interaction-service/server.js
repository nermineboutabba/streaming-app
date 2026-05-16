const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const db = require('./db');
const path = require('path');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'interaction-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'interaction.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const interactionProto = grpc.loadPackageDefinition(packageDefinition).interaction;

const server = new grpc.Server();

async function sendEvent(type, data) {
    try {
        await producer.send({
            topic: 'video-events',
            messages: [{ value: JSON.stringify({ type, ...data, timestamp: new Date() }) }],
        });
        console.log(`📢 Kafka : Événement [${type}] envoyé.`);
    } catch (err) { console.error("❌ Erreur Kafka:", err.message); }
}

server.addService(interactionProto.InteractionService.service, {
    AddComment: (call, callback) => {
        const { videoId, userId, content } = call.request;
        db.run("INSERT INTO comments (videoId, userId, content) VALUES (?, ?, ?)", [videoId, userId, content], function(err) {
            if (err) return callback(err);
            sendEvent('COMMENT_ADDED', { videoId, userId });
            callback(null, { id: this.lastID.toString(), message: "Commentaire ajouté !" });
        });
    },
    GetComments: (call, callback) => {
        db.all("SELECT id, userId, content FROM comments WHERE videoId = ?", [call.request.videoId], (err, rows) => {
            if (err) return callback(err);
            callback(null, { comments: rows || [] });
        });
    },
    LikeVideo: (call, callback) => {
        const { videoId, userId } = call.request;
        db.run("INSERT INTO likes (videoId, userId) VALUES (?, ?)", [videoId, userId], function(err) {
            db.get("SELECT COUNT(*) as total FROM likes WHERE videoId = ?", [videoId], (err, row) => {
                sendEvent('VIDEO_LIKED', { videoId, userId });
                callback(null, { message: "Action enregistrée !", totalLikes: row ? row.total : 0 });
            });
        });
    }
});

async function run() {
    await producer.connect();
    server.bindAsync('127.0.0.1:50053', grpc.ServerCredentials.createInsecure(), () => {
        console.log("✅ Service Interaction prêt (Port 50053 + Kafka 9092)");
        server.start();
    });
}
run().catch(console.error);