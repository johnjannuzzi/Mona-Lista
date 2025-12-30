import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Loader, X, Plus } from 'lucide-react'
import './AddItemPage.css'

const API_URL = 'https://monalista.io'

export default function AddItemPage() {
  const [searchParams] = useSearchParams()
  const [lists, setLists] = useState([])
  const [selectedList, setSelectedList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  
  // Item data
  const [title, setTitle] = useState(searchParams.get('title') || '')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [showImageHelp, setShowImageHelp] = useState(false)
  const [scrapeWarning, setScrapeWarning] = useState(false)
  
  const url = searchParams.get('url') || ''
  const domain = url ? new URL(url).hostname.replace('www.', '') : ''

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  const checkAuthAndFetch = async () => {
    try {
      // Check if logged in
      const authRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      const authData = await authRes.json()
      
      if (!authData.user) {
        setError('Please log in to Mona Lista first')
        setLoading(false)
        return
      }
      
      setUser(authData.user)
      
      // Fetch lists
      const listsRes = await fetch(`${API_URL}/api/lists`, { credentials: 'include' })
      const listsData = await listsRes.json()
      setLists(listsData)
      
      if (listsData.length > 0) {
        setSelectedList(listsData[0].id)
      }
      
      // Auto-scrape the URL
      if (url) {
        scrapeUrl()
      }
      
      setLoading(false)
    } catch (err) {
      setError('Failed to connect')
      setLoading(false)
    }
  }

  const scrapeUrl = async () => {
    setScraping(true)
    setScrapeWarning(false)
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scrape timeout')), 5000)
    )
    
    try {
      const fetchPromise = fetch(`${API_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url })
      }).then(res => res.json())
      
      // Race between fetch and timeout
      const data = await Promise.race([fetchPromise, timeoutPromise])
      
      // Only overwrite if we got better data
      if (data.title && data.title.trim()) setTitle(data.title)
      if (data.price) setPrice(data.price)
      if (data.image_url) setImageUrl(data.image_url)
      
      // Show warning if we didn't get an image (title we likely have from page)
      if (!data.image_url) {
        setScrapeWarning(true)
      }
    } catch (err) {
      console.error('Scrape error:', err)
      setScrapeWarning(true)
    } finally {
      setScraping(false)
    }
  }

  const handleSave = async () => {
    if (!selectedList || !title.trim()) return
    
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          list_id: selectedList,
          title: title.trim(),
          price: price ? parseFloat(price) : null,
          original_url: url,
          affiliate_url: url,
          domain,
          image_url: imageUrl,
          notes: notes.trim() || null,
          is_top_choice: false
        })
      })
      
      setSaved(true)
      
      // Close window after a moment
      setTimeout(() => {
        window.close()
      }, 1500)
    } catch (err) {
      setError('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleLogin = () => {
    // Open main site in new tab for login
    window.open(`${API_URL}`, '_blank')
  }

  if (loading) {
    return (
      <div className="add-page">
        <div className="add-page-loading">
          <Loader className="spin" size={32} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="add-page">
        <div className="add-page-error">
          <h2>Not Logged In</h2>
          <p>Please log in to Mona Lista to add items.</p>
          <button onClick={handleLogin} className="btn btn-primary">
            Open Mona Lista
          </button>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="add-page">
        <div className="add-page-success">
          <div className="success-icon">
            <Check size={48} />
          </div>
          <h2>Added!</h2>
          <p>Item saved to your list</p>
        </div>
      </div>
    )
  }

  return (
    <div className="add-page">
      <div className="add-page-header">
        <h1>Add to Mona Lista</h1>
        <button onClick={() => window.close()} className="btn-ghost btn-icon">
          <X size={20} />
        </button>
      </div>

      <div className="add-page-content">
        {/* Warning message - only show when scrape fails */}
        {scrapeWarning && (
          <p className="scrape-warning">
            We couldn't grab all the details. Please fill in the missing info below!
          </p>
        )}

        {/* Preview */}
        <div className="item-preview">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="preview-image" />
          ) : (
            <div className="preview-placeholder">
              {scraping ? <Loader className="spin" size={24} /> : <Plus size={24} />}
            </div>
          )}
          <div className="preview-info">
            <span className="preview-domain">{domain}</span>
            {price && <span className="preview-price">${price}</span>}
          </div>
        </div>

        {/* Form */}
        <div className="add-form">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Item name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Add to List</label>
            {lists.length === 0 ? (
              <p className="no-lists">No lists yet. Create one in Mona Lista first!</p>
            ) : (
              <select
                className="form-input"
                value={selectedList || ''}
                onChange={e => setSelectedList(parseInt(e.target.value))}
              >
                {lists.map(list => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Image URL (optional)</label>
            <input
              type="url"
              className="form-input"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
            <button 
              type="button" 
              className="help-toggle"
              onClick={() => setShowImageHelp(!showImageHelp)}
            >
              {showImageHelp ? 'Hide help' : 'How do I get an image URL?'}
            </button>
            {showImageHelp && (
              <div className="image-help">
                <ol>
                  <li>Find the product image on the page</li>
                  <li>Right-click on the image</li>
                  <li>Select "Copy image address" or "Copy image link"</li>
                  <li>Paste it here!</li>
                </ol>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Size, color, etc."
            />
          </div>
        </div>
      </div>

      <div className="add-page-footer">
        <button 
          onClick={handleSave} 
          className="btn btn-primary btn-full"
          disabled={saving || !selectedList || !title.trim()}
        >
          {saving ? 'Saving...' : 'Add to List'}
        </button>
      </div>
    </div>
  )
}
