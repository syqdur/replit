import React, { useState, useEffect } from 'react';
import { X, UserPlus, Tag, Trash2 } from 'lucide-react';
import { MediaTag } from '../types';
import { addMediaTag, removeMediaTag, getAllUsers } from '../services/firebaseService';

interface MediaTaggingProps {
  mediaId: string;
  tags: MediaTag[];
  currentUser: string;
  currentDeviceId: string;
  isAdmin: boolean;
  isDarkMode: boolean;
  onTagsUpdated: () => void;
  getUserDisplayName: (userName: string, deviceId?: string) => string;
  mediaUploader?: string; // The user who uploaded this media
}

interface User {
  userName: string;
  deviceId: string;
  displayName?: string;
}

export const MediaTagging: React.FC<MediaTaggingProps> = ({
  mediaId,
  tags,
  currentUser,
  currentDeviceId,
  isAdmin,
  isDarkMode,
  onTagsUpdated,
  getUserDisplayName,
  mediaUploader
}) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = availableUsers.filter(user => {
        const displayName = user.displayName || user.userName;
        return displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
               !tags.some(tag => tag.userName === user.userName && tag.deviceId === user.deviceId);
      });
      setFilteredUsers(filtered);
    } else {
      const untagged = availableUsers.filter(user => 
        !tags.some(tag => tag.userName === user.userName && tag.deviceId === user.deviceId)
      );
      setFilteredUsers(untagged);
    }
  }, [searchTerm, availableUsers, tags]);

  const loadUsers = async () => {
    try {
      const users = await getAllUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleAddTag = async (user: User) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await addMediaTag(
        mediaId,
        user.userName,
        user.deviceId,
        currentUser,
        currentDeviceId
      );
      onTagsUpdated();
      setSearchTerm('');
      setShowTagInput(false);
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('Fehler beim Hinzufügen des Tags. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async (tag: MediaTag) => {
    if (isLoading) return;
    
    // Allow removing tags if:
    // 1. User created the tag themselves
    // 2. User is admin (can remove any tag)
    // 3. User uploaded the media (can remove tags from their own media)
    const canRemove = tag.taggedBy === currentUser || isAdmin || (mediaUploader && mediaUploader === currentUser);
    
    if (!canRemove) {
      alert('Sie können nur Ihre eigenen Tags oder Tags von Ihren eigenen Medien entfernen.');
      return;
    }

    setIsLoading(true);
    try {
      await removeMediaTag(tag.id);
      onTagsUpdated();
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Fehler beim Entfernen des Tags. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 backdrop-blur-sm border border-purple-200/30 dark:border-purple-600/30 shadow-lg hover:shadow-xl"
            >
              <Tag className="w-3 h-3" />
              <span>{getUserDisplayName(tag.userName, tag.deviceId)}</span>
              {(tag.taggedBy === currentUser || isAdmin || (mediaUploader && mediaUploader === currentUser)) && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isLoading}
                  className={`ml-1 hover:opacity-70 transition-all duration-300 transform hover:scale-110 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Tag Button */}
      {!showTagInput ? (
        <button
          onClick={() => setShowTagInput(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 bg-white/20 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 backdrop-blur-lg border border-white/30 dark:border-gray-600/30 hover:bg-white/30 dark:hover:bg-gray-700/30 shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-4 h-4" />
          Person markieren
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-xl">
          {/* Search Input */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Person suchen..."
            className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white transition-all duration-300 mb-4"
            autoFocus
          />

          {/* User List */}
          <div className="max-h-40 overflow-y-auto space-y-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={`${user.userName}_${user.deviceId}`}
                  onClick={() => handleAddTag(user)}
                  disabled={isLoading}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  } bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60 backdrop-blur-sm text-gray-700 dark:text-gray-300 border border-white/20 dark:border-gray-600/20 hover:border-purple-300 dark:hover:border-purple-600 shadow-sm hover:shadow-md`}
                >
                  {user.displayName || user.userName}
                </button>
              ))
            ) : (
              <p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400 bg-white/30 dark:bg-gray-800/30 rounded-xl backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
                {searchTerm ? 'Keine Personen gefunden' : 'Alle Personen bereits markiert'}
              </p>
            )}
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setShowTagInput(false);
                setSearchTerm('');
              }}
              className="px-4 py-2 text-sm rounded-xl font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 backdrop-blur-lg border border-white/30 dark:border-gray-600/30 shadow-lg"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};