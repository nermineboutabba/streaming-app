import { Kafka } from 'kafkajs';

// Config mta3 Kafka: ykallem localhost:9092 elli f-west Docker
const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [kafkaBroker],
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
});

const producer = kafka.producer();

/**
 * Fonction bech n-publiyw event jdid ki user y-tsajjel
 */
export async function publishUserCreated(user) {
  try {
    // 1. Connecter lel broker
    await producer.connect();
    
    // 2. Ab3ath el message lel topic "user-created"
    await producer.send({
      topic: 'user-created',
      messages: [
        { 
          key: user.id, 
          value: JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: new Date().toISOString()
          }) 
        },
      ],
    });

    console.log(`✅ Kafka: Event sent for user "${user.username}"`);
    
    // 3. Deconnecter (Optionnel ken t-heb tkhallih mahloul dima)
    await producer.disconnect();

  } catch (error) {
    console.error('❌ Kafka Error:', error.message);
    // Hna ma n-wa9fouch el khedma ken Kafka fih mochkla
    // L-user dima yet-sajjel fil DB mriguel
  }
}