const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const express = require('express');
const bodyParser = require('body-parser');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const path = require('path');

const app = express();
app.use(bodyParser.json());

/* ======================================================
   LOAD PROTO FILES
====================================================== */

const interactionProtoPath = path.resolve(__dirname, '../proto/interaction.proto');
const userProtoPath = path.resolve(__dirname, '../proto/user.proto');
const videoProtoPath = path.resolve(__dirname, '../proto/video.proto');

const interactionPackage = protoLoader.loadSync(interactionProtoPath);
const userPackage = protoLoader.loadSync(userProtoPath);
const videoPackage = protoLoader.loadSync(videoProtoPath);

const interactionProto = grpc.loadPackageDefinition(interactionPackage).interaction;
const userProto = grpc.loadPackageDefinition(userPackage).user;
const videoProto = grpc.loadPackageDefinition(videoPackage).video;

/* ======================================================
   CREATE gRPC CLIENTS
====================================================== */

const interactionClient =
    new interactionProto.InteractionService(
        'localhost:50053',
        grpc.credentials.createInsecure()
    );

const userClient =
    new userProto.UserService(
        'localhost:50051',
        grpc.credentials.createInsecure()
    );

const videoClient =
    new videoProto.VideoService(
        'localhost:50052',
        grpc.credentials.createInsecure()
    );

/* ======================================================
   REST ROUTES
====================================================== */

/* ---------- USER ROUTES ---------- */

// REGISTER
app.post('/api/register', (req, res) => {

    userClient.Register(req.body, (err, response) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(response);
    });
});

// LOGIN
app.post('/api/login', (req, res) => {

    userClient.Login(req.body, (err, response) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(response);
    });
});

// GET USER
app.get('/api/users/:id', (req, res) => {

    userClient.GetUser(
        { user_id: req.params.id },
        (err, response) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(response);
        }
    );
});

/* ---------- VIDEO ROUTES ---------- */

// LIST VIDEOS
app.get('/api/videos', (req, res) => {

    videoClient.ListVideos({}, (err, response) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(response);
    });
});

// GET VIDEO
app.get('/api/videos/:id', (req, res) => {

    videoClient.GetVideo(
        { id: parseInt(req.params.id) },
        (err, response) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(response);
        }
    );
});

// SEARCH VIDEOS
app.get('/api/search/:query', (req, res) => {

    videoClient.SearchVideos(
        { query: req.params.query },
        (err, response) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(response);
        }
    );
});

/* ---------- INTERACTION ROUTES ---------- */

// ADD COMMENT
app.post('/api/comments', (req, res) => {

    interactionClient.AddComment(req.body, (err, response) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.status(201).json(response);
    });
});

// LIKE VIDEO
app.post('/api/like', (req, res) => {

    interactionClient.LikeVideo(req.body, (err, response) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(response);
    });
});

/* ======================================================
   START EXPRESS SERVER
====================================================== */

app.listen(3001, () => {

    console.log('✅ API Gateway running on port 3001');
});

/* ======================================================
   GRAPHQL
====================================================== */

const typeDefs = `#graphql

type Comment {
    id: String
    userId: String
    content: String
}

type Video {
    id: Int
    title: String
    description: String
    category: String
    filename: String
    filepath: String
    creatorId: Int
    views: Int
    likes: Int
    comments: [Comment]
}

type Query {

    getVideoComments(videoId: String!): [Comment]

    getVideos: [Video]
}
`;

const resolvers = {

    Query: {

        getVideoComments: async (_, { videoId }) => {

            return new Promise((resolve, reject) => {

                interactionClient.GetComments(
                    { videoId },
                    (err, response) => {

                        if (err) reject(err);

                        else resolve(response.comments || []);
                    }
                );
            });
        },

        getVideos: async () => {

            return new Promise((resolve, reject) => {

                videoClient.ListVideos(
                    {},
                    (err, response) => {

                        if (err) reject(err);

                        else resolve(response.videos || []);
                    }
                );
            });
        }
    },

    Video: {

        comments: async (parent) => {

            return new Promise((resolve, reject) => {

                interactionClient.GetComments(
                    { videoId: String(parent.id) },
                    (err, response) => {

                        if (err) reject(err);

                        else resolve(response.comments || []);
                    }
                );
            });
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers
});

async function startGraphQL() {

    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 }
    });

    console.log(`🚀 GraphQL Gateway running at ${url}`);
}

startGraphQL();