/**
 * Format an ISO date string to a readable local datetime string.
 */
export function formatDate(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('zh-CN', { hour12: false })
}

/**
 * Format latency in ms, showing decimals only when < 1000ms.
 */
export function formatLatency(ms: number): string {
    if (ms == null) return '—'
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
    return `${ms} ms`
}

/**
 * Truncate a string to n characters, appending '…' if longer.
 */
export function truncate(str: string, n = 40): string {
    if (!str) return ''
    return str.length > n ? str.slice(0, n) + '…' : str
}

/**
 * Decode a JWT payload without verifying signature.
 * Returns the exp timestamp (seconds) or null if not present / invalid.
 * For display/debugging only — never use for security decisions.
 */
export function decodeJwtExp(token: string): number | null {
    try {
        const payload = token.split('.')[1]
        if (!payload) return null
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        return typeof decoded.exp === 'number' ? decoded.exp : null
    } catch {
        return null
    }
}
