import { useState, useRef, useCallback, useEffect } from "react"
import PageDots from "../../components/common/PageDots/PageDots"
import { Overview, Apps, Statistics, Settings } from "./pages/index.js"
import "./Home.css"

const STORAGE_KEY = 'hs3-home-active-page'

export default function Home() {
  const pages = [
    <Overview />,
    <Apps />,
    <Statistics />,
    <Settings />,
  ]

  // Initialize from sessionStorage to persist across app navigation
  const [activePage, setActivePage] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    const page = saved ? parseInt(saved, 10) : 0
    return page >= 0 && page < pages.length ? page : 0
  })

  // Save to sessionStorage whenever page changes
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activePage.toString())
  }, [activePage])
  const [dragStartX, setDragStartX] = useState(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef()

  // Check if event target is inside an element that handles its own drag
  const shouldIgnoreSwipe = useCallback((e) => {
    // Check if we're in apps edit mode (draggable elements)
    const draggable = e.target.closest('[draggable="true"]')
    if (draggable) return true

    // Check if we're inside a folder overlay
    if (e.target.closest('.folder-overlay')) return true

    // Check if we're in editing mode on apps page
    if (e.target.closest('.apps-grid.editing')) return true

    return false
  }, [])

  const startDrag = (e, x) => {
    if (shouldIgnoreSwipe(e)) return
    setDragStartX(x)
    setDragOffset(0)
    setIsDragging(true)
  }

  const moveDrag = (x) => {
    if (dragStartX === null || !isDragging) return
    const offset = x - dragStartX
    setDragOffset(offset)
  }

  const endDrag = () => {
    if (!isDragging || dragStartX === null) {
      setIsDragging(false)
      return
    }

    const threshold = 75

    if (dragOffset < -threshold && activePage < pages.length - 1) {
      setActivePage(activePage + 1)
    } else if (dragOffset > threshold && activePage > 0) {
      setActivePage(activePage - 1)
    }

    setDragOffset(0)
    setDragStartX(null)
    setIsDragging(false)
  }

  return (
    <div className="Home-Container" ref={containerRef}>
      <div
        className="Pages-Wrapper"
        style={{
          transform: `translateX(calc(${-activePage * 100}% + ${dragOffset}px))`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseDown={(e) => {
          if (shouldIgnoreSwipe(e)) return
          e.preventDefault()
          startDrag(e, e.clientX)
        }}
        onMouseMove={(e) => {
          if (isDragging) {
            e.preventDefault()
            moveDrag(e.clientX)
          }
        }}
        onMouseUp={(e) => {
          if (!isDragging) return
          e.preventDefault()
          endDrag()
        }}
        onMouseLeave={endDrag}
        onTouchStart={(e) => {
          if (shouldIgnoreSwipe(e)) return
          startDrag(e, e.touches[0].clientX)
        }}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
        onTouchEnd={endDrag}
      >
        {pages.map((page, i) => (
          <div className="PageWrapper" key={i}>
            {page}
          </div>
        ))}
      </div>

      <PageDots
        count={pages.length}
        active={activePage}
        onChange={setActivePage}
      />
    </div>
  )
}
