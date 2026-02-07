import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSpotify
} from '@fortawesome/free-brands-svg-icons'
import {
  faDesktop,
  faHouse,
  faCloudSun,
  faGear,
  faChartColumn,
  faBell,
  faCamera,
  faGrip,
  faFolderPlus,
  faRotateLeft,
  faXmark,
  faFolder,
  faPlus
} from '@fortawesome/free-solid-svg-icons'
import "./Apps.css"

const STORAGE_KEY = 'hs3-app-layout'

// All available apps with FontAwesome icons
const APP_REGISTRY = {
  spotify: { name: 'Spotify', icon: faSpotify, color: '#1DB954', isBrand: true },
  pcmanager: { name: 'PC Manager', icon: faDesktop, color: '#4A9EFF' },
  smarthome: { name: 'Smart Home', icon: faHouse, color: '#FF9800' },
  weather: { name: 'Weather', icon: faCloudSun, color: '#4FC3F7' },
  notifications: { name: 'Alerts', icon: faBell, color: '#FF6B9D' },
}

const DEFAULT_LAYOUT = [
  { id: 'spotify', type: 'app' },
  { id: 'pcmanager', type: 'app' },
  { id: 'smarthome', type: 'app' },
  { id: 'weather', type: 'app' },
  { id: 'notifications', type: 'app' },
]

function loadLayout() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { }
  return [...DEFAULT_LAYOUT]
}

function saveLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch { }
}

function generateFolderId() {
  return `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default function Apps() {
  const navigate = useNavigate()
  const [layout, setLayout] = useState(loadLayout)
  const [editMode, setEditMode] = useState(false)
  const [openFolder, setOpenFolder] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dropTarget, setDropTarget] = useState({ idx: null, type: null })
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)
  const renameInputRef = useRef(null)

  // Touch/swipe detection to prevent accidental taps during swipe
  const touchStart = useRef({ x: 0, y: 0 })
  const wasDragging = useRef(false)
  const SWIPE_THRESHOLD = 10 // pixels of movement to count as a swipe

  // Save layout on change
  useEffect(() => {
    saveLayout(layout)
  }, [layout])

  // Sync open folder with layout changes
  useEffect(() => {
    if (openFolder) {
      const updated = layout.find(item => item.id === openFolder.id)
      if (updated) setOpenFolder(updated)
      else setOpenFolder(null)
    }
  }, [layout, openFolder])

  // Focus rename input
  useEffect(() => {
    if (renamingFolder && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingFolder])

  const handleTap = useCallback((item) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    if (wasDragging.current) {
      wasDragging.current = false
      return
    }
    if (editMode) return
    if (item.type === 'folder') {
      setOpenFolder(item)
    } else {
      navigate(`/app/${item.id}`)
    }
  }, [navigate, editMode])

  // Track touch/mouse start position
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches ? e.touches[0] : e
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    wasDragging.current = false
  }, [])

  // Check if movement exceeds threshold
  const handleTouchMove = useCallback((e) => {
    const touch = e.touches ? e.touches[0] : e
    const dx = Math.abs(touch.clientX - touchStart.current.x)
    const dy = Math.abs(touch.clientY - touchStart.current.y)
    if (dx > SWIPE_THRESHOLD || dy > SWIPE_THRESHOLD) {
      wasDragging.current = true
    }
  }, [])

  const handleRemove = useCallback((id) => {
    setLayout(prev => prev.filter(item => item.id !== id))
  }, [])

  const handleRemoveFromFolder = useCallback((folderId, childId) => {
    setLayout(prev => {
      let newLayout = prev.map(item => {
        if (item.id === folderId && item.type === 'folder') {
          return { ...item, children: (item.children || []).filter(c => c !== childId) }
        }
        return item
      })
      // Remove empty folders
      newLayout = newLayout.filter(item => {
        if (item.type === 'folder') {
          return (item.children || []).length > 0
        }
        return true
      })
      return newLayout
    })
  }, [])

  const handleCreateFolder = useCallback(() => {
    const id = generateFolderId()
    setLayout(prev => [...prev, { id, type: 'folder', name: 'New Folder', children: [] }])
  }, [])

  const handleResetLayout = useCallback(() => {
    setLayout([...DEFAULT_LAYOUT])
    setEditMode(false)
    setOpenFolder(null)
  }, [])

  const handleAddApp = useCallback((appId) => {
    setLayout(prev => [...prev, { id: appId, type: 'app' }])
  }, [])

  const startRename = useCallback((folder) => {
    setRenamingFolder(folder.id)
    setRenameValue(folder.name || 'Folder')
  }, [])

  const finishRename = useCallback(() => {
    if (renamingFolder && renameValue.trim()) {
      setLayout(prev => prev.map(item =>
        item.id === renamingFolder ? { ...item, name: renameValue.trim() } : item
      ))
    }
    setRenamingFolder(null)
    setRenameValue('')
  }, [renamingFolder, renameValue])

  // Long press to enter edit mode
  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('.app-remove-btn') ||
        e.target.closest('.toolbar-btn') ||
        e.target.closest('.folder-panel') ||
        e.target.closest('.apps-edit-btn') ||
        e.target.closest('.folder-rename-input') ||
        e.target.closest('.folder-rename-inline')) return

    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setEditMode(true)
    }, 600)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // === DRAG AND DROP ===
  const handleDragStart = useCallback((e, idx) => {
    if (!editMode) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    setDragIdx(idx)
  }, [editMode])

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIdx === null || dragIdx === idx) return

    const draggedItem = layout[dragIdx]
    const targetItem = layout[idx]

    let dropType = 'reorder'
    if (targetItem.type === 'folder' && draggedItem.type === 'app') {
      dropType = 'into-folder'
    } else if (targetItem.type === 'app' && draggedItem.type === 'app') {
      dropType = 'create-folder'
    }

    setDropTarget({ idx, type: dropType })
  }, [dragIdx, layout])

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget({ idx: null, type: null })
    }
  }, [])

  const handleDrop = useCallback((e, targetIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null)
      setDropTarget({ idx: null, type: null })
      return
    }

    const draggedItem = layout[dragIdx]
    const targetItem = layout[targetIdx]

    setLayout(prev => {
      let newLayout = [...prev]

      if (targetItem.type === 'folder' && draggedItem.type === 'app') {
        // Drop app INTO existing folder
        newLayout = newLayout.map(item => {
          if (item.id === targetItem.id) {
            const children = item.children || []
            if (!children.includes(draggedItem.id)) {
              return { ...item, children: [...children, draggedItem.id] }
            }
          }
          return item
        })
        // Remove dragged app from root
        newLayout = newLayout.filter((_, i) => i !== dragIdx)

      } else if (targetItem.type === 'app' && draggedItem.type === 'app') {
        // Drop app ON app = create new folder
        const folderId = generateFolderId()
        const newFolder = {
          id: folderId,
          type: 'folder',
          name: 'New Folder',
          children: [targetItem.id, draggedItem.id]
        }
        // Remove both apps
        const indicesToRemove = [dragIdx, targetIdx].sort((a, b) => b - a)
        indicesToRemove.forEach(i => newLayout.splice(i, 1))
        // Insert folder at target position
        const insertAt = Math.min(dragIdx, targetIdx)
        newLayout.splice(insertAt, 0, newFolder)

      } else {
        // Simple reorder (folder to folder, or folder movement)
        const [moved] = newLayout.splice(dragIdx, 1)
        const insertAt = targetIdx > dragIdx ? targetIdx - 1 : targetIdx
        newLayout.splice(insertAt, 0, moved)
      }

      return newLayout
    })

    setDragIdx(null)
    setDropTarget({ idx: null, type: null })
  }, [dragIdx, layout])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDropTarget({ idx: null, type: null })
  }, [])

  // Calculate unplaced apps
  const placedIds = new Set()
  layout.forEach(item => {
    if (item.type === 'folder') {
      (item.children || []).forEach(c => placedIds.add(c))
    } else {
      placedIds.add(item.id)
    }
  })
  const unplacedApps = Object.keys(APP_REGISTRY).filter(id => !placedIds.has(id))

  // Render app icon
  const renderAppIcon = (info) => (
    <FontAwesomeIcon icon={info.icon} />
  )

  return (
    <div
      className="Page apps-page"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="page-gradient" />

      {/* Header */}
      <div className="apps-header">
        <div className="apps-title-group">
          <span className="apps-icon"><FontAwesomeIcon icon={faGrip} /></span>
          <span className="apps-title">APPS</span>
        </div>
        {editMode ? (
          <div className="apps-toolbar">
            <button className="toolbar-btn" onClick={handleCreateFolder}>
              <FontAwesomeIcon icon={faFolderPlus} /> New Folder
            </button>
            <button className="toolbar-btn reset" onClick={handleResetLayout}>
              <FontAwesomeIcon icon={faRotateLeft} /> Reset
            </button>
            <button className="toolbar-btn done" onClick={() => setEditMode(false)}>
              Done
            </button>
          </div>
        ) : (
          <button className="apps-edit-btn" onClick={() => setEditMode(true)}>
            Edit
          </button>
        )}
      </div>

      {/* App Grid */}
      <div className="apps-grid-container">
        <div className={`apps-grid ${editMode ? 'editing' : ''}`}>
          {layout.map((item, idx) => {
            const isDragging = dragIdx === idx
            const isDropTarget = dropTarget.idx === idx
            const dropType = isDropTarget ? dropTarget.type : null

            if (item.type === 'folder') {
              const previews = (item.children || []).slice(0, 4)
              const isRenaming = renamingFolder === item.id

              return (
                <div
                  key={item.id}
                  className={`app-slot folder-slot ${editMode ? 'editing' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? `drop-target ${dropType}` : ''}`}
                  draggable={editMode}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onMouseDown={handleTouchStart}
                  onMouseMove={handleTouchMove}
                  onClick={() => !isDragging && handleTap(item)}
                >
                  <div className="app-icon folder-icon">
                    {editMode && (
                      <button className="app-remove-btn" onClick={(e) => { e.stopPropagation(); handleRemove(item.id) }}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    )}
                    <div className="folder-preview">
                      {previews.map(childId => {
                        const info = APP_REGISTRY[childId]
                        return info ? (
                          <span key={childId} className="folder-preview-icon" style={{ color: info.color }}>
                            {renderAppIcon(info)}
                          </span>
                        ) : null
                      })}
                      {previews.length === 0 && (
                        <span className="folder-empty-icon">
                          <FontAwesomeIcon icon={faFolder} />
                        </span>
                      )}
                    </div>
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        className="folder-rename-inline"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={finishRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename()
                          if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="app-icon-name"
                        onDoubleClick={(e) => { if (editMode) { e.stopPropagation(); startRename(item) } }}
                      >
                        {item.name || 'Folder'}
                      </span>
                    )}
                  </div>
                  {isDropTarget && dropType === 'into-folder' && (
                    <div className="drop-hint"><FontAwesomeIcon icon={faPlus} /> Add to Folder</div>
                  )}
                </div>
              )
            } else {
              const info = APP_REGISTRY[item.id]
              if (!info) return null

              return (
                <div
                  key={item.id}
                  className={`app-slot ${editMode ? 'editing' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? `drop-target ${dropType}` : ''}`}
                  draggable={editMode}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onMouseDown={handleTouchStart}
                  onMouseMove={handleTouchMove}
                  onClick={() => !isDragging && handleTap(item)}
                >
                  <div className="app-icon">
                    {editMode && (
                      <button className="app-remove-btn" onClick={(e) => { e.stopPropagation(); handleRemove(item.id) }}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    )}
                    <div
                      className="app-icon-circle"
                      style={{
                        background: `linear-gradient(135deg, ${info.color}30, ${info.color}10)`,
                        borderColor: `${info.color}50`,
                        boxShadow: `0 4px 20px ${info.color}20`
                      }}
                    >
                      <span className="app-icon-emoji" style={{ color: info.color }}>
                        {renderAppIcon(info)}
                      </span>
                    </div>
                    <span className="app-icon-name">{info.name}</span>
                  </div>
                  {isDropTarget && dropType === 'create-folder' && (
                    <div className="drop-hint"><FontAwesomeIcon icon={faPlus} /> Create Folder</div>
                  )}
                </div>
              )
            }
          })}
        </div>

        {/* Unplaced apps (edit mode only) */}
        {editMode && unplacedApps.length > 0 && (
          <div className="unplaced-apps-section">
            <div className="unplaced-header">Available Apps</div>
            <div className="unplaced-grid">
              {unplacedApps.map(id => {
                const info = APP_REGISTRY[id]
                return (
                  <div key={id} className="app-slot unplaced" onClick={() => handleAddApp(id)}>
                    <div className="app-icon">
                      <div
                        className="app-icon-circle add"
                        style={{
                          background: `linear-gradient(135deg, ${info.color}20, ${info.color}05)`,
                          borderColor: `${info.color}30`,
                        }}
                      >
                        <span className="app-icon-emoji" style={{ color: info.color }}>
                          {renderAppIcon(info)}
                        </span>
                      </div>
                      <span className="app-icon-name">{info.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Folder overlay */}
      {openFolder && (
        <div className="folder-overlay" onClick={() => setOpenFolder(null)}>
          <div className="folder-panel" onClick={(e) => e.stopPropagation()}>
            <div className="folder-panel-header">
              {renamingFolder === openFolder.id ? (
                <input
                  ref={renameInputRef}
                  className="folder-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishRename()
                    if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                  }}
                />
              ) : (
                <span
                  className="folder-panel-title"
                  onClick={() => editMode && startRename(openFolder)}
                  style={{ cursor: editMode ? 'pointer' : 'default' }}
                >
                  {openFolder.name || 'Folder'}
                  {editMode && <span className="rename-hint"> (tap to rename)</span>}
                </span>
              )}
              <button className="folder-close-btn" onClick={() => setOpenFolder(null)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="folder-panel-grid">
              {(openFolder.children || []).map(childId => {
                const info = APP_REGISTRY[childId]
                if (!info) return null
                return (
                  <div
                    key={childId}
                    className={`app-slot ${editMode ? 'editing' : ''}`}
                    onClick={() => {
                      if (!editMode) {
                        setOpenFolder(null)
                        navigate(`/app/${childId}`)
                      }
                    }}
                  >
                    <div className="app-icon">
                      {editMode && (
                        <button
                          className="app-remove-btn"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFromFolder(openFolder.id, childId) }}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      )}
                      <div
                        className="app-icon-circle"
                        style={{
                          background: `linear-gradient(135deg, ${info.color}30, ${info.color}10)`,
                          borderColor: `${info.color}50`,
                          boxShadow: `0 4px 20px ${info.color}20`
                        }}
                      >
                        <span className="app-icon-emoji" style={{ color: info.color }}>
                          {renderAppIcon(info)}
                        </span>
                      </div>
                      <span className="app-icon-name">{info.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {(openFolder.children || []).length === 0 && (
              <div className="folder-empty-message">Folder is empty</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
