import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, ChevronRight, Trash2, BookmarkPlus } from 'lucide-react'
import CreateListModal from '../components/CreateListModal'
import BookmarkletModal from '../components/BookmarkletModal'
import './Dashboard.css'

const API_URL = 'https://monalista.io'

// Placeholder icons for lists without images
const placeholderIcons = [
  'https://github.com/johnjannuzzi/imgs/blob/main/heart.png?raw=true',
  'https://github.com/johnjannuzzi/imgs/blob/main/share.png?raw=true',
  'https://github.com/johnjannuzzi/imgs/blob/main/gift.png?raw=true'
]

export default function Dashboard() {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBookmarklet, setShowBookmarklet] = useState(false)

  const fetchLists = async () => {
    try {
      const res = await fetch(`${API_URL}/api/lists`, { credentials: 'include' })
      const data = await res.json()
      setLists(data)
    } catch (err) {
      console.error('Error fetching lists:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLists()
  }, [])

  const handleCreateList = async (listData) => {
    try {
      const res = await fetch(`${API_URL}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(listData)
      })
      const newList = await res.json()
      setLists([{ ...newList, preview_images: [] }, ...lists])
      setShowCreateModal(false)
    } catch (err) {
      console.error('Error creating list:', err)
    }
  }

  const handleDeleteList = async (e, listId) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this list?')) return

    try {
      await fetch(`${API_URL}/api/lists/${listId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      setLists(lists.filter(l => l.id !== listId))
    } catch (err) {
      console.error('Error deleting list:', err)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Your Lists</h1>
          <p className="dashboard-subtitle">Curate your wishes</p>
        </div>
        <div className="dashboard-actions">
          <button 
            onClick={() => setShowBookmarklet(true)} 
            className="btn btn-secondary"
          >
            <BookmarkPlus size={18} />
            Bookmarklet
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn btn-primary"
          >
            <Plus size={18} />
            New List
          </button>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <img src={placeholderIcons[0]} alt="" />
          </div>
          <h2>No lists yet</h2>
          <p>Create your first wishlist to get started</p>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn btn-primary"
          >
            <Plus size={18} />
            Create a List
          </button>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map((list, index) => (
            <Link 
              to={`/list/${list.id}`} 
              key={list.id} 
              className={`list-card animate-slide-up stagger-${index % 5 + 1}`}
            >
              {/* Preview Images or Placeholder */}
              {list.preview_images && list.preview_images.length > 0 ? (
                <div className="list-preview-images">
                  {list.preview_images.slice(0, 3).map((img, i) => (
                    <div key={i} className="preview-thumb">
                      <img src={img} alt="" />
                    </div>
                  ))}
                  {/* Fill empty slots */}
                  {list.preview_images.length < 3 && 
                    Array(3 - list.preview_images.length).fill(0).map((_, i) => (
                      <div key={`empty-${i}`} className="preview-thumb preview-thumb-empty" />
                    ))
                  }
                </div>
              ) : (
                <div className="list-placeholder-icon">
                  <img 
                    src={placeholderIcons[index % placeholderIcons.length]} 
                    alt="" 
                    className="placeholder-img"
                  />
                </div>
              )}
              
              <div className="list-card-content">
                <div className="list-card-header">
                  <h3>{list.name}</h3>
                  <button 
                    onClick={(e) => handleDeleteList(e, list.id)}
                    className="btn-ghost btn-icon list-delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {list.description && (
                  <p className="list-description">{list.description}</p>
                )}
                
                <div className="list-meta">
                  {list.occasion_date && (
                    <span className="list-date">
                      <Calendar size={14} />
                      {formatDate(list.occasion_date)}
                    </span>
                  )}
                  <span className="list-count">
                    {list.item_count || 0} item{list.item_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="list-card-arrow">
                <ChevronRight size={20} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateList}
        />
      )}

      {showBookmarklet && (
        <BookmarkletModal onClose={() => setShowBookmarklet(false)} />
      )}
    </div>
  )
}
