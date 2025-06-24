import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { MediaItem, Comment, Like } from '../types';

interface MediaModalProps {
  isOpen: boolean;
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  comments: Comment[];
  likes: Like[];
  onAddComment: (mediaId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleLike: (mediaId: string) => void;
  userName: string;
  isAdmin: boolean;
  isDarkMode: boolean;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  isOpen,
  items,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  comments,
  likes,
  onAddComment,
  onDeleteComment,
  onToggleLike,
  userName,
  isAdmin,
  isDarkMode
}) => {
  const [commentText, setCommentText] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const currentItem = items[currentIndex];
  const currentComments = comments.filter(c => c.mediaId === currentItem?.id);
  const currentLikes = likes.filter(l => l.mediaId === currentItem?.id);
  const isLiked = currentLikes.some(like => like.userName === userName);
  const likeCount = currentLikes.length;

  // Reset loading states when item changes
  useEffect(() => {
    if (currentItem) {
      setImageError(false);
      setImageLoading(true);
    }
  }, [currentItem?.id]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen || !currentItem) return null;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(currentItem.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleDeleteComment = (commentId: string, comment: Comment) => {
    // User can delete their own comments or admin can delete any
    const canDeleteComment = isAdmin || comment.userName === userName;
    
    if (canDeleteComment && window.confirm('Kommentar wirklich löschen?')) {
      onDeleteComment(commentId);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error(`❌ Modal image failed to load: ${currentItem.url}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'vor wenigen Minuten';
    if (diffInHours < 24) return `vor ${diffInHours}h`;
    if (diffInHours < 168) return `vor ${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString('de-DE');
  };

  // Generate beautiful wedding-themed avatar based on username
  const getAvatarUrl = (username: string) => {
    const weddingAvatars = [
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1070850/pexels-photo-1070850.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1444443/pexels-photo-1444443.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    ];
    
    const hash = username.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return weddingAvatars[Math.abs(hash) % weddingAvatars.length];
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      {/* Mobile Instagram-style modal */}
      <div className={`w-full max-w-md mx-auto flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button onClick={onClose}>
            <X className={`w-6 h-6 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`} />
          </button>
          <span className={`font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Beitrag
          </span>
          <div></div>
        </div>

        {/* Media */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {currentItem.type === 'video' ? (
            <video
              src={currentItem.url}
              controls
              className="max-w-full max-h-full"
              preload="metadata"
              onLoadStart={() => setImageLoading(true)}
              onLoadedData={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          ) : currentItem.type === 'note' ? (
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50' 
                : 'bg-gradient-to-br from-purple-100 to-pink-100'
            }`}>
              <div className={`max-w-sm w-full p-6 rounded-2xl transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800/80 border border-purple-700/30' : 'bg-white/90 border border-purple-200/50'
              }`}>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">💌</div>
                  <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Notiz
                  </h3>
                </div>
                <div className={`p-4 rounded-xl transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <p className={`text-base leading-relaxed transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    "{currentItem.noteText}"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {imageError ? (
                <div className="flex flex-col items-center justify-center text-white p-8">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-lg text-center mb-2">
                    Bild nicht verfügbar
                  </p>
                  <p className="text-sm text-center opacity-75 mb-4">
                    Von {currentItem.uploadedBy}
                  </p>
                  <button
                    onClick={() => {
                      setImageError(false);
                      setImageLoading(true);
                      // Force reload
                      const img = new Image();
                      img.onload = handleImageLoad;
                      img.onerror = handleImageError;
                      img.src = currentItem.url;
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <img
                  src={currentItem.url}
                  alt="Hochzeitsfoto"
                  className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                    imageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>
          )}
          
          {items.length > 1 && (
            <>
              <button
                onClick={onPrev}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Actions and Comments */}
        <div className={`transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Action buttons */}
          <div className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onToggleLike(currentItem.id)}
                className={`transition-colors ${
                  isLiked ? 'text-red-500' : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <MessageCircle className={`w-6 h-6 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`} />
            </div>
          </div>

          {/* Post info */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img 
                    src={getAvatarUrl(currentItem.uploadedBy)}
                    alt={currentItem.uploadedBy}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <span className={`font-semibold text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {currentItem.uploadedBy}
                  {currentItem.uploadedBy === userName && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full transition-colors duration-300 ${
                      isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Du
                    </span>
                  )}
                </span>
                <div className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {formatDate(currentItem.uploadedAt)}
                </div>
              </div>
            </div>
            <div className="mb-2">
              <span className={`font-semibold text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {likeCount > 0 ? `${likeCount} „Gefällt mir"-Angabe${likeCount > 1 ? 'n' : ''}` : 'Gefällt dir das?'}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="max-h-40 overflow-y-auto px-4">
            {currentComments.map((comment) => {
              const canDeleteThisComment = isAdmin || comment.userName === userName;
              
              return (
                <div key={comment.id} className="flex items-start gap-3 py-2 group">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={getAvatarUrl(comment.userName)}
                      alt={comment.userName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <span className={`font-semibold text-sm mr-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {comment.userName}
                      {comment.userName === userName && (
                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                          Du
                        </span>
                      )}
                    </span>
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {comment.text}
                    </span>
                    <div className={`text-xs mt-1 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {formatDate(comment.createdAt)}
                    </div>
                  </div>
                  {canDeleteThisComment && (
                    <button
                      onClick={() => handleDeleteComment(comment.id, comment)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                      title="Kommentar löschen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add comment */}
          <form onSubmit={handleSubmitComment} className={`p-4 border-t transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full overflow-hidden">
                <img 
                  src={getAvatarUrl(userName)}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Kommentieren..."
                className={`flex-1 text-sm outline-none bg-transparent transition-colors duration-300 ${
                  isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                }`}
              />
              {commentText.trim() && (
                <button
                  type="submit"
                  className="text-blue-500 font-semibold text-sm"
                >
                  Posten
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
