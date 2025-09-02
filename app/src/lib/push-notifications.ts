import { createClient } from '@supabase/supabase-js';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

export class PushNotificationService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize push notification service
   */
  private async initialize(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.swRegistration);

      // Check if already subscribed
      const subscription = await this.getSubscription();
      if (subscription) {
        console.log('Already subscribed to push notifications');
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Check if push notifications are supported
   */
  isPushSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if user has granted notification permission
   */
  async hasPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(userId: string): Promise<boolean> {
    if (!this.isSupported || !this.swRegistration) {
      throw new Error('Push notifications not supported');
    }

    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission denied');
      }

      // Get push subscription
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      // Store subscription in database
      await this.storeSubscription(userId, subscription);

      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    if (!this.isSupported || !this.swRegistration) {
      throw new Error('Push notifications not supported');
    }

    try {
      // Get current subscription
      const subscription = await this.getSubscription();
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      // Remove from database
      await this.removeSubscription(userId);

      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Get current push subscription
   */
  private async getSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) return null;

    try {
      return await this.swRegistration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  /**
   * Store subscription in database
   */
  private async storeSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const { error } = await this.supabase
      .from('push_notification_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error('Failed to store push subscription');
    }
  }

  /**
   * Remove subscription from database
   */
  private async removeSubscription(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('push_notification_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to remove push subscription');
    }
  }

  /**
   * Send local notification
   */
  async showNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported) return;

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return;

      // Show notification using service worker
      if (this.swRegistration) {
        await this.swRegistration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/notification-icon.png',
          badge: payload.badge || '/icons/badge-icon.png',
          image: payload.image,
          tag: payload.tag,
          data: payload.data,
          actions: payload.actions,
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false,
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Send trade alert notification
   */
  async sendTradeAlert(userId: string, tradeData: any): Promise<void> {
    const payload: PushNotificationPayload = {
      title: 'Trade Alert',
      body: `Your ${tradeData.currency_pair} trade has ${tradeData.profit_loss >= 0 ? 'reached target' : 'hit stop loss'}`,
      icon: '/icons/trade-alert.png',
      tag: 'trade-alert',
      data: {
        type: 'trade-alert',
        tradeId: tradeData.id,
        userId: userId,
      },
      actions: [
        {
          action: 'view-trade',
          title: 'View Trade',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/close-icon.png',
        },
      ],
      requireInteraction: true,
    };

    await this.showNotification(payload);
  }

  /**
   * Send friend request notification
   */
  async sendFriendRequestNotification(userId: string, senderName: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: 'New Friend Request',
      body: `${senderName} sent you a friend request`,
      icon: '/icons/friend-request.png',
      tag: 'friend-request',
      data: {
        type: 'friend-request',
        userId: userId,
      },
      actions: [
        {
          action: 'accept',
          title: 'Accept',
          icon: '/icons/accept-icon.png',
        },
        {
          action: 'decline',
          title: 'Decline',
          icon: '/icons/decline-icon.png',
        },
      ],
      requireInteraction: true,
    };

    await this.showNotification(payload);
  }

  /**
   * Send trade shared notification
   */
  async sendTradeSharedNotification(userId: string, sharerName: string, currencyPair: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: 'Trade Shared',
      body: `${sharerName} shared a ${currencyPair} trade with you`,
      icon: '/icons/trade-shared.png',
      tag: 'trade-shared',
      data: {
        type: 'trade-shared',
        userId: userId,
      },
      actions: [
        {
          action: 'view-trade',
          title: 'View Trade',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/close-icon.png',
        },
      ],
    };

    await this.showNotification(payload);
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(userId: string, title: string, body: string, data?: any): Promise<void> {
    const payload: PushNotificationPayload = {
      title,
      body,
      icon: '/icons/system-notification.png',
      tag: 'system-notification',
      data: {
        type: 'system-notification',
        userId: userId,
        ...data,
      },
    };

    await this.showNotification(payload);
  }

  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('push_friend_requests, push_trade_shared, push_medal_achievement')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user's notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: any): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_settings')
      .update(preferences)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }

    return true;
  }

  /**
   * Convert VAPID public key from base64 to Uint8Array
   */
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

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Test notification (for development)
   */
  async testNotification(): Promise<void> {
    const payload: PushNotificationPayload = {
      title: 'Test Notification',
      body: 'This is a test notification from Trader\'s Journal',
      icon: '/icons/test-notification.png',
      tag: 'test-notification',
      data: {
        type: 'test-notification',
        timestamp: new Date().toISOString(),
      },
    };

    await this.showNotification(payload);
  }
}

// Export singleton instance
export const pushNotifications = new PushNotificationService();
