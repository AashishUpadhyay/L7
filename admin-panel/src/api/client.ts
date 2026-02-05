const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options
  let url = `${API_BASE}${path}`
  if (params) {
    const search = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') search.set(k, String(v))
    }
    const q = search.toString()
    if (q) url += `?${q}`
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(data.detail)
      ? data.detail.map((e: { msg?: string }) => e?.msg).filter(Boolean).join('; ') || res.statusText
      : typeof data.detail === 'string'
        ? data.detail
        : res.statusText ?? 'Request failed'
    throw new Error(msg)
  }
  return data as T
}

export { request, API_BASE }
