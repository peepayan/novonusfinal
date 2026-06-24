"use client"
import { useEffect, useRef, useState } from "react"
import { MeshGradient } from "@paper-design/shaders-react"
import { motion } from "framer-motion"

export default function ShaderShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const handleMouseEnter = () => setIsActive(true)
    const handleMouseLeave = () => setIsActive(false)
    const container = containerRef.current
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter)
      container.addEventListener("mouseleave", handleMouseLeave)
    }
    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter)
        container.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-[#f5efe5] relative overflow-hidden">
      {/* Primary cream mesh */}
      <MeshGradient
        className="absolute inset-0 w-full h-full"
        colors={["#f5efe5", "#e8d5b7", "#d4b896", "#ede3d6", "#c8a87a"]}
        speed={0.3}
      />
      {/* Subtle warm overlay */}
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-40"
        colors={["#f5efe5", "#e0cba8", "#ddd0b8", "#f0e6d3"]}
        speed={0.2}
      />
    </div>
  )
}
