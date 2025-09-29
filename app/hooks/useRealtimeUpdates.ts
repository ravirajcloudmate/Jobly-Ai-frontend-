import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface RealtimeUpdateOptions {
  companyId: string;
  tables: string[];
  onUpdate: (table: string, eventType: string) => void;
  debounceMs?: number;
}

export function useRealtimeUpdates({ 
  companyId, 
  tables, 
  onUpdate, 
  debounceMs = 300 
}: RealtimeUpdateOptions) {
  const channelRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!companyId || tables.length === 0) return;

    // Create unique channel name
    const channelName = `global-rt-${companyId}-${Date.now()}`;
    
    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    channelRef.current = supabase.channel(channelName);

    const debouncedUpdate = (table: string, eventType: string) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        console.log(`Global realtime: ${table} changed (${eventType})`);
        onUpdate(table, eventType);
      }, debounceMs);
    };

    try {
      // Subscribe to all specified tables
      tables.forEach(table => {
        channelRef.current.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `company_id=eq.${companyId}`
          },
          (payload: any) => {
            debouncedUpdate(table, payload.eventType);
          }
        );
      });

      channelRef.current.subscribe((status: string) => {
        console.log(`Global realtime channel (${channelName}) status:`, status);
      });
    } catch (error) {
      console.error('Global realtime subscription error:', error);
    }

    return () => {
      clearTimeout(timeoutRef.current);
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          console.log(`Global realtime: Removed channel ${channelName}`);
        } catch (error) {
          console.warn('Global realtime: Error removing channel:', error);
        }
      }
    };
  }, [companyId, tables.join(','), debounceMs]);

  return {
    isConnected: channelRef.current?.state === 'joined'
  };
}

// Global event emitter for cross-component communication
class GlobalEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Global event callback error:', error);
        }
      });
    }
  }
}

export const globalEvents = new GlobalEventEmitter();

// Hook for listening to global events
export function useGlobalEvent(event: string, callback: Function, deps: any[] = []) {
  useEffect(() => {
    globalEvents.on(event, callback);
    return () => globalEvents.off(event, callback);
  }, deps);
}

