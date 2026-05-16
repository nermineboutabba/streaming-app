const kafka = require('./kafkaClient');
const { Partitioners } = require('kafkajs');
const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner
});
async function connectProducer() {
    await producer.connect();
    console.log('Kafka Producer Connected');
}

async function sendVideoUploadedEvent(video) {
    await producer.send({
        topic: 'video.uploaded',
        messages: [
            {value: JSON.stringify(video)}
        ]
    });
    console.log('video.uploaded event sent');
}

module.exports = {
    connectProducer,
    sendVideoUploadedEvent
};