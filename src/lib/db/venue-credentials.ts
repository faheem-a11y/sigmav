import { getDb } from './index'
import { encrypt, decrypt } from '../crypto/encrypt'

export interface VenueCredential {
  venue: string
  isActive: boolean
  createdAt: number
}

export async function saveCredential(
  userAddress: string,
  venue: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  const db = await getDb()
  const { encrypted: encKey, iv, authTag } = encrypt(`${apiKey}|||${apiSecret}`)
  await db.execute({
    sql: `INSERT OR REPLACE INTO venue_credentials (user_address, venue, encrypted_api_key, iv, auth_tag, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    args: [userAddress, venue, encKey, iv, authTag],
  })
}

export async function getCredential(
  userAddress: string,
  venue: string,
): Promise<{ apiKey: string; apiSecret: string } | null> {
  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT encrypted_api_key, iv, auth_tag FROM venue_credentials WHERE user_address = ? AND venue = ? AND is_active = 1`,
    args: [userAddress, venue],
  })
  const row = result.rows[0]
  if (!row) return null
  const decrypted = decrypt(
    row.encrypted_api_key as string,
    row.iv as string,
    row.auth_tag as string,
  )
  const [apiKey, apiSecret] = decrypted.split('|||')
  return { apiKey, apiSecret }
}

export async function deleteCredential(
  userAddress: string,
  venue: string,
): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `DELETE FROM venue_credentials WHERE user_address = ? AND venue = ?`,
    args: [userAddress, venue],
  })
}

export async function getActiveVenues(userAddress: string): Promise<VenueCredential[]> {
  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT venue, is_active, created_at FROM venue_credentials WHERE user_address = ? AND is_active = 1`,
    args: [userAddress],
  })
  return result.rows.map((row) => ({
    venue: row.venue as string,
    isActive: (row.is_active as number) === 1,
    createdAt: row.created_at as number,
  }))
}
