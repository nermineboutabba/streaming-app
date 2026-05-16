import { createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import fs from 'fs'

const DATA_FILE = './data.json'

const userSchema = {
  version: 0,
  primaryKey: 'user_id',
  type: 'object',
  properties: {
    user_id:    { type: 'string', maxLength: 100 },
    username:   { type: 'string' },
    email:      { type: 'string' },
    password:   { type: 'string' },
    created_at: { type: 'string' }
  },
  required: ['user_id', 'username', 'email', 'password']
}

const subscriptionSchema = {
  version: 0,
  primaryKey: 'sub_id',
  type: 'object',
  properties: {
    sub_id:       { type: 'string', maxLength: 100 },
    follower_id:  { type: 'string' },
    following_id: { type: 'string' },
    created_at:   { type: 'string' }
  },
  required: ['sub_id', 'follower_id', 'following_id']
}

let db

export async function getDB() {
  if (db) return db

  db = await createRxDatabase({
    name: 'usersdb',
    storage: getRxStorageMemory()
  })

  await db.addCollections({
    users:         { schema: userSchema },
    subscriptions: { schema: subscriptionSchema }
  })

  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    if (data.users?.length)         await db.users.bulkInsert(data.users)
    if (data.subscriptions?.length) await db.subscriptions.bulkInsert(data.subscriptions)
    console.log('✅ Data loaded from file')
  }

  console.log('✅ RxDB connected')
  return db
}

export async function saveDB() {
  if (!db) return
  const users         = await db.users.find().exec()
  const subscriptions = await db.subscriptions.find().exec()
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    users:         users.map(u => u.toJSON()),
    subscriptions: subscriptions.map(s => s.toJSON())
  }, null, 2))
  console.log('✅ Data saved to file')
}