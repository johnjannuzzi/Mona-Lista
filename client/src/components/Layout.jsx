import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { LogOut, User } from 'lucide-react'
import './Layout.css'

export default function Layout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/dashboard" className="header-logo">
            Mona Lista
          </Link>
          
          <div className="header-user">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder">
                <User size={18} />
              </div>
            )}
            <span className="user-name">{user?.name}</span>
            <button onClick={logout} className="btn-ghost btn-icon" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
