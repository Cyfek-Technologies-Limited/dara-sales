import { Pool } from 'pg'

const globalForPool = globalThis as unknown as { pool?: Pool }

function explicitSslMode(connectionString: string | undefined) {
  if (!connectionString) return connectionString
  try {
    const url = new URL(connectionString)
    const sslMode = url.searchParams.get('sslmode')?.toLowerCase()
    if (sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca') {
      // pg currently treats these as verify-full; spell that out before its defaults change.
      url.searchParams.set('sslmode', 'verify-full')
    }
    return url.toString()
  } catch {
    return connectionString
  }
}

export const pool = globalForPool.pool ?? new Pool({ connectionString: explicitSslMode(process.env.DATABASE_URL) })

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool
