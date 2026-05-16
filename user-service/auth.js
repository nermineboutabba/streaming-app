import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'your_jwt_secret_key_change_this'
const JWT_EXPIRES = '24h'

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

export async function comparePassword(password, hashed) {
  return await bcrypt.compare(password, hashed)
}

export function generateToken(userId) {
  return jwt.sign(
    { user_id: userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}