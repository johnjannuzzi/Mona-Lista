import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink, Star, Gift, Check, Heart, X } from 'lucide-react'
import './SharedList.css'

const API_URL = 'https://monalista.io'

export default function SharedList() {
  const { shareCode } = useParams()
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [unclaimingId, setUnclaimingId] = useState(null)
  const [claimerName, setClaimerName] = useState('')
  const [showClaimModal, setShowClaimModal] = useState(null)
  const [showUnclaimModal, setShowUnclaimModal] = useState(null)

  useEffect(() => {
    fetchList()
  }, [shareCode])

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/share/${shareCode}`)
      if (!res.ok) throw new Error('List not found')
      const data = await res.json()
      setList(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (itemId) => {
    setClaimingId(itemId)
    try {
      await fetch(`${API_URL}/api/share/${shareCode}/claim/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimer_name: claimerName || 'Someone special' })
      })
      
      // Update local state
      setList({
        ...list,
        items: list.items.map(item => 
          item.id === itemId ? { ...item, is_claimed: true, claimer_name: claimerName || 'Someone special' } : item
        )
      })
      setShowClaimModal(null)
      setClaimerName('')
    } catch (err) {
      console.error('Error claiming item:', err)
    } finally {
      setClaimingId(null)
    }
  }

  const handleUnclaim = async (itemId) => {
    setUnclaimingId(itemId)
    try {
      await fetch(`${API_URL}/api/share/${shareCode}/unclaim/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      // Update local state
      setList({
        ...list,
        items: list.items.map(item => 
          item.id === itemId ? { ...item, is_claimed: false, claimer_name: null } : item
        )
      })
      setShowUnclaimModal(null)
    } catch (err) {
      console.error('Error unclaiming item:', err)
    } finally {
      setUnclaimingId(null)
    }
  }

  const formatPrice = (price) => {
    if (!price) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="shared-loading">
        <div className="loading-frame">
          <span className="loading-text">Mona Lista</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="shared-error">
        <div className="error-content">
          <Gift size={48} />
          <h1>List Not Found</h1>
          <p>This wishlist may have been removed or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="shared-list">
      {/* Decorative corners */}
      <div className="frame-corner frame-corner-tl" />
      <div className="frame-corner frame-corner-tr" />
      <div className="frame-corner frame-corner-bl" />
      <div className="frame-corner frame-corner-br" />

      {/* Header */}
      <header className="shared-header">
        <span className="shared-brand">Mona Lista</span>
      </header>

      {/* List Info */}
      <div className="shared-intro animate-slide-up">
        <h1>{list.name}</h1>
        <p className="shared-owner">A wishlist by {list.owner_name}</p>
        {list.description && <p className="shared-desc">{list.description}</p>}
        {list.occasion_date && (
          <p className="shared-date">For {formatDate(list.occasion_date)}</p>
        )}
      </div>

      {/* Items */}
      <div className="shared-items">
        {list.items.map((item, index) => (
          <div 
            key={item.id}
            className={`shared-item animate-slide-up stagger-${index % 5 + 1} ${item.is_top_choice ? 'top-choice' : ''} ${item.is_claimed ? 'claimed' : ''}`}
          >
            {item.image_url && (
              <div className="shared-item-image">
                <img src={item.image_url} alt={item.title} />
              </div>
            )}

            <div className="shared-item-content">
              <div className="shared-item-header">
                <h3>{item.title}</h3>
                {item.is_top_choice && (
                  <span className="top-choice-badge">
                    <Star size={12} fill="currentColor" />
                    Top Choice
                  </span>
                )}
              </div>

              <div className="shared-item-meta">
                {item.price && <span className="item-price">{formatPrice(item.price)}</span>}
                {item.domain && <span className="item-domain">{item.domain}</span>}
              </div>

              {item.notes && <p className="shared-item-notes">{item.notes}</p>}
            </div>

            <div className="shared-item-actions">
              {item.is_claimed ? (
                <>
                  <div className="claimed-status">
                    <Check size={18} />
                    <span>Claimed</span>
                  </div>
                  <button
                    onClick={() => setShowUnclaimModal(item.id)}
                    className="btn btn-ghost btn-small unclaim-btn"
                    title="Changed your mind?"
                  >
                    <X size={14} />
                    Unclaim
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={item.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <ExternalLink size={16} />
                    Shop Now
                  </a>
                  <button
                    onClick={() => setShowClaimModal(item.id)}
                    className="btn btn-secondary"
                    disabled={claimingId === item.id}
                  >
                    <Heart size={16} />
                    I'll Get This
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="shared-footer">
        <p>Powered by <a href="/">Mona Lista</a></p>
      </footer>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(null)}>
          <div className="modal claim-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Claim This Gift</h2>
            </div>
            <div className="modal-body">
              <p>Let others know you're getting this gift. Your name stays private from the list owner — only other shoppers will see it to avoid duplicate gifts.</p>
              <div className="form-group">
                <label className="form-label">Your Name (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Anonymous"
                  value={claimerName}
                  onChange={e => setClaimerName(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowClaimModal(null)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleClaim(showClaimModal)}
                className="btn btn-primary"
                disabled={claimingId}
              >
                {claimingId ? 'Claiming...' : 'Claim Gift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unclaim Modal */}
      {showUnclaimModal && (
        <div className="modal-overlay" onClick={() => setShowUnclaimModal(null)}>
          <div className="modal unclaim-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Unclaim This Gift?</h2>
            </div>
            <div className="modal-body">
              <p>Changed your mind? No problem! This will make the item available for someone else to claim.</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowUnclaimModal(null)} 
                className="btn btn-secondary"
              >
                Keep It
              </button>
              <button 
                onClick={() => handleUnclaim(showUnclaimModal)}
                className="btn btn-primary"
                disabled={unclaimingId}
              >
                {unclaimingId ? 'Unclaiming...' : 'Yes, Unclaim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
