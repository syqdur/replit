import React, { useState, useEffect, useRef } from 'react';
import { Heart, Calendar, MapPin, Camera, Plus, Edit3, Trash2, Save, X, Image, Video, Upload } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

interface TimelineEvent {
  id: string;
  title: string;
  customEventName?: string; // For custom event types
  date: string;
  description: string;
  location?: string;
  type: 'first_date' | 'first_kiss' | 'first_vacation' | 'engagement' | 'moving_together' | 'anniversary' | 'custom' | 'other';
  createdBy: string;
  createdAt: string;
  mediaUrls?: string[]; // Array of media URLs
  mediaTypes?: string[]; // Array of media types ('image' or 'video')
  mediaFileNames?: string[]; // For deletion from storage
}

interface TimelineProps {
  isDarkMode: boolean;
  userName: string;
  isAdmin: boolean;
}

const eventTypes = [
  { value: 'first_date', label: '💕 Erstes Date', icon: '💕', color: 'pink' },
  { value: 'first_kiss', label: '💋 Erster Kuss', icon: '💋', color: 'red' },
  { value: 'first_vacation', label: '✈️ Erster Urlaub', icon: '✈️', color: 'blue' },
  { value: 'moving_together', label: '🏠 Zusammengezogen', icon: '🏠', color: 'green' },
  { value: 'engagement', label: '💍 Verlobung', icon: '💍', color: 'yellow' },
  { value: 'anniversary', label: '🎉 Jahrestag', icon: '🎉', color: 'purple' },
  { value: 'custom', label: '✨ Eigenes Event', icon: '✨', color: 'indigo' },
  { value: 'other', label: '❤️ Sonstiges', icon: '❤️', color: 'gray' }
];

export const Timeline: React.FC<TimelineProps> = ({ isDarkMode, userName, isAdmin }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    customEventName: '',
    date: '',
    description: '',
    location: '',
    type: 'other' as TimelineEvent['type']
  });
  const [modalMedia, setModalMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    title: string;
  } | null>(null);

  // Load timeline events with comprehensive error handling
  useEffect(() => {
    console.log('🔄 Loading timeline events...');
    
    let unsubscribe: (() => void) | null = null;
    
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Test Firebase connection first
        console.log('🔗 Testing Firebase connection...');
        
        // Create query with error handling
        const q = query(collection(db, 'timeline'), orderBy('date', 'asc'));
        
        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            console.log(`📋 Timeline events loaded: ${snapshot.docs.length}`);
            
            const timelineEvents: TimelineEvent[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as TimelineEvent));
            
            setEvents(timelineEvents);
            setIsLoading(false);
            setError(null);
          },
          (error) => {
            console.error('❌ Timeline listener error:', error);
            setError(`Fehler beim Laden der Timeline: ${error.message}`);
            setIsLoading(false);
            
            // Fallback: Set empty events to prevent blank page
            setEvents([]);
          }
        );
        
      } catch (error: any) {
        console.error('❌ Timeline setup error:', error);
        setError(`Timeline konnte nicht geladen werden: ${error.message}`);
        setIsLoading(false);
        
        // Fallback: Set empty events to prevent blank page
        setEvents([]);
      }
    };
    
    loadEvents();
    
    return () => {
      if (unsubscribe) {
        console.log('🧹 Cleaning up timeline listener');
        unsubscribe();
      }
    };
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      customEventName: '',
      date: '',
      description: '',
      location: '',
      type: 'other'
    });
    setSelectedFiles([]);
    setShowAddForm(false);
    setEditingEvent(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB limit
      
      if (!isValidType) {
        alert(`${file.name} ist kein gültiger Dateityp. Nur Bilder und Videos sind erlaubt.`);
        return false;
      }
      
      if (!isValidSize) {
        alert(`${file.name} ist zu groß. Maximale Dateigröße: 100MB.`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<{ urls: string[], types: string[], fileNames: string[] }> => {
    const urls: string[] = [];
    const types: string[] = [];
    const fileNames: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `TIMELINE_${Date.now()}-${i}-${file.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`);
      
      try {
        console.log(`📤 Uploading timeline file: ${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        urls.push(url);
        types.push(file.type.startsWith('video/') ? 'video' : 'image');
        fileNames.push(fileName);
        
        setUploadProgress(((i + 1) / files.length) * 100);
        console.log(`✅ Timeline file uploaded successfully: ${fileName}`);
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        throw new Error(`Fehler beim Hochladen von ${file.name}: ${error.message || 'Unbekannter Fehler'}`);
      }
    }
    
    return { urls, types, fileNames };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.date) {
      setError('Bitte fülle mindestens Titel und Datum aus.');
      return;
    }

    if (formData.type === 'custom' && !formData.customEventName.trim()) {
      setError('Bitte gib einen Namen für dein eigenes Event ein.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('💾 === SAVING TIMELINE EVENT ===');
      console.log('Event data:', formData);
      console.log('Selected files:', selectedFiles.length);
      
      let mediaData = {};
      
      // Upload new files if any
      if (selectedFiles.length > 0) {
        console.log('📤 Uploading timeline media files...');
        const { urls, types, fileNames } = await uploadFiles(selectedFiles);
        mediaData = {
          mediaUrls: urls,
          mediaTypes: types,
          mediaFileNames: fileNames
        };
        console.log('✅ Media files uploaded successfully');
      }

      const eventData = {
        title: formData.title.trim(),
        ...(formData.type === 'custom' && { customEventName: formData.customEventName.trim() }),
        date: formData.date,
        description: formData.description.trim(),
        location: formData.location.trim(),
        type: formData.type,
        ...mediaData
      };

      if (editingEvent) {
        // Update existing event
        console.log('📝 Updating existing timeline event...');
        await updateDoc(doc(db, 'timeline', editingEvent.id), eventData);
        console.log('✅ Timeline event updated successfully');
      } else {
        // Add new event
        console.log('➕ Adding new timeline event...');
        await addDoc(collection(db, 'timeline'), {
          ...eventData,
          createdBy: userName,
          createdAt: new Date().toISOString()
        });
        console.log('✅ Timeline event added successfully');
      }
      
      resetForm();
    } catch (error: any) {
      console.error('❌ Error saving timeline event:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Fehler beim Speichern des Events. Bitte versuche es erneut.';
      
      if (error.message?.includes('storage/unauthorized') || error.message?.includes('permission')) {
        errorMessage = 'Keine Berechtigung zum Hochladen. Lade die Seite neu und versuche es erneut.';
      } else if (error.message?.includes('storage/quota-exceeded')) {
        errorMessage = 'Speicherplatz voll. Bitte kontaktiere Kristin oder Maurizio.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Netzwerkfehler. Prüfe deine Internetverbindung und versuche es erneut.';
      } else if (error.message) {
        errorMessage = `Fehler: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (event: TimelineEvent) => {
    setFormData({
      title: event.title,
      customEventName: event.customEventName || '',
      date: event.date,
      description: event.description,
      location: event.location || '',
      type: event.type
    });
    setEditingEvent(event);
    setShowAddForm(true);
    setError(null);
  };

  const handleDelete = async (event: TimelineEvent) => {
    if (!window.confirm(`Event "${event.title}" wirklich löschen?`)) {
      return;
    }

    try {
      console.log('🗑️ === DELETING TIMELINE EVENT ===');
      console.log('Event:', event.title);
      console.log('Media files:', event.mediaFileNames?.length || 0);
      
      // Delete media files from storage
      if (event.mediaFileNames && event.mediaFileNames.length > 0) {
        console.log('🗑️ Deleting media files from storage...');
        const deletePromises = event.mediaFileNames.map(fileName => {
          const storageRef = ref(storage, `uploads/${fileName}`);
          return deleteObject(storageRef).catch(error => {
            console.warn(`⚠️ Could not delete file ${fileName}:`, error);
          });
        });
        await Promise.all(deletePromises);
        console.log('✅ Media files deleted from storage');
      }

      // Delete event from Firestore
      console.log('🗑️ Deleting event from Firestore...');
      await deleteDoc(doc(db, 'timeline', event.id));
      console.log('✅ Timeline event deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting timeline event:', error);
      setError(`Fehler beim Löschen des Events: ${error.message}`);
    }
  };

  const getEventTypeInfo = (type: string, customEventName?: string) => {
    if (type === 'custom' && customEventName) {
      return {
        value: 'custom',
        label: `✨ ${customEventName}`,
        icon: '✨',
        color: 'indigo'
      };
    }
    return eventTypes.find(t => t.value === type) || eventTypes[eventTypes.length - 1];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show error state instead of blank page
  if (error && !showAddForm) {
    return (
      <div className={`transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-pink-600' : 'bg-pink-500'
              }`}>
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  💕 Unsere Geschichte
                </h2>
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Die wichtigsten Momente unserer Beziehung mit Fotos & Videos
                </p>
              </div>
            </div>
            
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                    : 'bg-pink-500 hover:bg-pink-600 text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                Event hinzufügen
              </button>
            )}
          </div>
        </div>
        
        {/* Error Display */}
        <div className="p-6">
          <div className={`p-6 rounded-xl border text-center transition-colors duration-300 ${
            isDarkMode ? 'bg-red-900/20 border-red-700/30' : 'bg-red-50 border-red-200'
          }`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <Heart className={`w-8 h-8 transition-colors duration-300 ${
                isDarkMode ? 'text-red-400' : 'text-red-500'
              }`} />
            </div>
            <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              Fehler beim Laden der Timeline
            </h3>
            <p className={`mb-6 transition-colors duration-300 ${
              isDarkMode ? 'text-red-200' : 'text-red-600'
            }`}>
              {error}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Seite neu laden
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'
                  }`}
                >
                  Event hinzufügen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Modal für Medienanzeige */}
      {modalMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setModalMedia(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-xl shadow-lg flex flex-col items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
              onClick={() => setModalMedia(null)}
              aria-label="Schließen"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full flex flex-col items-center justify-center">
             {modalMedia.type === 'image' ? (
  <img
    src={modalMedia.url}
    alt={modalMedia.title}
    className="max-h-[70vh] max-w-full rounded-lg object-contain border border-gray-200"
  />
) : (
  <video
    src={modalMedia.url}
    controls
    autoPlay
    className="max-h-[70vh] max-w-full rounded-lg object-contain border border-gray-200"
  />
)}
              <div className="mt-2 text-center text-sm text-gray-700">
                {modalMedia.title}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className={`p-6 border-b transition-colors duration-300 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full transition-colors duration-300 ${
              isDarkMode ? 'bg-pink-600' : 'bg-pink-500'
            }`}>
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                💕 Unsere Geschichte
              </h2>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Die wichtigsten Momente unserer Beziehung mit Fotos & Videos
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                isDarkMode 
                  ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                  : 'bg-pink-500 hover:bg-pink-600 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              Event hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {editingEvent ? 'Event bearbeiten' : 'Neues Event hinzufügen'}
              </h3>
              <button
                onClick={resetForm}
                disabled={isUploading}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isUploading 
                    ? 'cursor-not-allowed opacity-50'
                    : isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className={`mb-4 p-3 rounded-lg border transition-colors duration-300 ${
                isDarkMode ? 'bg-red-900/20 border-red-700/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Event Type */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Event-Typ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TimelineEvent['type'] })}
                  disabled={isUploading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Event Name */}
              {formData.type === 'custom' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Event-Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customEventName}
                    onChange={(e) => setFormData({ ...formData, customEventName: e.target.value })}
                    placeholder="z.B. Unser erster Hund, Hauseinweihung, ..."
                    disabled={isUploading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    required={formData.type === 'custom'}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="z.B. Unser erstes Date"
                  disabled={isUploading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Datum *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={isUploading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Ort
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="z.B. Restaurant Zur Sonne"
                  disabled={isUploading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Erzähle von diesem besonderen Moment..."
                  rows={3}
                  disabled={isUploading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Fotos & Videos
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-all duration-300 ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode
                        ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span>Fotos & Videos hinzufügen</span>
                </button>
                
                <p className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Unterstützte Formate: JPG, PNG, GIF, MP4, WebM • Max. 100MB pro Datei
                </p>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Ausgewählte Dateien ({selectedFiles.length}):
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className={`flex items-center justify-between p-2 rounded border transition-colors duration-300 ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {file.type.startsWith('video/') ? (
                              <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Image className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className={`text-sm truncate transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {file.name}
                              </p>
                              <p className={`text-xs transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                            className={`p-1 rounded transition-colors duration-300 ${
                              isUploading
                                ? 'cursor-not-allowed opacity-50'
                                : isDarkMode
                                  ? 'hover:bg-gray-600 text-red-400'
                                  : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className={`p-4 rounded-lg transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Event wird gespeichert...
                    </span>
                  </div>
                  {uploadProgress > 0 && (
                    <div className={`w-full h-2 rounded-full overflow-hidden transition-colors duration-300 ${
                      isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      <div 
                        className="h-full bg-pink-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isUploading}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors duration-300 ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode 
                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50 bg-gray-400'
                      : 'bg-pink-600 hover:bg-pink-700'
                  } text-white`}
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingEvent ? 'Speichern' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="p-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <Heart className={`w-8 h-8 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </div>
            <h3 className={`text-xl font-light mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Noch keine Events
            </h3>
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {isAdmin ? 'Füge das erste Event eurer Liebesgeschichte hinzu!' : 'Die Timeline wird bald mit besonderen Momenten gefüllt.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className={`mt-4 px-6 py-3 rounded-xl transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                    : 'bg-pink-500 hover:bg-pink-600 text-white'
                }`}
              >
                Erstes Event hinzufügen
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className={`absolute left-8 top-0 bottom-0 w-0.5 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
            }`}></div>

            {/* Timeline Events */}
            <div className="space-y-8">
              {events.map((event, index) => {
                const eventType = getEventTypeInfo(event.type, event.customEventName);
                const canEdit = isAdmin || event.createdBy === userName;

                return (
                  <div key={event.id} className="relative flex items-start gap-6">
                    {/* Timeline Dot */}
                    <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors duration-300 ${
                      eventType.color === 'pink' ? 'bg-pink-500' :
                      eventType.color === 'red' ? 'bg-red-500' :
                      eventType.color === 'blue' ? 'bg-blue-500' :
                      eventType.color === 'green' ? 'bg-green-500' :
                      eventType.color === 'yellow' ? 'bg-yellow-500' :
                      eventType.color === 'purple' ? 'bg-purple-500' :
                      eventType.color === 'indigo' ? 'bg-indigo-500' :
                      isDarkMode ? 'bg-gray-600' : 'bg-gray-400'
                    }`}>
                      {eventType.icon}
                    </div>

                    {/* Event Content */}
                    <div className={`flex-1 p-6 rounded-xl transition-colors duration-300 ${
                      isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <div className={`flex items-center gap-1 transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(event.date)}</span>
                            </div>
                            {event.location && (
                              <div className={`flex items-center gap-1 transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(event)}
                              className={`p-2 rounded-full transition-colors duration-300 ${
                                isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                              }`}
                              title="Event bearbeiten"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(event)}
                              className={`p-2 rounded-full transition-colors duration-300 ${
                                isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-50 text-red-600'
                              }`}
                              title="Event löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className={`text-sm leading-relaxed mb-4 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {event.description}
                        </p>
                      )}

                      {/* Media Gallery */}
                      {event.mediaUrls && event.mediaUrls.length > 0 && (
                        <div className="mb-4">
                          <div className={`grid gap-2 ${
                            event.mediaUrls.length === 1 ? 'grid-cols-1' :
                            event.mediaUrls.length === 2 ? 'grid-cols-2' :
                            'grid-cols-2 md:grid-cols-3'
                          }`}>
                            {event.mediaUrls.map((url, mediaIndex) => {
                              const mediaType = event.mediaTypes?.[mediaIndex] || 'image';
                              
                              return (
                                <div key={mediaIndex} className="relative aspect-square rounded-lg overflow-hidden group">
                                  {mediaType === 'video' ? (
                                    <video
                                      src={url}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={() => setModalMedia({ url, type: 'video', title: event.title })}
                                      preload="metadata"
                                    />
                                  ) : (
                                    <img
                                      src={url}
                                      alt={`${event.title} - Bild ${mediaIndex + 1}`}
                                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                      onClick={() => setModalMedia({ url, type: 'image', title: event.title })}
                                    />
                                  )}
                                  
                                  {/* Media type indicator */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="bg-black/60 rounded-full p-1">
                                      {mediaType === 'video' ? (
                                        <Video className="w-3 h-3 text-white" />
                                      ) : (
                                        <Camera className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {event.mediaUrls.length > 3 && (
                            <p className={`text-xs mt-2 transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {event.mediaUrls.length} Medien • Klicke zum Vergrößern
                            </p>
                          )}
                        </div>
                      )}

                      {/* Event metadata */}
                      <div className={`pt-3 border-t flex items-center justify-between text-xs transition-colors duration-300 ${
                        isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span>{eventType.label}</span>
                          {event.mediaUrls && event.mediaUrls.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {event.mediaUrls.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
