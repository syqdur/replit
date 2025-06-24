import React, { useState, useRef } from 'react';
import { X, Camera, Save, Loader2 } from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfileData: {
    profilePicture?: string;
    name: string;
    bio: string;
  };
  onSave: (profileData: {
    profilePicture?: File | string;
    name: string;
    bio: string;
  }) => Promise<void>;
  isDarkMode: boolean;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentProfileData,
  onSave,
  isDarkMode
}) => {
  const [name, setName] = useState(currentProfileData.name);
  const [bio, setBio] = useState(currentProfileData.bio);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    currentProfileData.profilePicture || null
  );
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        profilePicture: profilePicture || currentProfileData.profilePicture,
        name: name.trim(),
        bio: bio.trim()
      });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Fehler beim Speichern des Profils. Bitte versuche es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      // Reset form data
      setName(currentProfileData.name);
      setBio(currentProfileData.bio);
      setProfilePicture(null);
      setProfilePicturePreview(currentProfileData.profilePicture || null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Profil bearbeiten
          </h3>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={`p-2 rounded-full transition-colors duration-300 ${
              isSaving 
                ? 'cursor-not-allowed opacity-50'
                : isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Profile Picture Section */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Profilbild
          </label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {profilePicturePreview ? (
                  <img 
                    src={profilePicturePreview} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-2xl font-bold ${
                    isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {name.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                className={`absolute -bottom-1 -right-1 p-1.5 rounded-full shadow-lg transition-colors duration-300 ${
                  isSaving
                    ? 'cursor-not-allowed opacity-50'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-white hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
                disabled={isSaving}
              />
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Klicke auf das Kamera-Symbol um ein neues Bild auszuwählen
              </p>
            </div>
          </div>
        </div>

        {/* Name Section */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            placeholder="Dein Name..."
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
              isSaving
                ? 'cursor-not-allowed opacity-50'
                : isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            maxLength={50}
          />
          <p className={`text-xs mt-1 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {name.length}/50 Zeichen
          </p>
        </div>

        {/* Bio Section */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isSaving}
            placeholder="Erzähle etwas über euch..."
            rows={4}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none transition-colors duration-300 ${
              isSaving
                ? 'cursor-not-allowed opacity-50'
                : isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            maxLength={200}
          />
          <p className={`text-xs mt-1 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {bio.length}/200 Zeichen
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={`flex-1 py-3 px-4 rounded-xl transition-colors duration-300 ${
              isSaving
                ? 'cursor-not-allowed opacity-50'
                : isDarkMode 
                  ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className={`flex-1 py-3 px-4 rounded-xl transition-colors duration-300 flex items-center justify-center gap-2 ${
              isSaving || !name.trim()
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-pink-600 hover:bg-pink-700 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Speichern
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};