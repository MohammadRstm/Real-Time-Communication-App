import { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import React from "react";

function VideoContainer({ children, label }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
  }, [isFullscreen]);

  // Function to enhance video elements with proper fullscreen classes
  const enhanceChildren = (children) => {
    return React.Children.map(children, child => {
      if (!child) return child;
      
      // If it's a video element, enhance it
      if (child.type === 'video') {
        return React.cloneElement(child, {
          className: `w-full h-full ${
            isFullscreen ? 'object-contain max-w-full max-h-full' : 'object-cover'
          }`
        });
      }
      
      // For other elements (like the audio-only div), just ensure they fill container
      return React.cloneElement(child, {
        className: `${child.props.className || ''} w-full h-full`
      });
    });
  };

  return (
    <>
      {/* Background overlay - Remove the black background to show original page */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-40" />
      )}

      {/* Video container */}
      <div
        ref={containerRef}
        className={`group relative rounded-xl overflow-hidden shadow-lg border-2 border-blue-500 transition-all duration-300
          ${isFullscreen 
            ? "fixed top-45 left-145 transform -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[80vh] max-w-[1800px] max-h-[1000px] z-50 rounded-lg" 
            : "w-64 h-48"
          }`}
      >
        {/* Children container with centered content */}
        <div className={`w-full h-full ${isFullscreen ? "flex items-center justify-center bg-transparent" : ""}`}>
          {enhanceChildren(children)}
        </div>

        {/* Fullscreen Button - Position relative to container */}
        <button
          onClick={toggleFullscreen}
          className={`absolute bg-gray-700 bg-opacity-70 hover:bg-opacity-100 text-white p-2 rounded transition-all duration-200 z-10
            ${isFullscreen 
              ? "top-4 right-4"  // Position in top-right for fullscreen
              : "top-2 left-2 opacity-0 group-hover:opacity-100"  // Position in top-left for normal
            }`}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>

        {label && (
          <div className={`absolute bg-blue-500 text-xs px-2 py-1 rounded text-white z-10
            ${isFullscreen 
              ? "bottom-4 left-4"  // Position in bottom-left for fullscreen
              : "bottom-2 left-2"  // Position in bottom-left for normal
            }`}
          >
            {label}
          </div>
        )}
      </div>
    </>
  );
}

export default VideoContainer;