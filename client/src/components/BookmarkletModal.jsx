import { X } from 'lucide-react'
import './Modal.css'

const APP_URL = 'https://monalista.io'

export default function BookmarkletModal({ onClose }) {
  // The bookmarklet code - opens a popup to add the current page to Mona Lista
  const bookmarkletCode = `javascript:(function(){
    var w=window.open('${APP_URL}/add?url='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title),'monalista','width=480,height=720,scrollbars=yes');
    w.focus();
  })();`.replace(/\s+/g, ' ')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add to Mona Lista</h2>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="bookmarklet-content">
          <p>
            Drag this button to your bookmarks bar to quickly add items 
            from any shopping site to your Mona Lista.
          </p>

          <a 
            href={bookmarkletCode}
            className="bookmarklet-button"
            onClick={e => e.preventDefault()}
            draggable="true"
          >
            + Add to Mona Lista
          </a>

          <div className="bookmarklet-instructions">
            <h4>How to use:</h4>
            <ol>
              <li>Drag the button above to your bookmarks bar</li>
              <li>When you find something you want, click the bookmark</li>
              <li>Choose a list and save — done!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
