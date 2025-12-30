import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ListView from './pages/ListView'
import SharedList from './pages/SharedList'
import AddItemPage from './pages/AddItemPage'
import Layout from './components/Layout'

// Backend API URL
const API_URL = 'https://monalista.io'

// Auth Context
const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const login = () => {
    window.location.href = `${API_URL}/auth/google`
  }

  const logout = () => {
    window.location.href = `${API_URL}/auth/logout`
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/share/:shareCode" element={<SharedList />} />
          <Route path="/add" element={<AddItemPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/list/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ListView />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
