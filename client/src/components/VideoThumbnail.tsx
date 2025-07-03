import React, { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  src: string;
  className?: string;
  onClick?: () => void;
  showPlayButton?: boolean;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  src,
  className = '',
  onClick,
  showPlayButton = true
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateThumbnail = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setThumbnailUrl(url);
        }
      }, 'image/jpeg', 0.7);
    };

    const video = videoRef.current;
    if (video) {
      const handleLoadedData = () => {
        // Seek to 0.1 seconds for thumbnail
        video.currentTime = 0.1;
      };

      const handleSeeked = () => {
        generateThumbnail();
      };

      const handleError = () => {
        setHasError(true);
      };

      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        
        // Clean up blob URL
        if (thumbnailUrl) {
          URL.revokeObjectURL(thumbnailUrl);
        }
      };
    }
  }, [src, thumbnailUrl]);

  if (hasError) {
    return (
      <div className={`relative bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-white">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-6 h-6" />
          </div>
          <div className="text-xs">Video</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {/* Hidden video element for thumbnail generation */}
      <video
        ref={videoRef}
        src={src}
        className="hidden"
        muted
        preload="metadata"
        playsInline
      />
      
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Display thumbnail or loading state */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center animate-pulse">
          <div className="text-center text-white">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-4 h-4" />
            </div>
            <div className="text-xs">Loading...</div>
          </div>
        </div>
      )}
      
      {/* Play button overlay */}
      {showPlayButton && (
        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
      )}
    </div>
  );
};