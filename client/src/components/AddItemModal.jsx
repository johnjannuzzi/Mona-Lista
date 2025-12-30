import { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'
import './Modal.css'

const API_URL = 'https://monalista.io'

export default function AddItemModal({ item, onClose, onAdd }) {
  const [url, setUrl] = useState(item?.original_url || '')
  const [title, setTitle] = useState(item?.title || '')
  const [price, setPrice] = useState(item?.price || '')
  const [domain, setDomain] = useState(item?.domain || '')
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [notes, setNotes] = useState(item?.notes || '')
  const [isTopChoice, setIsTopChoice] = useState(item?.is_top_choice || false)
  const [scraping, setScraping] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEditing = !!item

  const handleScrape = async () => {
    if (!url.trim()) return

    setScraping(true)
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scrape timeout')), 5000)
    )
    
    try {
      const fetchPromise = fetch(`${API_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() })
      }).then(res => res.json())
      
      const data = await Promise.race([fetchPromise, timeoutPromise])
      
      if (data.title) setTitle(data.title)
      if (data.price) setPrice(data.price)
      if (data.domain) setDomain(data.domain)
      if (data.image_url) setImageUrl(data.image_url)
    } catch (err) {
      console.error('Scrape error:', err)
      // Still set the domain even if scrape fails
      try {
        const urlObj = new URL(url.trim())
        setDomain(urlObj.hostname.replace('www.', ''))
      } catch {}
    } finally {
      setScraping(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    await onAdd({
      title: title.trim(),
      price: price ? parseFloat(price) : null,
      original_url: url.trim() || null,
      affiliate_url: url.trim() || null,
      domain: domain.trim() || null,
      image_url: imageUrl.trim() || null,
      notes: notes.trim() || null,
      is_top_choice: isTopChoice
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* URL Input with Scrape */}
            <div className="form-group">
              <label className="form-label">Product URL</label>
              <div className="url-input-row">
                <div className="url-input-wrapper">
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleScrape}
                  disabled={!url.trim() || scraping}
                  className="btn btn-secondary btn-small"
                >
                  {scraping ? <Loader size={16} className="spin" /> : 'Fetch'}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="What is it?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Price & Domain */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Store</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="amazon.com"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
              <p className="form-hint">
                Optional. If auto-fetch didn't find an image, right-click the product image → "Copy image address"
              </p>
              {imageUrl && (
                <div className="image-preview">
                  <img src={imageUrl} alt="Preview" />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                placeholder="Size, color, or any other details..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Top Choice Toggle */}
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={isTopChoice}
                onChange={e => setIsTopChoice(e.target.checked)}
              />
              <span>Mark as top choice</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
