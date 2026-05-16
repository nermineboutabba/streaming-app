const kafka = require('./kafkaClient');
const db = require('../database/db');
const consumer = kafka.consumer({
    groupId: 'video-group'
});

async function startConsumer() {
    await consumer.connect();
    console.log('Kafka Consumer Connected');

    // SUBSCRIBE TO TOPICS
    await consumer.subscribe({
        topic: 'video-events',
        fromBeginning: true
    });

    // HANDLE MESSAGES
    await consumer.run({
        eachMessage: async ({
            topic,
            message
        }) => {
            const data = JSON.parse(
                message.value.toString()
            );
            console.log(
                `Received event from ${topic}`,
                data
            );

            // VIDEO LIKED EVENT
            if (data.type === 'VIDEO_LIKED') {

                const sql = `
                    UPDATE videos
                    SET likes = likes + 1
                    WHERE id = ?
                `;
                db.run(sql, [data.videoId]);
            }

            // COMMENT ADDED EVENT
            if (data.type === 'COMMENT_ADDED') {
                console.log(
                    'Comment added to video:',
                    data.videoId
                );
            }
        }
    });
}

module.exports = startConsumer;