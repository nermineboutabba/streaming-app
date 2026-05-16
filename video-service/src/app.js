const express = require('express');
const cors = require('cors');
require('./database/db');

//const testRoutes = require('./routes/testRoutes');
const videoRoutes = require('./routes/videoRoutes');
const startGrpcServer = require('./grpc/videoGrpcServer');
const { connectProducer } = require('./kafka/producer');
const startConsumer = require('./kafka/consumer');
const app = express();

app.use(cors());
app.use(express.json());
//app.use('/', testRoutes);
app.use('/uploads', express.static('src/uploads'));
app.use('/api', videoRoutes);

app.get('/', (req, res) => {
    res.send('Video Service Running');
});

const PORT = 3002;

async function startServices() {
    await connectProducer();
    await startConsumer();
    startGrpcServer();

    app.listen(PORT, () => {
        console.log(
            `Video Service running on port ${PORT}`
        );
    });
}

startServices();

app.use((err, req, res, next) => {

    res.status(500).json({
        error: err.message
    });
});