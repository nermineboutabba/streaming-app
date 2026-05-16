import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from './db.js'
import { hashPassword, comparePassword, generateToken } from './auth.js'
import { publishUserCreated } from './kafka.js'

const app = express()
app.use(express.json())

let db
getDB().then(d => {
  db = d
})

// ── POST /register ──
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    const userId = uuidv4()
    const hashedPassword = await hashPassword(password)

    await db.users.insert({
      user_id: userId,
      username,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    })

    try {
      await publishUserCreated({ id: userId, username, email })
    } catch (kErr) {
      console.log('⚠️ Kafka skipped')
    }

    res.json({
      success: true,
      message: 'User registered successfully',
      user_id: userId
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /login ──
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await db.users.findOne({ selector: { email } }).exec()

    if (!user) {
      return res.json({ success: false, message: 'User not found' })
    }

    const match = await comparePassword(password, user.password)
    if (!match) {
      return res.json({ success: false, message: 'Invalid credentials' })
    }

    const token = generateToken(user.user_id)
    res.json({
      success: true,
      user_id: user.user_id,
      token,
      message: 'Login successful'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /user/:id ──
app.get('/user/:id', async (req, res) => {
  try {
    const user = await db.users
      .findOne({ selector: { user_id: req.params.id } })
      .exec()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PUT /user/:id ──
app.put('/user/:id', async (req, res) => {
  try {
    const { username, email } = req.body
    const user = await db.users
      .findOne({ selector: { user_id: req.params.id } })
      .exec()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    await user.patch({ username, email })
    res.json({ user_id: req.params.id, username, email })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /follow ──
app.post('/follow', async (req, res) => {
  try {
    const { follower_id, following_id } = req.body

    const existing = await db.subscriptions
      .findOne({
        selector: { follower_id, following_id }
      })
      .exec()

    if (existing) {
      return res.json({ success: false, message: 'Already following' })
    }

    await db.subscriptions.insert({
      sub_id: uuidv4(),
      follower_id,
      following_id,
      created_at: new Date().toISOString()
    })

    res.json({ success: true, message: 'Followed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /users ──
app.get('/users', async (req, res) => {
  try {
    const users = await db.users.find().exec()
    res.json({
      users: users.map(user => ({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /followers/:id ──
app.get('/followers/:id', async (req, res) => {
  try {
    const subs = await db.subscriptions
      .find({
        selector: { following_id: req.params.id }
      })
      .exec()

    const users = await Promise.all(
      subs.map(async (sub) => {
        const user = await db.users
          .findOne({
            selector: { user_id: sub.follower_id }
          })
          .exec()
        return user
          ? {
              user_id: user.user_id,
              username: user.username,
              email: user.email
            }
          : null
      })
    )

    res.json({ users: users.filter(Boolean) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => {
  console.log('✅ REST server running on port 3000')
})