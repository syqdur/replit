import React, { useState, useEffect } from 'react';
import { Music, Search, X, Plus, Trash2, ExternalLink, AlertCircle, RefreshCw, Clock, Heart, Play, Volume2, Check, CheckSquare, Square, Zap, Wifi, Activity } from 'lucide-react';
import { 
  searchTracks, 
  addTrackToPlaylist, 
  removeTrackFromPlaylist,
  getSelectedPlaylist,
  getPlaylistTracks,
  isSpotifyConnected,
  getCurrentUser,
  subscribeToPlaylistUpdates,
  bulkRemoveTracksFromPlaylist,
  getCurrentSnapshotId,
  getPendingOperationsCount
} from '../services/spotifyService';
import { SpotifyTrack } from '../types';

interface MusicWishlistProps {
  isDarkMode: boolean;
}

export const MusicWishlist: React.FC<MusicWishlistProps> = ({ isDarkMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyApi.PlaylistTrackObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpotifyAvailable, setIsSpotifyAvailable] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string; playlistId: string } | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState<string | null>(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState<string | null>(null);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<SpotifyApi.CurrentUsersProfileResponse | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'syncing' | 'error'>('connecting');
  const [operationCount, setOperationCount] = useState(0);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);

  // 🚀 NEW: Snapshot-based optimistic updates with perfect sync
  useEffect(() => {
    if (!selectedPlaylist || !isSpotifyAvailable) return;

    console.log('🚀 === SETTING UP SNAPSHOT-BASED SYNC ===');
    console.log('Playlist:', selectedPlaylist.name);
    
    setSyncStatus('connecting');

    // Subscribe to snapshot-based optimistic updates
    const unsubscribe = subscribeToPlaylistUpdates(
      selectedPlaylist.playlistId,
      (tracks) => {
        console.log('🚀 === SNAPSHOT UPDATE RECEIVED ===');
        console.log('Tracks:', tracks.length);
        
        const currentSnapshot = getCurrentSnapshotId();
        const pendingOps = getPendingOperationsCount();
        
        console.log('Current Snapshot:', currentSnapshot);
        console.log('Pending Operations:', pendingOps);
        
        setPlaylistTracks(tracks);
        setLastUpdate(new Date());
        setSnapshotId(currentSnapshot);
        setOperationCount(pendingOps);
        
        // Update sync status based on pending operations
        if (pendingOps > 0) {
          setSyncStatus('syncing');
        } else {
          setSyncStatus('live');
        }
      }
    );

    // Set status to live after initial load
    setTimeout(() => {
      const pendingOps = getPendingOperationsCount();
      setSyncStatus(pendingOps > 0 ? 'syncing' : 'live');
    }, 1000);

    return () => {
      console.log('🚀 Cleaning up snapshot-based sync');
      unsubscribe();
    };
  }, [selectedPlaylist, isSpotifyAvailable]);

  // Check if Spotify is connected and load playlist tracks
  useEffect(() => {
    const checkSpotify = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if Spotify is connected
        const connected = await isSpotifyConnected();
        setIsSpotifyAvailable(connected);
        
        if (connected) {
          // Get current user
          const user = await getCurrentUser();
          setCurrentUser(user);
          
          // Check if user is admin (simplified check - in a real app, you'd have a proper admin check)
          // For now, we'll assume any authenticated user is an admin
          setIsAdmin(!!user);
          
          // Get selected playlist
          const playlist = await getSelectedPlaylist();
          setSelectedPlaylist(playlist);
          
          if (playlist) {
            try {
              // Load initial playlist tracks (this will trigger snapshot tracking)
              const tracks = await getPlaylistTracks(playlist.playlistId);
              setPlaylistTracks(tracks);
              setLastUpdate(new Date());
              
              // Get initial snapshot ID
              const currentSnapshot = getCurrentSnapshotId();
              setSnapshotId(currentSnapshot);
              
              console.log('✅ Initial playlist loaded with snapshot tracking');
              
            } catch (playlistError) {
              console.error('Failed to load playlist tracks:', playlistError);
              setError('Failed to load playlist tracks. The playlist may no longer exist or you may not have access to it.');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check Spotify:', error);
        setError('Failed to load Spotify data');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSpotify();
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || !isSpotifyAvailable) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      
      try {
        const results = await searchTracks(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search tracks');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isSpotifyAvailable]);

  // 🚀 ENHANCED: Add track with instant UI feedback and snapshot tracking
  const handleAddTrack = async (track: SpotifyTrack) => {
    if (isAddingTrack) return;
    
    setIsAddingTrack(track.id);
    setError(null);
    setSyncStatus('syncing');
    
    try {
      console.log('🚀 === INSTANT ADD WITH SNAPSHOT TRACKING ===');
      console.log('Track:', track.name, 'by', track.artists.map(a => a.name).join(', '));
      console.log('Current Snapshot:', snapshotId);
      
      // Add track to playlist (optimistic update + snapshot tracking happens inside the service)
      await addTrackToPlaylist(track.uri);
      
      // Show success message
      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
      
      console.log('✅ Track added with instant UI update and snapshot tracking');
      
    } catch (error) {
      console.error('Failed to add track:', error);
      setError('Failed to add track to playlist: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsAddingTrack(null);
    }
  };

  // 🚀 ENHANCED: Remove track with instant UI feedback and snapshot tracking
  const handleRemoveTrack = async (track: SpotifyApi.PlaylistTrackObject) => {
    if (isRemovingTrack) return;
    
    if (!confirm(`Remove "${track.track.name}" from the playlist?`)) {
      return;
    }
    
    setIsRemovingTrack(track.track.id);
    setError(null);
    setSyncStatus('syncing');
    
    try {
      console.log('🚀 === INSTANT REMOVE WITH SNAPSHOT TRACKING ===');
      console.log('Track:', track.track.name);
      console.log('Current Snapshot:', snapshotId);
      
      // Remove track from playlist (optimistic update + snapshot tracking happens inside the service)
      await removeTrackFromPlaylist(track.track.uri);
      
      console.log('✅ Track removed with instant UI update and snapshot tracking');
      
    } catch (error) {
      console.error('Failed to remove track:', error);
      setError('Failed to remove track from playlist: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsRemovingTrack(null);
    }
  };

  // Toggle track selection for bulk delete
  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(trackId)) {
        newSelection.delete(trackId);
      } else {
        newSelection.add(trackId);
      }
      return newSelection;
    });
  };

  // Select all tracks
  const selectAllTracks = () => {
    // If admin, select all tracks
    // If regular user, only select tracks added by the user
    const trackIds = playlistTracks
      .filter(item => isAdmin || (currentUser && item.added_by.id === currentUser.id))
      .map(item => item.track.id);
    
    setSelectedTracks(new Set(trackIds));
  };

  // Deselect all tracks
  const deselectAllTracks = () => {
    setSelectedTracks(new Set());
  };

  // 🚀 ENHANCED: Bulk delete with instant sync and snapshot tracking
  const handleBulkDelete = async () => {
    if (selectedTracks.size === 0) {
      alert('Keine Songs ausgewählt.');
      return;
    }
    
    // Filter tracks that can be deleted
    const tracksToDelete = playlistTracks.filter(item => 
      selectedTracks.has(item.track.id) && 
      (isAdmin || (currentUser && item.added_by.id === currentUser.id))
    );
    
    if (tracksToDelete.length === 0) {
      alert('Keine der ausgewählten Songs können gelöscht werden.');
      return;
    }
    
    const confirmMessage = `${tracksToDelete.length} Song${tracksToDelete.length > 1 ? 's' : ''} wirklich löschen?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsBulkDeleting(true);
    setError(null);
    setSyncStatus('syncing');
    
    try {
      console.log(`🚀 === INSTANT BULK DELETE WITH SNAPSHOT TRACKING ===`);
      console.log(`Deleting ${tracksToDelete.length} tracks...`);
      console.log('Current Snapshot:', snapshotId);
      
      // Extract URIs for bulk deletion
      const trackUris = tracksToDelete.map(track => track.track.uri);
      
      // Bulk delete with instant UI updates and snapshot tracking (happens inside the service)
      await bulkRemoveTracksFromPlaylist(trackUris);
      
      // Reset selection
      setSelectedTracks(new Set());
      setBulkDeleteMode(false);
      
      alert(`${tracksToDelete.length} Song${tracksToDelete.length > 1 ? 's' : ''} erfolgreich gelöscht!`);
      
      console.log('✅ Bulk delete completed with instant UI updates and snapshot tracking');
      
    } catch (error) {
      console.error('Failed to bulk delete tracks:', error);
      setError('Failed to delete some tracks: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // 🚀 ENHANCED: Manual refresh (now just forces fresh data load)
  const handleRefresh = async () => {
    if (!selectedPlaylist) return;
    
    setIsLoading(true);
    setError(null);
    setSyncStatus('syncing');
    
    try {
      console.log('🔄 === MANUAL REFRESH WITH SNAPSHOT ===');
      console.log('Current Snapshot:', snapshotId);
      
      // Force fresh data load with snapshot tracking
      const tracks = await getPlaylistTracks(selectedPlaylist.playlistId);
      setPlaylistTracks(tracks);
      setLastUpdate(new Date());
      
      // Update snapshot ID
      const currentSnapshot = getCurrentSnapshotId();
      setSnapshotId(currentSnapshot);
      
      setSyncStatus('live');
      
      console.log('✅ Manual refresh completed with snapshot tracking');
      console.log('New Snapshot:', currentSnapshot);
      
    } catch (error) {
      console.error('Failed to refresh tracks:', error);
      setError('Failed to refresh playlist tracks: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Check if user can delete a track
  const canDeleteTrack = (track: SpotifyApi.PlaylistTrackObject) => {
    return isAdmin || (currentUser && track.added_by.id === currentUser.id);
  };

  // Count deletable tracks
  const getDeletableTracksCount = () => {
    return playlistTracks.filter(item => 
      isAdmin || (currentUser && item.added_by.id === currentUser.id)
    ).length;
  };

  if (!isSpotifyAvailable) {
    return (
      <div className={`p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
              alt="Spotify Logo"
              className="w-full h-full"
            />
          </div>
          
          <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Spotify nicht verbunden
          </h3>
          
          <p className={`text-sm mb-6 max-w-md mx-auto transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst ein Spotify-Konto verbinden und eine Playlist auswählen, bevor Musikwünsche möglich sind.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPlaylist) {
    return (
      <div className={`p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
              alt="Spotify Logo"
              className="w-full h-full"
            />
          </div>
          
          <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Keine Playlist ausgewählt
          </h3>
          
          <p className={`text-sm mb-6 max-w-md mx-auto transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst eine Playlist auswählen, bevor Musikwünsche möglich sind.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header with gradient */}
      <div className={`bg-gradient-to-b ${
        isDarkMode 
          ? 'from-[#1DB954]/80 to-transparent' 
          : 'from-[#1DB954] to-transparent'
      } pt-6 pb-12 px-6`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 shadow-lg rounded-md overflow-hidden">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
                alt="Spotify Logo"
                className="w-full h-full bg-[#1DB954] p-2"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white opacity-90">Playlist</p>
              <h3 className="text-2xl font-bold text-white">
                {selectedPlaylist.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-white opacity-80">
                  {playlistTracks.length} Songs • Hochzeits-Playlist
                </p>
                {/* 🚀 NEW: Enhanced sync indicator with snapshot info */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  syncStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-200' :
                  syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-200' :
                  syncStatus === 'live' ? 'bg-green-500/20 text-green-200' :
                  'bg-red-500/20 text-red-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    syncStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                    syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' :
                    syncStatus === 'live' ? 'bg-green-400 animate-pulse' :
                    'bg-red-400'
                  }`}></div>
                  <span>
                    {syncStatus === 'connecting' ? 'Verbinde...' :
                     syncStatus === 'syncing' ? 'Sync...' :
                     syncStatus === 'live' ? 'Live' :
                     'Fehler'}
                  </span>
                  {syncStatus === 'live' && <Activity className="w-3 h-3" />}
                </div>
              </div>
            </div>
          </div>
          <a
            href={`https://open.spotify.com/playlist/${selectedPlaylist.playlistId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[#1DB954] text-white hover:bg-opacity-80 transition-colors"
            title="In Spotify öffnen"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {/* Search Section */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Songs oder Interpreten..."
            className="w-full pl-10 pr-10 py-3 bg-white bg-opacity-90 border border-gray-200 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {showAddSuccess && (
        <div className={`mx-6 mb-4 p-3 rounded-lg ${
          isDarkMode 
            ? 'bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954]' 
            : 'bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954]'
        }`}>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-[#1DB954]">
              <Check className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-medium">
              Song sofort hinzugefügt! 🚀 Snapshot-Sync aktiv
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={`mx-6 mb-4 p-3 rounded-lg ${
          isDarkMode 
            ? 'bg-red-900/20 border border-red-700/30 text-red-400' 
            : 'bg-red-100 border border-red-300 text-red-600'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="px-6 -mt-6">
        {/* Search Results */}
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="mb-8">
            <h4 className={`text-lg font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Suchergebnisse
            </h4>
            <div className="space-y-2">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  className={`p-3 rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-3 ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    {track.album?.images?.[0] ? (
                      <img 
                        src={track.album.images[0].url} 
                        alt={track.album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`font-medium truncate ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      {track.name}
                    </h5>
                    <p className={`text-xs truncate ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {track.artists.map(a => a.name).join(', ')}
                      {track.album && ` • ${track.album.name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddTrack(track)}
                    disabled={isAddingTrack === track.id}
                    className="p-2 rounded-full bg-[#1DB954] text-white hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sofort zur Playlist hinzufügen"
                  >
                    {isAddingTrack === track.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : searchQuery ? (
          <div className={`text-center py-8 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Music className="w-12 h-12 mx-auto mb-3" />
            <p>
              Keine Ergebnisse für "{searchQuery}" gefunden
            </p>
          </div>
        ) : null}

        {/* Playlist Tracks */}
        <div className="pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h4 className={`text-lg font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Playlist Songs
              </h4>
              
              {/* 🚀 NEW: Enhanced sync status with snapshot and operation info */}
              <div className={`flex items-center gap-2 text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  syncStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                  syncStatus === 'live' ? 'bg-green-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <span>
                  {syncStatus === 'connecting' ? 'Verbinde...' :
                   syncStatus === 'syncing' ? 'Synchronisiert...' :
                   syncStatus === 'live' ? '🚀 Snapshot-Sync' :
                   'Sync-Fehler'}
                </span>
                <span>•</span>
                <span>Update: {lastUpdate.toLocaleTimeString('de-DE')}</span>
                {operationCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500 font-medium">{operationCount} Pending</span>
                  </>
                )}
                {snapshotId && (
                  <>
                    <span>•</span>
                    <span className="text-green-500 font-mono text-xs">#{snapshotId.slice(-6)}</span>
                  </>
                )}
              </div>
              
              {/* Bulk Delete Controls */}
              {getDeletableTracksCount() > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBulkDeleteMode(!bulkDeleteMode)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      bulkDeleteMode
                        ? 'bg-red-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {bulkDeleteMode ? 'Auswahl beenden' : 'Mehrere löschen'}
                  </button>
                  
                  {bulkDeleteMode && (
                    <>
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {selectedTracks.size} von {getDeletableTracksCount()} ausgewählt
                      </span>
                      
                      <button
                        onClick={selectAllTracks}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          isDarkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        Alle
                      </button>
                      
                      <button
                        onClick={deselectAllTracks}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Keine
                      </button>
                      
                      {selectedTracks.size > 0 && (
                        <button
                          onClick={handleBulkDelete}
                          disabled={isBulkDeleting}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                        >
                          {isBulkDeleting ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          {selectedTracks.size} sofort löschen
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={`p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Playlist manuell aktualisieren"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Table Header */}
          <div className={`grid ${bulkDeleteMode ? 'grid-cols-[auto_1fr_auto_auto]' : 'grid-cols-[16px_1fr_auto_auto]'} gap-4 px-4 py-2 border-b text-xs font-medium uppercase ${
            isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
          }`}>
            {bulkDeleteMode ? <div></div> : <div>#</div>}
            <div>Titel</div>
            <div>Hinzugefügt am</div>
            <div className="flex justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : playlistTracks.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              <div className="space-y-1 mt-2">
                {playlistTracks.map((item, index) => {
                  const isSelected = selectedTracks.has(item.track.id);
                  const canDelete = canDeleteTrack(item);
                  const showCheckbox = bulkDeleteMode && canDelete;
                  
                  return (
                    <div
                      key={`${item.track.id}-${item.added_at}`}
                      className={`grid ${bulkDeleteMode ? 'grid-cols-[auto_1fr_auto_auto]' : 'grid-cols-[16px_1fr_auto_auto]'} gap-4 px-4 py-2 rounded-md items-center group ${
                        isDarkMode 
                          ? `hover:bg-gray-800 text-white ${isSelected ? 'bg-gray-800 ring-1 ring-[#1DB954]' : ''}` 
                          : `hover:bg-gray-100 text-gray-800 ${isSelected ? 'bg-gray-100 ring-1 ring-[#1DB954]' : ''}`
                      }`}
                    >
                      {bulkDeleteMode ? (
                        <div>
                          {showCheckbox && (
                            <button
                              onClick={() => toggleTrackSelection(item.track.id)}
                              className={`p-1 rounded transition-colors ${
                                isSelected
                                  ? 'text-[#1DB954]'
                                  : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{index + 1}</div>
                      )}
                      
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.track.album?.images?.[0] ? (
                            <img 
                              src={item.track.album.images[0].url} 
                              alt={item.track.album.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-medium truncate">
                            {item.track.name}
                          </h5>
                          <p className={`text-xs truncate ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {item.track.artists.map(a => a.name).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatDate(item.added_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatDuration(item.track.duration_ms)}
                        </span>
                        {!bulkDeleteMode && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canDelete && (
                              <button
                                onClick={() => handleRemoveTrack(item)}
                                disabled={isRemovingTrack === item.track.id}
                                className={`p-1.5 rounded-full transition-colors ${
                                  isDarkMode 
                                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                }`}
                                title="Sofort aus Playlist entfernen"
                              >
                                {isRemovingTrack === item.track.id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <a
                              href={item.track.external_urls.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-full transition-colors ${
                                isDarkMode 
                                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                              }`}
                              title="In Spotify öffnen"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`text-center py-12 rounded-lg mt-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm'
            }`}>
              <Music className={`w-12 h-12 mx-auto mb-3 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Keine Songs in der Playlist
              </p>
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Suche nach Songs und füge sie zur Playlist hinzu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};