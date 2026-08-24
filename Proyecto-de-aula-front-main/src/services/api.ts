import axios from 'axios'

// Cliente HTTP centralizado — el token se inyecta automáticamente en cada request
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el servidor responde 401, la sesión expiró → limpiar y redirigir
    if (error.response?.status === 401) {
      localStorage.removeItem('cp_token')
      localStorage.removeItem('cp_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
