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
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpotifyAvailable, setIsSpotifyAvailable] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string; playlistId: string } | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState<string | null>(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState<string | null>(null);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [songOwnerships, setSongOwnerships] = useState<SongOwnership[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'syncing' | 'error'>('connecting');
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState<(() => void) | null>(null);

  // Update admin state when prop changes
  useEffect(() => {
    setIsAdmin(adminProp);
  }, [adminProp]);

  // Check Spotify availability and load data
  useEffect(() => {
    const checkSpotify = async () => {
      try {
        setIsLoading(true);
        setSyncStatus('connecting');

        const connected = await isSpotifyConnected();
        setIsSpotifyAvailable(connected);

        if (connected) {
          try {
            const user = await getCurrentUser();
            setCurrentUser(user);
          } catch (userError) {
            console.log('Could not get current user:', userError);
          }

          const playlist = await getSelectedPlaylist();
          if (playlist) {
            setSelectedPlaylist(playlist);

            try {
              const cleanup = subscribeToPlaylistUpdates(playlist.playlistId, (tracks) => {
                setPlaylistTracks(tracks);
                setLastUpdate(new Date());
                setSyncStatus('live');
                setPendingOperations(getPendingOperationsCount());
                const currentSnapshot = getCurrentSnapshotId();
                setSnapshotId(currentSnapshot);
              });

              setUnsubscribeSnapshot(() => cleanup);
              await loadSongOwnerships();
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

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
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

  // Song ownership management
  const loadSongOwnerships = async () => {
    if (!selectedPlaylist) return;

    try {
      console.log('📋 === LOADING SONG OWNERSHIPS ===');
      console.log('Playlist ID:', selectedPlaylist.playlistId);

      const q = query(
        collection(db, 'songOwnerships'),
        where('playlistId', '==', selectedPlaylist.playlistId)
      );
      const querySnapshot = await getDocs(q);
      const ownerships: SongOwnership[] = [];

      querySnapshot.forEach((doc) => {
        ownerships.push({ id: doc.id, ...doc.data() } as SongOwnership);
      });

      console.log(`📋 Loaded ${ownerships.length} ownership records`);
      ownerships.forEach(o => console.log(`  - ${o.trackId} by ${o.addedByUser} (${o.addedByDeviceId?.slice(0, 8)}...)`));

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

  const handleAddTrack = async (track: SpotifyTrack) => {
    if (isAddingTrack) return;

    setIsAddingTrack(track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      await addTrackToPlaylist(track.uri);
      await trackSongOwnership(track.id, track.uri);

      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);

      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Failed to add track:', error);

      if (error.requiresReauth || (error.status === 403 && error.message?.includes('Insufficient'))) {
        setError('Spotify permissions insufficient. Please disconnect and reconnect to grant full access.');
      } else {
        setError('Failed to add track to playlist: ' + (error.message || 'Unknown error'));
      }

      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsAddingTrack(null);
    }
  };

  const handleRemoveTrack = async (track: any) => {
    if (isRemovingTrack) return;

    if (!confirm(`Remove "${track.track.name}" from the playlist?`)) {
      return;
    }

    setIsRemovingTrack(track.track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      await removeTrackFromPlaylist(track.track.uri);
      await removeSongOwnership(track.track.id);
    } catch (error: any) {
      console.error('Failed to remove track:', error);
      setError('Failed to remove track from playlist: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsRemovingTrack(null);
    }
  };

  // Check if user can delete a track
  const canDeleteTrack = (track: any) => {
    if (isAdmin) {
      console.log(`✅ Admin can delete "${track.track.name}"`);
      return true;
    }

    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();

    console.log(`🔍 Checking delete permission for "${track.track.name}"`);
    console.log(`👤 Current user: ${currentUserName} (${currentDeviceId})`);

    if (!currentUserName) {
      console.log('❌ No username found');
      return false;
    }

    const ownership = songOwnerships.find(o => o.trackId === track.track.id);
    if (!ownership) {
      console.log('❌ No ownership record found');
      return false;
    }

    console.log(`🏷️ Track added by: ${ownership.addedByUser} (${ownership.addedByDeviceId})`);

    const canDelete = ownership.addedByUser === currentUserName && ownership.addedByDeviceId === currentDeviceId;
    console.log(`${canDelete ? '✅' : '❌'} Can delete: ${canDelete}`);

    return canDelete;
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isSpotifyAvailable) {
    return (
      <div className={`mx-4 my-6 p-6 rounded-lg border ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="text-center py-8">
          <div className={`w-16 h-16 mx-auto mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          
          <h3 className={`text-xl font-semibold mb-3 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Spotify nicht verbunden
          </h3>
          
          <p className={`text-sm ${
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
      <div className={`mx-4 my-6 p-6 rounded-lg border ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="text-center py-8">
          <div className={`w-16 h-16 mx-auto mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          
          <h3 className={`text-xl font-semibold mb-3 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Keine Playlist ausgewählt
          </h3>
          
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst eine Playlist für Musikwünsche auswählen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6">
      {/* Header */}
      <div className={`p-4 rounded-lg border mb-4 ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 p-2 rounded-lg ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
            }`}>
              <Music className={`w-full h-full ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {selectedPlaylist.name}
              </h3>
              <div className="flex items-center gap-2">
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {playlistTracks.length} Songs
                </p>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  syncStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                  syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700' :
                  syncStatus === 'live' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    syncStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                    syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' :
                    syncStatus === 'live' ? 'bg-green-400' :
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
            className={`p-2 rounded-lg ${
              isDarkMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            title="In Spotify öffnen"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Search Section */}
        <div className={`p-4 rounded-lg border mb-4 ${
          isDarkMode 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Songs..."
              className={`w-full pl-10 pr-10 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none ${
                isDarkMode 
                  ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-600' 
                  : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                  isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                }`}
              >
                <X className={`w-4 h-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {showAddSuccess && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-green-900/20 border border-green-500/30 text-green-400' 
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Song erfolgreich hinzugefügt!</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-red-900/20 border border-red-500/30 text-red-400' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 mb-4">
            {searchResults.map((track) => (
              <div key={track.id} className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-12 h-12 rounded"
                    />
                    <div>
                      <h4 className={`font-medium ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {track.name}
                      </h4>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {track.artists.map(artist => artist.name).join(', ')}
                      </p>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {formatDuration(track.duration_ms)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddTrack(track)}
                    disabled={isAddingTrack === track.id}
                    className={`p-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {isAddingTrack === track.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Playlist Tracks */}
        <div className="space-y-2">
          {playlistTracks.map((item) => (
            <div key={item.track.id} className={`p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={item.track.album.images[0]?.url}
                    alt={item.track.album.name}
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <h4 className={`font-medium ${
                      isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {item.track.name}
                    </h4>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {item.track.artists.map((artist: any) => artist.name).join(', ')}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {formatDuration(item.track.duration_ms)}
                    </p>
                  </div>
                </div>
                {canDeleteTrack(item) && (
                  <button
                    onClick={() => handleRemoveTrack(item)}
                    disabled={isRemovingTrack === item.track.id}
                    className={`p-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {isRemovingTrack === item.track.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {playlistTracks.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <Music className={`w-12 h-12 mx-auto mb-4 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Noch keine Songs in der Playlist
            </p>
          </div>
        )}
      </div>
    </div>
  );
};