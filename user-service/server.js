import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDB, saveDB } from './db.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from './auth.js';
import { publishUserCreated } from './kafka.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load proto file
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'user.proto');

console.log('Chemin du fichier proto :', PROTO_PATH); // Pour vérifier dans les logs Docker

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
  
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

let db;

// Initialize database
async function initDB() {
  db = await getDB();
  console.log('✅ Database initialized for gRPC server');
}

// gRPC Service Implementation
const userService = {
  // Register a new user
  Register: async (call, callback) => {
    try {
      const { username, email, password } = call.request;
      const userId = uuidv4();
      const hashedPassword = await hashPassword(password);

      // Check if user already exists
      const existingUser = await db.users.findOne({ selector: { email } }).exec();
      if (existingUser) {
        return callback(null, {
          success: false,
          message: 'User with this email already exists',
          user_id: ''
        });
      }

      await db.users.insert({
        user_id: userId,
        username,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString()
      });

      await saveDB();

      // Publish Kafka event
      try {
        await publishUserCreated({ id: userId, username, email });
      } catch (kErr) {
        console.log('⚠️ Kafka skipped:', kErr.message);
      }

      callback(null, {
        success: true,
        message: 'User registered successfully',
        user_id: userId
      });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  },

  // Login user
  Login: async (call, callback) => {
    try {
      const { email, password } = call.request;

      const user = await db.users.findOne({ selector: { email } }).exec();

      if (!user) {
        return callback(null, {
          success: false,
          token: '',
          user_id: '',
          message: 'User not found'
        });
      }

      const match = await comparePassword(password, user.password);
      if (!match) {
        return callback(null, {
          success: false,
          token: '',
          user_id: '',
          message: 'Invalid credentials'
        });
      }

      const token = generateToken(user.user_id);

      callback(null, {
        success: true,
        token,
        user_id: user.user_id,
        message: 'Login successful'
      });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  },

  // Get user by ID
  GetUser: async (call, callback) => {
    try {
      const { user_id } = call.request;

      const user = await db.users.findOne({ selector: { user_id } }).exec();

      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }

      callback(null, {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  },

  // Update user
  UpdateUser: async (call, callback) => {
    try {
      const { user_id, username, email } = call.request;

      const user = await db.users.findOne({ selector: { user_id } }).exec();

      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found'
        });
      }

      await user.incrementalPatch({ 
        username: username || user.username,
        email: email || user.email
      });

      await saveDB();

      callback(null, {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  },

  // Follow a user
  FollowUser: async (call, callback) => {
    try {
      const { follower_id, following_id } = call.request;

      // Check if already following
      const existing = await db.subscriptions.findOne({
        selector: { follower_id, following_id }
      }).exec();

      if (existing) {
        return callback(null, {
          success: false,
          message: 'Already following this user'
        });
      }

      await db.subscriptions.insert({
        sub_id: uuidv4(),
        follower_id,
        following_id,
        created_at: new Date().toISOString()
      });

      await saveDB();

      callback(null, {
        success: true,
        message: 'Followed successfully'
      });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  },

  // Get followers
  GetFollowers: async (call, callback) => {
    try {
      const { user_id } = call.request;

      const subs = await db.subscriptions.find({
        selector: { following_id: user_id }
      }).exec();

      const users = await Promise.all(
        subs.map(async (sub) => {
          const user = await db.users.findOne({
            selector: { user_id: sub.follower_id }
          }).exec();
          return user ? {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            created_at: user.created_at
          } : null;
        })
      );

      callback(null, {
        users: users.filter(Boolean)
      });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  }
};

// Start gRPC server
async function startServer() {
  await initDB();

  const server = new grpc.Server();
  server.addService(userProto.UserService.service, userService);

  const bindAddress = '0.0.0.0:50051';
  server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error('❌ Failed to start gRPC server:', error);
        return;
      }
      console.log(`✅ gRPC User Service running on ${bindAddress}`);
    }
  );
}

startServer().catch(console.error);
