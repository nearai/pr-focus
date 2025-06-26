'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface ResizablePaneProps {
  leftPane: ReactNode
  rightPane: ReactNode
  defaultLeftWidth?: number // percentage
  minLeftWidth?: number // percentage
  maxLeftWidth?: number // percentage
}

export default function ResizablePane({
  leftPane,
  rightPane,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80
}: ResizablePaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Clamp the width between min and max
      const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth)
      setLeftWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, minLeftWidth, maxLeftWidth])

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full"
      style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
    >
      {/* Left pane */}
      <div
        className="flex-shrink-0 overflow-auto"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPane}
      </div>

      {/* Resizer */}
      <div
        className="flex-shrink-0 w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize relative group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
          <div className="w-1 h-8 bg-gray-400 rounded opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center">
            <div className="w-0.5 h-1 bg-white mx-auto mb-0.5"></div>
            <div className="w-0.5 h-1 bg-white mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Right pane */}
      <div
        className="flex-1 overflow-auto"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPane}
      </div>
    </div>
  )
}