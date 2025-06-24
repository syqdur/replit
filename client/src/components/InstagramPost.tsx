import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { MediaItem, Comment, Like } from '../types';

interface InstagramPostProps {
  item: MediaItem;
  comments: Comment[];
  likes: Like[];
  onAddComment: (mediaId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleLike: (mediaId: string) => void;
  onDelete?: (item: MediaItem) => void;
  onEditNote?: (item: MediaItem, newText: string) => void;
  showDeleteButton: boolean;
  userName: string;
  isAdmin: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

export const InstagramPost: React.FC<InstagramPostProps> = ({
  item,
  comments,
  likes,
  onAddComment,
  onDeleteComment,
  onToggleLike,
  onDelete,
  onEditNote,
  showDeleteButton,
  userName,
  isAdmin,
  onClick,
  isDarkMode
}) => {
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteText, setEditNoteText] = useState(item.noteText || '');

  const isLiked = likes.some(like => like.userName === userName);
  const likeCount = likes.length;

  // Check if current user can delete this post
  const canDeletePost = isAdmin || item.uploadedBy === userName;
  
  // Check if current user can edit this note
  const canEditNote = item.type === 'note' && item.uploadedBy === userName;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(item.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Beitrag wirklich löschen?')) {
      onDelete(item);
    }
  };

  const handleDeleteComment = (commentId: string, comment: Comment) => {
    // User can delete their own comments or admin can delete any
    const canDeleteComment = isAdmin || comment.userName === userName;
    
    if (canDeleteComment && window.confirm('Kommentar wirklich löschen?')) {
      onDeleteComment(commentId);
    }
  };

  const handleEditNote = () => {
    if (onEditNote && editNoteText.trim() && editNoteText !== item.noteText) {
      onEditNote(item, editNoteText.trim());
    }
    setIsEditingNote(false);
  };

  const handleCancelEdit = () => {
    setEditNoteText(item.noteText || '');
    setIsEditingNote(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error(`❌ Image failed to load: ${item.url}`);
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

  const displayComments = showAllComments ? comments : comments.slice(0, 2);

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
    <div className={`border-b transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
    }`}>
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 p-0.5">
            <div className="w-full h-full rounded-full overflow-hidden">
              <img 
                src={getAvatarUrl(item.uploadedBy)}
                alt={item.uploadedBy}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <span className={`font-semibold text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {item.uploadedBy}
              {item.uploadedBy === userName && (
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
              {formatDate(item.uploadedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEditNote && (
            <button
              onClick={() => setIsEditingNote(true)}
              className={`p-1 rounded transition-colors duration-300 ${
                isDarkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-500 hover:bg-blue-50'
              }`}
              title="Notiz bearbeiten"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {canDeletePost && (
            <button
              onClick={handleDelete}
              className={`p-1 rounded transition-colors duration-300 ${
                isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-500 hover:bg-red-50'
              }`}
              title="Beitrag löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <MoreHorizontal className={`w-5 h-5 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`} />
        </div>
      </div>

      {/* Media Content */}
      <div className="relative">
        {item.type === 'video' ? (
          <video
            src={item.url}
            className="w-full aspect-square object-cover"
            controls
            preload="metadata"
            onLoadStart={() => setImageLoading(true)}
            onLoadedData={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        ) : (
          <div className="relative w-full aspect-square">
            {imageLoading && !item.isUnavailable && (
              <div className={`absolute inset-0 flex items-center justify-center transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* 🔧 FIX: Show unavailable state for items that couldn't be loaded */}
            {(imageError || item.isUnavailable || !item.url) ? (
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                <AlertTriangle className="w-12 h-12 mb-4 text-orange-500" />
                <div className="text-lg font-semibold mb-2">Datei nicht verfügbar</div>
                <p className="text-sm text-center px-4 mb-2">
                  {item.isUnavailable 
                    ? 'Diese Datei konnte nicht geladen werden'
                    : 'Bild konnte nicht geladen werden'
                  }
                </p>
                <p className="text-xs text-center px-4 opacity-75">
                  Von {item.uploadedBy} • {formatDate(item.uploadedAt)}
                </p>
                <div className={`mt-4 px-3 py-1 rounded-full text-xs transition-colors duration-300 ${
                  isDarkMode ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800'
                }`}>
                  {item.type === 'video' ? '🎥 Video' : '📷 Bild'}
                </div>
              </div>
            ) : (
              <img
                src={item.url}
                alt="Hochzeitsfoto"
                className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onClick={onClick}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onToggleLike(item.id)}
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

        {/* Likes */}
        <div className="mb-2">
          <span className={`font-semibold text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {likeCount > 0 ? `${likeCount} „Gefällt mir"-Angabe${likeCount > 1 ? 'n' : ''}` : 'Gefällt dir das?'}
          </span>
        </div>

        {/* Note Edit Mode */}
        {isEditingNote && item.type === 'note' && (
          <div className={`mb-4 p-4 rounded-xl transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-blue-50 border border-blue-200'
          }`}>
            <h4 className={`font-semibold mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Notiz bearbeiten:
            </h4>
            <textarea
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
              className={`w-full p-3 rounded-lg border resize-none transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              rows={3}
              maxLength={500}
              placeholder="Deine Notiz..."
            />
            <div className={`text-xs mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {editNoteText.length}/500
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCancelEdit}
                className={`px-3 py-1 rounded text-sm transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditNote}
                disabled={!editNoteText.trim() || editNoteText === item.noteText}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-1">
          {displayComments.map((comment) => {
            const canDeleteThisComment = isAdmin || comment.userName === userName;
            
            return (
              <div key={comment.id} className="text-sm flex items-start justify-between group">
                <div className="flex-1">
                  <span className={`font-semibold mr-2 transition-colors duration-300 ${
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
                  <span className={`transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {comment.text}
                  </span>
                </div>
                {canDeleteThisComment && (
                  <button
                    onClick={() => handleDeleteComment(comment.id, comment)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Kommentar löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          
          {comments.length > 2 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Alle {comments.length} Kommentare ansehen
            </button>
          )}
        </div>

        {/* Add Comment */}
        <form onSubmit={handleSubmitComment} className={`mt-3 pt-3 border-t transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
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
  );
};