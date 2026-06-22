/**
 * AES-GCM credential vault.
 *
 * A random 256-bit key is generated once per session and marked non-extractable,
 * so it can never be read back from the CryptoKey object. Every field is encrypted
 * with its own random IV. State and DevTools only ever see opaque byte arrays.
 *
 * The key is discarded (set to null) on page hide / beforeunload, making the
 * ciphertext in React state permanently unreadable for that session.
 */

let _sessionKey = null

async function getSessionKey() {
  if (!_sessionKey) {
    _sessionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,            // non-extractable — the raw key bytes can never be read
      ['encrypt', 'decrypt'],
    )
  }
  return _sessionKey
}

export function destroySessionKey() {
  _sessionKey = null
}

/**
 * Encrypts a plain-object of string credentials.
 * Returns an opaque object of { iv: Uint8Array, cipher: Uint8Array } per field.
 */
export async function encryptCredentials(plain) {
  const key = await getSessionKey()
  const enc = new TextEncoder()
  const result = {}

  for (const [field, value] of Object.entries(plain)) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(value),
    )
    result[field] = { iv, cipher: new Uint8Array(cipher) }
  }

  return result
}

/**
 * Decrypts an encrypted credential object back into plain strings.
 * Throws if the session key has been destroyed.
 */
export async function decryptCredentials(encrypted) {
  if (!_sessionKey) throw new Error('Session expired — please re-enter your credentials.')

  const key = _sessionKey
  const dec = new TextDecoder()
  const result = {}

  for (const [field, { iv, cipher }] of Object.entries(encrypted)) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    result[field] = dec.decode(plain)
  }

  return result
}
