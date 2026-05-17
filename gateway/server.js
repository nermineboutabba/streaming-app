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
            return res.status(500).json({ error: err.message, details: err.details });
        }
        res.json(response);
    });
});

// LOGIN
app.post('/api/login', (req, res) => {
    userClient.Login(req.body, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message, details: err.details });
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
                return res.status(500).json({ error: err.message, details: err.details });
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
            return res.status(500).json({ error: err.message, details: err.details });
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
                return res.status(500).json({ error: err.message, details: err.details });
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
                return res.status(500).json({ error: err.message, details: err.details });
            }
            res.json(response);
        }
    );
});

/* ---------- INTERACTION ROUTES ---------- */

// Fonction helper pour gérer les erreurs gRPC
function handleGrpcError(err, res) {
    console.error('gRPC Error:', err);
    
    let statusCode = 400;
    let errorMessage = err.message || 'Une erreur est survenue';
    
    // Gérer les différents codes d'erreur gRPC
    if (err.code === 3) { // INVALID_ARGUMENT
        statusCode = 400;
        errorMessage = err.message || 'Paramètres invalides';
    } else if (err.code === 6) { // ALREADY_EXISTS
        statusCode = 409;
        errorMessage = err.message || 'Ressource déjà existante';
    } else if (err.code === 5) { // NOT_FOUND
        statusCode = 404;
        errorMessage = err.message || 'Ressource non trouvée';
    } else if (err.code === 13) { // INTERNAL
        statusCode = 500;
        errorMessage = 'Erreur interne du serveur';
    }
    
    return res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        code: err.code
    });
}

// ADD COMMENT
app.post('/api/comments', (req, res) => {
    const { videoId, userId, content } = req.body;
    
    // Validation côté gateway avant d'appeler gRPC
    if (!videoId || videoId.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: "videoId est requis et ne peut pas être vide" 
        });
    }
    
    if (!userId || userId.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: "userId est requis et ne peut pas être vide" 
        });
    }
    
    if (!content || content.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: "Le contenu du commentaire ne peut pas être vide" 
        });
    }
    
    interactionClient.AddComment(req.body, (err, response) => {
        if (err) {
            return handleGrpcError(err, res);
        }
        res.status(201).json({ 
            success: true,
            ...response 
        });
    });
});

// LIKE VIDEO
app.post('/api/like', (req, res) => {
    const { videoId, userId } = req.body;
    
    // Validation côté gateway avant d'appeler gRPC
    if (!videoId || videoId.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: "videoId est requis et ne peut pas être vide" 
        });
    }
    
    if (!userId || userId.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: "userId est requis et ne peut pas être vide" 
        });
    }
    
    interactionClient.LikeVideo(req.body, (err, response) => {
        if (err) {
            return handleGrpcError(err, res);
        }
        res.json({ 
            success: true,
            ...response 
        });
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

type Mutation {
    addComment(videoId: String!, userId: String!, content: String!): CommentResponse
    likeVideo(videoId: String!, userId: String!): LikeResponse
}

type CommentResponse {
    success: Boolean!
    message: String!
    id: String
    error: String
}

type LikeResponse {
    success: Boolean!
    message: String!
    totalLikes: Int
    error: String
}
`;

const resolvers = {
    Query: {
        getVideoComments: async (_, { videoId }) => {
            // Validation
            if (!videoId || videoId.trim() === '') {
                throw new Error("videoId est requis");
            }
            
            return new Promise((resolve, reject) => {
                interactionClient.GetComments(
                    { videoId },
                    (err, response) => {
                        if (err) {
                            reject(new Error(err.message));
                        } else {
                            resolve(response.comments || []);
                        }
                    }
                );
            });
        },
        
        getVideos: async () => {
            return new Promise((resolve, reject) => {
                videoClient.ListVideos(
                    {},
                    (err, response) => {
                        if (err) reject(new Error(err.message));
                        else resolve(response.videos || []);
                    }
                );
            });
        }
    },
    
    Mutation: {
        addComment: async (_, { videoId, userId, content }) => {
            // Validation
            if (!videoId || videoId.trim() === '') {
                return {
                    success: false,
                    message: "videoId est requis",
                    error: "Paramètre invalide"
                };
            }
            
            if (!userId || userId.trim() === '') {
                return {
                    success: false,
                    message: "userId est requis",
                    error: "Paramètre invalide"
                };
            }
            
            if (!content || content.trim() === '') {
                return {
                    success: false,
                    message: "Le contenu du commentaire ne peut pas être vide",
                    error: "Paramètre invalide"
                };
            }
            
            return new Promise((resolve) => {
                interactionClient.AddComment(
                    { videoId, userId, content },
                    (err, response) => {
                        if (err) {
                            resolve({
                                success: false,
                                message: err.message,
                                error: err.details || "Erreur lors de l'ajout du commentaire"
                            });
                        } else {
                            resolve({
                                success: true,
                                message: response.message,
                                id: response.id
                            });
                        }
                    }
                );
            });
        },
        
        likeVideo: async (_, { videoId, userId }) => {
            // Validation
            if (!videoId || videoId.trim() === '') {
                return {
                    success: false,
                    message: "videoId est requis",
                    error: "Paramètre invalide"
                };
            }
            
            if (!userId || userId.trim() === '') {
                return {
                    success: false,
                    message: "userId est requis",
                    error: "Paramètre invalide"
                };
            }
            
            return new Promise((resolve) => {
                interactionClient.LikeVideo(
                    { videoId, userId },
                    (err, response) => {
                        if (err) {
                            resolve({
                                success: false,
                                message: err.message,
                                error: err.details || "Erreur lors de l'ajout du like",
                                totalLikes: 0
                            });
                        } else {
                            resolve({
                                success: true,
                                message: response.message,
                                totalLikes: response.totalLikes
                            });
                        }
                    }
                );
            });
        }
    },
    
    Video: {
        comments: async (parent) => {
            // Validation
            if (!parent.id) {
                return [];
            }
            
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
