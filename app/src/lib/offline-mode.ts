import { createClient } from '@supabase/supabase-js';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// IndexedDB schema for offline storage
interface OfflineDB extends DBSchema {
  trades: {
    key: string;
    value: {
      id: string;
      user_id: string;
      currency_pair: string;
      trade_type: 'LONG' | 'SHORT';
      entry_price: number;
      exit_price?: number;
      stop_loss?: number;
      take_profit?: number;
      lot_size: number;
      profit_loss?: number;
      date: string;
      notes?: string;
      image_urls?: string[];
      tags?: string[];
      status: 'OPEN' | 'CLOSED';
      created_at: string;
      updated_at: string;
      is_offline: boolean;
      sync_status: 'pending' | 'synced' | 'failed';
    };
    indexes: {
      'by-user': string;
      'by-sync-status': string;
      'by-date': string;
    };
  };
  trade_setups: {
    key: string;
    value: {
      id: string;
      user_id: string;
      title: string;
      description?: string;
      currency_pair: string;
      direction: 'LONG' | 'SHORT';
      entry_price: number;
      stop_loss?: number;
      take_profit?: number;
      chart_image_url?: string;
      created_at: string;
      updated_at: string;
      is_offline: boolean;
      sync_status: 'pending' | 'synced' | 'failed';
    };
    indexes: {
      'by-user': string;
      'by-sync-status': string;
    };
  };
  messages: {
    key: string;
    value: {
      id: string;
      sender_id: string;
      receiver_id: string;
      content: string;
      created_at: string;
      is_offline: boolean;
      sync_status: 'pending' | 'synced' | 'failed';
    };
    indexes: {
      'by-sync-status': string;
    };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      action: 'INSERT' | 'UPDATE' | 'DELETE';
      data: any;
      created_at: string;
      retry_count: number;
      last_retry?: string;
    };
    indexes: {
      'by-table': string;
      'by-retry-count': string;
    };
  };
}

export class OfflineModeService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    this.initializeDB();
    this.setupNetworkListeners();
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB<OfflineDB>('traders-journal-offline', 1, {
        upgrade(db) {
          // Trades table
          const tradesStore = db.createObjectStore('trades', { keyPath: 'id' });
          tradesStore.createIndex('by-user', 'user_id');
          tradesStore.createIndex('by-sync-status', 'sync_status');
          tradesStore.createIndex('by-date', 'date');

          // Trade setups table
          const setupsStore = db.createObjectStore('trade_setups', { keyPath: 'id' });
          setupsStore.createIndex('by-user', 'user_id');
          setupsStore.createIndex('by-sync-status', 'sync_status');

          // Messages table
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('by-sync-status', 'sync_status');

          // Sync queue table
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by-table', 'table');
          syncStore.createIndex('by-retry-count', 'retry_count');
        },
      });
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add trade offline
   */
  async addTradeOffline(tradeData: any): Promise<string> {
    if (!this.db) {
      throw new Error('Offline database not initialized');
    }

    const tradeId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trade = {
      ...tradeData,
      id: tradeId,
      is_offline: true,
      sync_status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.db.add('trades', trade);
    await this.addToSyncQueue('trades', 'INSERT', trade);

    return tradeId;
  }

  /**
   * Add trade setup offline
   */
  async addTradeSetupOffline(setupData: any): Promise<string> {
    if (!this.db) {
      throw new Error('Offline database not initialized');
    }

    const setupId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const setup = {
      ...setupData,
      id: setupId,
      is_offline: true,
      sync_status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.db.add('trade_setups', setup);
    await this.addToSyncQueue('trade_setups', 'INSERT', setup);

    return setupId;
  }

  /**
   * Add message offline
   */
  async addMessageOffline(messageData: any): Promise<string> {
    if (!this.db) {
      throw new Error('Offline database not initialized');
    }

    const messageId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      ...messageData,
      id: messageId,
      is_offline: true,
      sync_status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    await this.db.add('messages', message);
    await this.addToSyncQueue('messages', 'INSERT', message);

    return messageId;
  }

  /**
   * Get offline trades for a user
   */
  async getOfflineTrades(userId: string): Promise<any[]> {
    if (!this.db) {
      return [];
    }

    const trades = await this.db.getAllFromIndex('trades', 'by-user', userId);
    return trades.filter(trade => trade.is_offline);
  }

  /**
   * Get offline trade setups for a user
   */
  async getOfflineTradeSetups(userId: string): Promise<any[]> {
    if (!this.db) {
      return [];
    }

    const setups = await this.db.getAllFromIndex('trade_setups', 'by-user', userId);
    return setups.filter(setup => setup.is_offline);
  }

  /**
   * Get offline messages
   */
  async getOfflineMessages(): Promise<any[]> {
    if (!this.db) {
      return [];
    }

    const messages = await this.db.getAll('messages');
    return messages.filter(message => message.is_offline);
  }

  /**
   * Add item to sync queue
   */
  private async addToSyncQueue(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any): Promise<void> {
    if (!this.db) return;

    const queueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      table,
      action,
      data,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await this.db.add('sync_queue', queueItem);
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || !this.db) {
      return;
    }

    this.syncInProgress = true;

    try {
      const syncQueue = await this.db.getAll('sync_queue');
      
      for (const item of syncQueue) {
        try {
          await this.processSyncItem(item);
          await this.db.delete('sync_queue', item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          await this.updateRetryCount(item.id);
        }
      }

      // Update sync status for successfully synced items
      await this.updateSyncStatus();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: any): Promise<void> {
    switch (item.action) {
      case 'INSERT':
        await this.supabase
          .from(item.table)
          .insert(item.data);
        break;
      
      case 'UPDATE':
        await this.supabase
          .from(item.table)
          .update(item.data)
          .eq('id', item.data.id);
        break;
      
      case 'DELETE':
        await this.supabase
          .from(item.table)
          .delete()
          .eq('id', item.data.id);
        break;
    }
  }

  /**
   * Update retry count for failed sync items
   */
  private async updateRetryCount(itemId: string): Promise<void> {
    if (!this.db) return;

    const item = await this.db.get('sync_queue', itemId);
    if (item && item.retry_count < 3) {
      item.retry_count += 1;
      item.last_retry = new Date().toISOString();
      await this.db.put('sync_queue', item);
    }
  }

  /**
   * Update sync status for successfully synced items
   */
  private async updateSyncStatus(): Promise<void> {
    if (!this.db) return;

    // Update trades sync status
    const pendingTrades = await this.db.getAllFromIndex('trades', 'by-sync-status', 'pending');
    for (const trade of pendingTrades) {
      trade.sync_status = 'synced';
      trade.is_offline = false;
      await this.db.put('trades', trade);
    }

    // Update trade setups sync status
    const pendingSetups = await this.db.getAllFromIndex('trade_setups', 'by-sync-status', 'pending');
    for (const setup of pendingSetups) {
      setup.sync_status = 'synced';
      setup.is_offline = false;
      await this.db.put('trade_setups', setup);
    }

    // Update messages sync status
    const pendingMessages = await this.db.getAllFromIndex('messages', 'by-sync-status', 'pending');
    for (const message of pendingMessages) {
      message.sync_status = 'synced';
      message.is_offline = false;
      await this.db.put('messages', message);
    }
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus(): Promise<{
    pending: number;
    synced: number;
    failed: number;
    total: number;
  }> {
    if (!this.db) {
      return { pending: 0, synced: 0, failed: 0, total: 0 };
    }

    const pending = await this.db.countFromIndex('sync_queue', 'by-retry-count');
    const synced = await this.db.countFromIndex('trades', 'by-sync-status', 'synced');
    const failed = await this.db.countFromIndex('trades', 'by-sync-status', 'failed');

    return {
      pending,
      synced,
      failed,
      total: pending + synced + failed,
    };
  }

  /**
   * Clear all offline data (for testing/reset)
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    await this.db.clear('trades');
    await this.db.clear('trade_setups');
    await this.db.clear('messages');
    await this.db.clear('sync_queue');
  }

  /**
   * Export offline data for backup
   */
  async exportOfflineData(): Promise<string> {
    if (!this.db) return '';

    const data = {
      trades: await this.db.getAll('trades'),
      trade_setups: await this.db.getAll('trade_setups'),
      messages: await this.db.getAll('messages'),
      sync_queue: await this.db.getAll('sync_queue'),
      export_date: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import offline data from backup
   */
  async importOfflineData(jsonData: string): Promise<void> {
    if (!this.db) return;

    try {
      const data = JSON.parse(jsonData);
      
      if (data.trades) {
        for (const trade of data.trades) {
          await this.db.put('trades', trade);
        }
      }

      if (data.trade_setups) {
        for (const setup of data.trade_setups) {
          await this.db.put('trade_setups', setup);
        }
      }

      if (data.messages) {
        for (const message of data.messages) {
          await this.db.put('messages', message);
        }
      }

      if (data.sync_queue) {
        for (const item of data.sync_queue) {
          await this.db.put('sync_queue', item);
        }
      }
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw new Error('Invalid backup data format');
    }
  }
}

// Export singleton instance
export const offlineMode = new OfflineModeService();
