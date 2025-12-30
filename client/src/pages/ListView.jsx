import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Plus, Share2, ExternalLink, Star, 
  Trash2, Edit3, Check, Copy, Link as LinkIcon, BookmarkPlus
} from 'lucide-react'
import AddItemModal from '../components/AddItemModal'
import BookmarkletModal from '../components/BookmarkletModal'
import './ListView.css'

const API_URL = 'https://monalista.io'

// Placeholder icons for items without images
const placeholderIcons = [
  'https://github.com/johnjannuzzi/imgs/blob/main/heart.png?raw=true',
  'https://github.com/johnjannuzzi/imgs/blob/main/share.png?raw=true',
  'https://github.com/johnjannuzzi/imgs/blob/main/gift.png?raw=true'
]

export default function ListView() {
  const { id } = useParams()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [showBookmarklet, setShowBookmarklet] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchList()
    fetchItems()
  }, [id])

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/lists/${id}`, { credentials: 'include' })
      const data = await res.json()
      setList(data)
    } catch (err) {
      console.error('Error fetching list:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/api/items/list/${id}`, { credentials: 'include' })
      const data = await res.json()
      setItems(data)
    } catch (err) {
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (itemData) => {
    try {
      const res = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...itemData, list_id: parseInt(id) })
      })
      const newItem = await res.json()
      setItems([newItem, ...items])
      setShowAddModal(false)
    } catch (err) {
      console.error('Error adding item:', err)
    }
  }

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const res = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })
      const updated = await res.json()
      setItems(items.map(i => i.id === itemId ? updated : i))
      setEditingItem(null)
    } catch (err) {
      console.error('Error updating item:', err)
    }
  }

  const handleToggleTopChoice = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/api/items/${itemId}/toggle-top-choice`, {
        method: 'POST',
        credentials: 'include'
      })
      const updated = await res.json()
      setItems(items.map(i => i.id === itemId ? updated : i))
    } catch (err) {
      console.error('Error toggling top choice:', err)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this item?')) return

    try {
      await fetch(`${API_URL}/api/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      setItems(items.filter(i => i.id !== itemId))
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${list.share_code}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatPrice = (price) => {
    if (!price) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="list-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!list) {
    return (
      <div className="list-not-found">
        <h2>List not found</h2>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="list-view">
      {/* Header */}
      <div className="list-header">
        <div className="list-title-section">
          <h1>{list.name}</h1>
          {list.description && <p className="list-desc">{list.description}</p>}
        </div>

        <div className="list-actions">
          <button 
            onClick={() => setShowBookmarklet(true)} 
            className="btn btn-secondary"
          >
            <BookmarkPlus size={18} />
            Bookmarklet
          </button>
          <button 
            onClick={() => setShowSharePanel(!showSharePanel)} 
            className="btn btn-secondary"
          >
            <Share2 size={18} />
            Share
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn btn-primary"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      {/* Share Panel */}
      {showSharePanel && (
        <div className="share-panel animate-slide-up">
          <div className="share-panel-inner">
            <p>Share this link with friends and family. They can view and claim items privately — you won't see what's been claimed to keep the surprise!</p>
            <div className="share-link-row">
              <div className="share-link">
                <LinkIcon size={16} />
                <span>{window.location.origin}/share/{list.share_code}</span>
              </div>
              <button onClick={copyShareLink} className="btn btn-primary btn-small">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items - Owner view: NO claim status shown */}
      {items.length === 0 ? (
        <div className="empty-items">
          <p>No items yet. Add your first wish!</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={18} />
            Add Item
          </button>
        </div>
      ) : (
        <div className="items-list">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`item-card animate-slide-up stagger-${index % 5 + 1} ${item.is_top_choice ? 'top-choice' : ''}`}
            >
              <div className="item-image">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} />
                ) : (
                  <div className="item-placeholder">
                    <img 
                      src={placeholderIcons[index % placeholderIcons.length]} 
                      alt="" 
                      className="placeholder-img"
                    />
                  </div>
                )}
              </div>
              
              <div className="item-content">
                <div className="item-header">
                  <h3>{item.title}</h3>
                  {item.is_top_choice && (
                    <span className="top-choice-badge">
                      <Star size={14} fill="currentColor" />
                      Top Choice
                    </span>
                  )}
                </div>
                
                <div className="item-meta">
                  {item.price && <span className="item-price">{formatPrice(item.price)}</span>}
                  {item.domain && <span className="item-domain">{item.domain}</span>}
                </div>
                
                {item.notes && <p className="item-notes">{item.notes}</p>}
              </div>

              <div className="item-actions">
                <a 
                  href={item.original_url || item.affiliate_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-small"
                >
                  <ExternalLink size={14} />
                  View
                </a>
                
                <button 
                  onClick={() => handleToggleTopChoice(item.id)}
                  className={`btn btn-ghost btn-icon ${item.is_top_choice ? 'active' : ''}`}
                  title="Toggle top choice"
                >
                  <Star size={18} fill={item.is_top_choice ? 'currentColor' : 'none'} />
                </button>
                
                <button 
                  onClick={() => setEditingItem(item)}
                  className="btn btn-ghost btn-icon"
                  title="Edit"
                >
                  <Edit3 size={18} />
                </button>
                
                <button 
                  onClick={() => handleDeleteItem(item.id)}
                  className="btn btn-ghost btn-icon delete"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />
      )}

      {editingItem && (
        <AddItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onAdd={(data) => handleUpdateItem(editingItem.id, data)}
        />
      )}

      {showBookmarklet && (
        <BookmarkletModal onClose={() => setShowBookmarklet(false)} />
      )}
    </div>
  )
}
