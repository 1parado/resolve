import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || './data/resolve.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}