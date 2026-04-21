export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function removeToken(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getUser(): any | null {
  try {
    const token = getToken()
    if (!token) return null
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload))
    return decoded
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const user = getUser()
    if (!user) return false
    // Check expiration
    if (user.exp && user.exp * 1000 < Date.now()) {
      removeToken()
      return false
    }
    return true
  } catch {
    return false
  }
}
