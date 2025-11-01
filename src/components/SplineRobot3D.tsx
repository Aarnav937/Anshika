import { useState, useEffect, useRef } from "react";
import { SplineScene } from "@/components/ui/splite";

interface SplineRobot3DProps {
  className?: string;
}

export function SplineRobot3D({ className = "" }: SplineRobot3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Track mouse movement across the ENTIRE WEBSITE
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate position relative to the entire viewport
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    // Add event listener to the entire window, not just the container
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      {/* Global Mouse Tracking Spotlight Effect - Fixed position, follows cursor EVERYWHERE */}
      <div 
        className="fixed w-[600px] h-[600px] bg-gradient-radial from-purple-500/30 via-blue-500/15 to-transparent rounded-full blur-3xl pointer-events-none transition-all duration-100 ease-out"
        style={{
          left: `calc(${mousePosition.x}% - 700px)`,
          top: `calc(${mousePosition.y}% - 450px)`,
          zIndex: 1,
        }}
      />

      {/* FULL SCREEN Container - No restrictions */}
      <div 
        ref={containerRef}
        className={`absolute inset-0 ${className}`}
        style={{ 
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        {/* Badge - Top Right */}
        <div className="absolute top-6 right-6 bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-xl text-purple-200 px-4 py-2 rounded-full text-sm font-bold border border-purple-400/40 shadow-2xl shadow-purple-500/30 pointer-events-none z-50">
          Interactive 3D
        </div>

        {/* Spline Scene - FULL SCREEN */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            overflow: 'visible',
          }}
        >
          <SplineScene 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>

        {/* Floating Info - Bottom Right */}
        <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-xl text-white px-4 py-2.5 rounded-full text-sm border border-purple-500/30 shadow-2xl pointer-events-none z-50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-purple-200 font-semibold">Tracking Globally</span>
          </div>
        </div>
      </div>
    </>
  );
}
