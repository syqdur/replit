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
  getUserDisplayName
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
    
    // Only allow removing own tags or admin can remove any tag
    if (tag.taggedBy !== currentUser && !isAdmin) {
      alert('Sie können nur Ihre eigenen Tags entfernen.');
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
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                isDarkMode
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>{getUserDisplayName(tag.userName, tag.deviceId)}</span>
              {(tag.taggedBy === currentUser || isAdmin) && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isLoading}
                  className={`ml-1 hover:opacity-70 transition-opacity ${
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Person markieren
        </button>
      ) : (
        <div className={`p-3 rounded-lg border transition-colors ${
          isDarkMode
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-200'
        }`}>
          {/* Search Input */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Person suchen..."
            className={`w-full px-3 py-2 rounded-lg border transition-colors mb-3 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            autoFocus
          />

          {/* User List */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={`${user.userName}_${user.deviceId}`}
                  onClick={() => handleAddTag(user)}
                  disabled={isLoading}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    isDarkMode
                      ? 'hover:bg-gray-700 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {user.displayName || user.userName}
                </button>
              ))
            ) : (
              <p className={`text-sm text-center py-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {searchTerm ? 'Keine Personen gefunden' : 'Alle Personen bereits markiert'}
              </p>
            )}
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setShowTagInput(false);
                setSearchTerm('');
              }}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};