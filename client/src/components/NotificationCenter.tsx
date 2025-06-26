import React, { useState, useEffect } from 'react';
import { Bell, X, Tag, Heart, MessageCircle, Check } from 'lucide-react';
import { notificationService, Notification } from '../services/notificationService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface NotificationCenterProps {
  userName: string;
  deviceId: string;
  isDarkMode: boolean;
  onNavigateToMedia?: (mediaId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userName,
  deviceId,
  isDarkMode,
  onNavigateToMedia
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userName) return;

    // Subscribe to notifications
    console.log(`🔔 Setting up notification subscription for: ${userName} (${deviceId})`);
    const unsubscribe = notificationService.subscribeToNotifications(
      userName,
      deviceId,
      (newNotifications) => {
        console.log(`📬 Received ${newNotifications.length} notifications:`, newNotifications);
        setNotifications(newNotifications);
        const unread = newNotifications.filter(n => !n.read).length;
        console.log(`📊 Calculated unread count: ${unread}`);
        setUnreadCount(unread);
      }
    );

    return unsubscribe;
  }, [userName, deviceId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to media if it's a media-related notification and callback is provided
    if (notification.mediaId && onNavigateToMedia) {
      onNavigateToMedia(notification.mediaId);
      setIsOpen(false); // Close notification dropdown
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'notifications', notification.id), {
            read: true
          })
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'tag':
        return <Tag className="w-4 h-4 text-blue-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays < 7) return `vor ${diffDays}d`;
    return date.toLocaleDateString('de-DE');
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          console.log('🔔 Notification bell clicked! Current state:', isOpen);
          console.log('📬 Current notifications:', notifications.length);
          console.log('📊 Unread count:', unreadCount);
          setIsOpen(!isOpen);
          console.log('🔔 New state will be:', !isOpen);
        }}
        className={`relative p-3 rounded-full transition-all duration-300 ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-80 max-w-sm rounded-2xl shadow-2xl border z-[99999] ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-200'
        }`} style={{ zIndex: 99999 }}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDarkMode ? 'border-gray-600' : 'border-gray-200'
          }`}>
            <h3 className={`font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Benachrichtigungen
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Alle lesen
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={`p-6 text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors cursor-pointer ${
                      !notification.read 
                        ? isDarkMode 
                          ? 'bg-blue-900/20 hover:bg-blue-900/30' 
                          : 'bg-blue-50 hover:bg-blue-100'
                        : isDarkMode 
                          ? 'hover:bg-gray-700' 
                          : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`mt-1 p-2 rounded-full ${
                        notification.type === 'tag' ? 'bg-blue-100' :
                        notification.type === 'like' ? 'bg-red-100' :
                        notification.type === 'comment' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {notification.message}
                        </p>
                        <p className={`text-xs mt-2 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};