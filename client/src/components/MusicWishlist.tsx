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
import { getUserName, getDeviceId } from '../utils/deviceId';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface MusicWishlistProps {
  isDarkMode: boolean;
  isAdmin?: boolean;
}

interface SongOwnership {
  id: string;
  trackId: string;
  spotifyTrackUri: string;
  addedByUser: string;
  addedByDeviceId: string;
  addedAt: string;
  playlistId: string;
}

export const MusicWishlist: React.FC<MusicWishlistProps> = ({ isDarkMode, isAdmin: adminProp = false }) => {
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
  const [songOwnerships, setSongOwnerships] = useState<SongOwnership[]>([]);
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
          
          // Use the admin prop from parent component instead of assuming all users are admins
          setIsAdmin(adminProp);
          
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
              
              // Load song ownerships for permission checking
              await loadSongOwnerships();
              
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
      
      // Track ownership for permission checking
      await trackSongOwnership(track.id, track.uri);
      
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
      
      // Remove ownership tracking
      await removeSongOwnership(track.track.id);
      
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
      .filter(item => canDeleteTrack(item))
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
      selectedTracks.has(item.track.id) && canDeleteTrack(item)
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
      
      // Remove ownership tracking for all deleted tracks
      for (const track of tracksToDelete) {
        await removeSongOwnership(track.track.id);
      }
      
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
      
      // Reload song ownerships
      await loadSongOwnerships();
      
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

  // Song ownership management
  const loadSongOwnerships = async () => {
    if (!selectedPlaylist) return;
    
    try {
      const q = query(
        collection(db, 'songOwnerships'),
        where('playlistId', '==', selectedPlaylist.playlistId)
      );
      const querySnapshot = await getDocs(q);
      const ownerships: SongOwnership[] = [];
      
      querySnapshot.forEach((doc) => {
        ownerships.push({ id: doc.id, ...doc.data() } as SongOwnership);
      });
      
      setSongOwnerships(ownerships);
    } catch (error) {
      console.error('Failed to load song ownerships:', error);
    }
  };

  const trackSongOwnership = async (trackId: string, spotifyTrackUri: string) => {
    if (!selectedPlaylist) return;
    
    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();
    
    if (!currentUserName) return;

    try {
      const ownership: Omit<SongOwnership, 'id'> = {
        trackId,
        spotifyTrackUri,
        addedByUser: currentUserName,
        addedByDeviceId: currentDeviceId,
        addedAt: new Date().toISOString(),
        playlistId: selectedPlaylist.playlistId
      };

      await addDoc(collection(db, 'songOwnerships'), ownership);
      
      // Update local state
      setSongOwnerships(prev => [...prev, { ...ownership, id: Date.now().toString() }]);
    } catch (error) {
      console.error('Failed to track song ownership:', error);
    }
  };

  const removeSongOwnership = async (trackId: string) => {
    try {
      const ownership = songOwnerships.find(o => o.trackId === trackId);
      if (ownership) {
        await deleteDoc(doc(db, 'songOwnerships', ownership.id));
        setSongOwnerships(prev => prev.filter(o => o.id !== ownership.id));
      }
    } catch (error) {
      console.error('Failed to remove song ownership:', error);
    }
  };

  // Check if user can delete a track based on wedding app user system
  const canDeleteTrack = (track: SpotifyApi.PlaylistTrackObject) => {
    if (isAdmin) return true;
    
    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();
    
    if (!currentUserName) return false;
    
    const ownership = songOwnerships.find(o => o.trackId === track.track.id);
    if (!ownership) return false; // If no ownership record, can't delete
    
    return ownership.addedByUser === currentUserName && ownership.addedByDeviceId === currentDeviceId;
  };

  // Count deletable tracks
  const getDeletableTracksCount = () => {
    return playlistTracks.filter(item => canDeleteTrack(item)).length;
  };

  if (!isSpotifyAvailable) {
    return (
      <div className={`mx-4 my-6 p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl shadow-2xl shadow-green-500/10' 
          : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl shadow-2xl shadow-green-500/10'
      }`}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl ${
            isDarkMode ? 'bg-green-500' : 'bg-green-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-[#1DB954]' : 'bg-green-400'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        
        <div className="relative z-10 text-center py-8">
          <div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
              alt="Spotify Logo"
              className="w-full h-full filter brightness-0 invert"
            />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent`}>
            Spotify nicht verbunden
          </h3>
          
          <p className={`text-sm max-w-md mx-auto leading-relaxed transition-colors duration-300 ${
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
      <div className={`mx-4 my-6 p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl shadow-2xl shadow-green-500/10' 
          : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl shadow-2xl shadow-green-500/10'
      }`}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl ${
            isDarkMode ? 'bg-green-500' : 'bg-green-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-[#1DB954]' : 'bg-green-400'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        
        <div className="relative z-10 text-center py-8">
          <div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
              alt="Spotify Logo"
              className="w-full h-full filter brightness-0 invert"
            />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent`}>
            Keine Playlist ausgewählt
          </h3>
          
          <p className={`text-sm max-w-md mx-auto leading-relaxed transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst eine Playlist auswählen, bevor Musikwünsche möglich sind.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-4 my-6 transition-colors duration-500`}>
      {/* Header with modern glassmorphism */}
      <div className={`p-6 rounded-3xl mb-6 transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-green-900/30 via-emerald-900/20 to-[#1DB954]/30 border border-green-500/30 backdrop-blur-xl shadow-2xl shadow-green-500/20' 
          : 'bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-green-100/80 border border-green-200/50 backdrop-blur-xl shadow-2xl shadow-green-500/20'
      }`}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl ${
            isDarkMode ? 'bg-[#1DB954]' : 'bg-green-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-emerald-500' : 'bg-emerald-300'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 p-3 rounded-2xl transition-all duration-300 ${
                isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
              }`}>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-full h-full transition-colors duration-300 ${
                    isDarkMode ? 'fill-green-400' : 'fill-green-600'
                  }`}
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.2.32-.623.42-.943.223-2.587-1.581-5.845-1.94-9.68-1.063-.414.094-.83-.156-.924-.57-.094-.414.156-.83.57-.924 4.195-.96 7.744-.546 10.633 1.223.32.2.42.623.223.943zm1.35-3.005c-.25.4-.781.525-1.181.275-2.96-1.82-7.473-2.349-10.98-1.285-.518.157-1.066-.132-1.223-.65-.157-.518.132-1.066.65-1.223 4.009-1.22 9.068-.643 12.459 1.477.4.25.525.781.275 1.181zm.116-3.129c-3.547-2.106-9.395-2.301-12.78-1.273-.622.189-1.278-.164-1.467-.786-.189-.622.164-1.278.786-1.467 3.876-1.178 10.44-.964 14.564 1.473.513.304.681 1.026.377 1.539-.304.513-1.026.681-1.539.377z"/>
                </svg>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>Playlist</p>
                <h3 className={`text-2xl font-bold bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent`}>
                  {selectedPlaylist.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {playlistTracks.length} Songs • Hochzeits-Playlist
                  </p>
                  <div className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-300 w-fit ${
                    syncStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                    syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                    syncStatus === 'live' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                    'bg-red-500/20 text-red-500 border border-red-500/30'
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
                  </div>
                </div>
              </div>
            </div>
            <a
              href={`https://open.spotify.com/playlist/${selectedPlaylist.playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                isDarkMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
              }`}
              title="In Spotify öffnen"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Search Section */}
        <div className={`relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl shadow-lg' 
            : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl shadow-lg'
        }`}>
          <div className="relative">
            <Search className={`absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Songs..."
              className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-0 transition-all duration-300 focus:ring-2 focus:ring-green-500/50 outline-none text-sm sm:text-base ${
                isDarkMode 
                  ? 'bg-gray-700/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                  : 'bg-white/80 text-gray-900 placeholder-gray-500 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 p-1 sm:p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                  isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                }`}
              >
                <X className={`w-3 h-3 sm:w-4 sm:h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Message - Mobile optimized */}
      {showAddSuccess && (
        <div className={`mx-4 sm:mx-6 mb-4 p-3 rounded-lg ${
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

      {/* Error Display - Mobile optimized */}
      {error && (
        <div className={`mx-4 sm:mx-6 mb-4 p-3 rounded-lg ${
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
      <div className="px-4 sm:px-6 -mt-4 sm:-mt-6">
        {/* Search Results */}
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="mb-6 sm:mb-8">
            <h4 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Suchergebnisse
            </h4>
            <div className="space-y-2">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  className={`p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-3 ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    {track.album?.images?.[0] ? (
                      <img 
                        src={track.album.images[0].url} 
                        alt={track.album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`font-medium truncate text-sm sm:text-base ${
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
                    className="p-2 rounded-full bg-[#1DB954] text-white hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="Sofort zur Playlist hinzufügen"
                  >
                    {isAddingTrack === track.id ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
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
        <div className="pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h4 className={`text-base sm:text-lg font-bold ${
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
                <div className="flex flex-wrap items-center gap-2">
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
                        {selectedTracks.size} von {getDeletableTracksCount()}
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
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">{selectedTracks.size} sofort löschen</span>
                          <span className="sm:hidden">Löschen</span>
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
          <div className={`grid ${bulkDeleteMode ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto]'} sm:${bulkDeleteMode ? 'grid-cols-[auto_1fr_auto_auto]' : 'grid-cols-[16px_1fr_auto_auto]'} gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b text-xs font-medium uppercase ${
            isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
          }`}>
            {bulkDeleteMode && <div className="hidden sm:block"></div>}
            {!bulkDeleteMode && <div className="hidden sm:block">#</div>}
            <div>Titel</div>
            <div className="hidden sm:block">Hinzugefügt am</div>
            <div className="flex justify-center">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : playlistTracks.length > 0 ? (
            <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              <div className="space-y-1 mt-2">
                {playlistTracks.map((item, index) => {
                  const isSelected = selectedTracks.has(item.track.id);
                  const canDelete = canDeleteTrack(item);
                  const showCheckbox = bulkDeleteMode && canDelete;
                  
                  return (
                    <div
                      key={`${item.track.id}-${item.added_at}`}
                      className={`grid ${bulkDeleteMode ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto]'} sm:${bulkDeleteMode ? 'grid-cols-[auto_1fr_auto_auto]' : 'grid-cols-[16px_1fr_auto_auto]'} gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md items-center group ${
                        isDarkMode 
                          ? `hover:bg-gray-800 text-white ${isSelected ? 'bg-gray-800 ring-1 ring-[#1DB954]' : ''}` 
                          : `hover:bg-gray-100 text-gray-800 ${isSelected ? 'bg-gray-100 ring-1 ring-[#1DB954]' : ''}`
                      }`}
                    >
                      {bulkDeleteMode && (
                        <div className="hidden sm:block">
                          {showCheckbox && (
                            <button
                              onClick={() => toggleTrackSelection(item.track.id)}
                              className={`p-1 rounded transition-colors ${
                                isSelected
                                  ? 'text-[#1DB954]'
                                  : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {isSelected ? <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" /> : <Square className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                          )}
                        </div>
                      )}
                      {!bulkDeleteMode && (
                        <div className={`text-sm hidden sm:block ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{index + 1}</div>
                      )}
                      
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {bulkDeleteMode && showCheckbox && (
                          <button
                            onClick={() => toggleTrackSelection(item.track.id)}
                            className={`p-1 rounded transition-colors sm:hidden ${
                              isSelected
                                ? 'text-[#1DB954]'
                                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        )}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.track.album?.images?.[0] ? (
                            <img 
                              src={item.track.album.images[0].url} 
                              alt={item.track.album.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-medium truncate text-sm sm:text-base">
                            {item.track.name}
                          </h5>
                          <p className={`text-xs truncate ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {item.track.artists.map(a => a.name).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className={`text-xs hidden sm:block ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatDate(item.added_at)}
                      </div>
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
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
                                className={`p-1 sm:p-1.5 rounded-full transition-colors ${
                                  isDarkMode 
                                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                }`}
                                title="Sofort aus Playlist entfernen"
                              >
                                {isRemovingTrack === item.track.id ? (
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                )}
                              </button>
                            )}
                            <a
                              href={item.track.external_urls.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1 sm:p-1.5 rounded-full transition-colors ${
                                isDarkMode 
                                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                              }`}
                              title="In Spotify öffnen"
                            >
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
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