import { addDoc, collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Notification {
  id: string;
  type: 'tag' | 'comment' | 'like' | 'mention';
  title: string;
  message: string;
  targetUser: string;
  targetDeviceId: string;
  fromUser: string;
  fromDeviceId: string;
  mediaId?: string;
  mediaType?: string;
  mediaUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HuWukJyLO-AqAKv-cq2WlJhKONHQLU6R2WJN4YEOGMfWb2OFy3pR8JI-6U'; // Replace with your VAPID key

  async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Register service worker
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered');
        
        // Request notification permission
        await this.requestPermission();
        
        return true;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return false;
      }
    }
    return false;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPush(userName: string, deviceId: string): Promise<boolean> {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Store subscription in Firebase
      await addDoc(collection(db, 'pushSubscriptions'), {
        userName,
        deviceId,
        subscription: JSON.stringify(subscription),
        createdAt: new Date().toISOString()
      });

      console.log('✅ Push subscription created');
      return true;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return false;
    }
  }

  async sendTagNotification(
    taggedUser: string,
    taggedDeviceId: string,
    taggerUser: string,
    taggerDeviceId: string,
    mediaId: string,
    mediaType: string,
    mediaUrl?: string
  ): Promise<void> {
    try {
      // Create notification in Firebase
      const notification = {
        type: 'tag',
        title: 'Du wurdest markiert!',
        message: `${taggerUser} hat dich in einem ${mediaType === 'video' ? 'Video' : 'Foto'} markiert`,
        targetUser: taggedUser,
        targetDeviceId: taggedDeviceId,
        fromUser: taggerUser,
        fromDeviceId: taggerDeviceId,
        mediaId: mediaId,
        mediaType: mediaType,
        mediaUrl: mediaUrl || '',
        read: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'notifications'), notification);

      // Send browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `tag-${mediaId}`,
          data: {
            mediaId,
            type: 'tag'
          }
        });
      }

      console.log('✅ Tag notification sent');
    } catch (error) {
      console.error('❌ Failed to send tag notification:', error);
    }
  }

  async sendCommentNotification(
    mediaOwner: string,
    mediaOwnerDeviceId: string,
    commenterUser: string,
    commenterDeviceId: string,
    mediaId: string,
    commentText: string
  ): Promise<void> {
    if (mediaOwner === commenterUser && mediaOwnerDeviceId === commenterDeviceId) {
      return; // Don't notify yourself
    }

    try {
      const notification: Omit<Notification, 'id'> = {
        type: 'comment',
        title: 'Neuer Kommentar',
        message: `${commenterUser} hat dein Foto kommentiert: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
        targetUser: mediaOwner,
        targetDeviceId: mediaOwnerDeviceId,
        fromUser: commenterUser,
        fromDeviceId: commenterDeviceId,
        mediaId,
        read: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'notifications'), notification);

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `comment-${mediaId}`,
          data: {
            mediaId,
            type: 'comment'
          }
        });
      }

      console.log('✅ Comment notification sent');
    } catch (error) {
      console.error('❌ Failed to send comment notification:', error);
    }
  }

  async sendLikeNotification(
    mediaOwner: string,
    mediaOwnerDeviceId: string,
    likerUser: string,
    likerDeviceId: string,
    mediaId: string
  ): Promise<void> {
    if (mediaOwner === likerUser && mediaOwnerDeviceId === likerDeviceId) {
      return; // Don't notify yourself
    }

    try {
      const notification: Omit<Notification, 'id'> = {
        type: 'like',
        title: 'Neues Like',
        message: `${likerUser} gefällt dein Foto`,
        targetUser: mediaOwner,
        targetDeviceId: mediaOwnerDeviceId,
        fromUser: likerUser,
        fromDeviceId: likerDeviceId,
        mediaId,
        read: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'notifications'), notification);

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `like-${mediaId}`,
          data: {
            mediaId,
            type: 'like'
          }
        });
      }

      console.log('✅ Like notification sent');
    } catch (error) {
      console.error('❌ Failed to send like notification:', error);
    }
  }

  subscribeToNotifications(
    userName: string,
    deviceId: string,
    callback: (notifications: Notification[]) => void
  ) {
    const q = query(
      collection(db, 'notifications'),
      where('targetUser', '==', userName),
      where('targetDeviceId', '==', deviceId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });
      callback(notifications);
    });
  }

  async getUnreadCount(userName: string, deviceId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('targetUser', '==', userName),
        where('targetDeviceId', '==', deviceId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();