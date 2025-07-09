/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Note: WebSocket integration would be added here when WebSocketContext is ready

export interface WhatsAppInstance {
  id: string;
  name: string;
  phoneNumber?: string;
  phone?: string;
  status: 'INITIALIZING' | 'QR_CODE' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  basic: WhatsAppInstance;
  hostDevice?: any;
  connectionState?: any;
  isConnected?: boolean;
  isOnline?: boolean;
  isAuthenticated?: boolean;
  isLoggedIn?: boolean;
  batteryLevel?: number | null;
  waVersion?: string;
  isMultiDevice?: boolean;
  error?: string;
}

export interface ActiveSession {
  sessionName: string;
  isConnected: boolean;
  isOnline: boolean;
  phoneNumber: string | null;
  batteryLevel: number | null;
  connectionState: any;
  instanceId?: string;
  dbStatus?: string;
  dbPhone?: string;
}

export interface RecentActivity {
  latestQr?: {
    qrCode: string;
    sessionName: string;
    timestamp: string;
  };
  latestConnection?: {
    sessionName: string;
    phoneNumber: string;
    timestamp: string;
    status: string;
  };
}

export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter: number; // seconds
  nextRetryTime: Date | null;
}

export interface UseWhatsAppReturn {
  instances: WhatsAppInstance[];
  activeSessions: ActiveSession[];
  loading: boolean;
  error: string | null;
  connectedInstances: WhatsAppInstance[];
  hasConnectedInstances: boolean;
  recentActivity: RecentActivity | null;
  rateLimitInfo: RateLimitInfo;
  refreshInstances: () => Promise<void>;
  getSessionInfo: (instanceId: string) => Promise<SessionInfo | null>;
  checkSessionReady: (instanceId: string) => Promise<boolean>;
}

export function useWhatsApp(): UseWhatsAppReturn {
  const { token } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>({
    latestQr: undefined,
    latestConnection: undefined,
  });
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    isRateLimited: false,
    retryAfter: 0,
    nextRetryTime: null,
  });

  const handleRateLimit = useCallback((retryAfterSeconds: number = 60) => {
    const nextRetryTime = new Date(Date.now() + retryAfterSeconds * 1000);
    setRateLimitInfo({
      isRateLimited: true,
      retryAfter: retryAfterSeconds,
      nextRetryTime,
    });

    // Auto-clear rate limit after the retry period
    setTimeout(() => {
      setRateLimitInfo({
        isRateLimited: false,
        retryAfter: 0,
        nextRetryTime: null,
      });
    }, retryAfterSeconds * 1000);
  }, []);

  const calculateRecentActivity = useCallback((instances: WhatsAppInstance[]) => {
    console.log('🔍 Calculating recent activity with instances:', instances);
    const activity: RecentActivity = {};

    // Encontrar el QR más reciente (instancias con QR, cualquier estado)
    const qrInstances = instances.filter(instance => instance.qrCode);
    console.log('📱 All instances with QR:', qrInstances);
    
    if (qrInstances.length > 0) {
      const latestQrInstance = qrInstances.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      
      console.log('🎯 Latest QR instance:', latestQrInstance);
      
      activity.latestQr = {
        qrCode: latestQrInstance.qrCode || '',
        sessionName: latestQrInstance.name,
        timestamp: latestQrInstance.updatedAt,
      };
    }

    // Encontrar la conexión más reciente (cualquier instancia actualizada recientemente)
    const allInstancesSorted = instances.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    console.log('🟢 All instances sorted by update time:', allInstancesSorted);
    
    if (allInstancesSorted.length > 0) {
      const latestInstance = allInstancesSorted[0];
      
      console.log('🎯 Latest updated instance:', latestInstance);
      
      activity.latestConnection = {
        sessionName: latestInstance.name,
        phoneNumber: latestInstance.phone || latestInstance.phoneNumber || 'No disponible',
        timestamp: latestInstance.updatedAt,
        status: latestInstance.status,
      };
    }

    console.log('📊 Final recent activity:', activity);
    setRecentActivity(activity);
  }, []);

  const fetchInstances = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('🔄 Fetching WhatsApp instances...');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/whatsapp/instances`;
      console.log('📍 API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ Rate limited, implementing backoff strategy');
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          handleRateLimit(retryAfter);
          return;
        }
        console.error('❌ API Error:', response.status, response.statusText);
        throw new Error(`Failed to fetch instances: ${response.status}`);
      }

      const data = await response.json();
      console.log('📱 WhatsApp instances from backend:', data);
      console.log('📊 Instance details:');
      data.forEach((instance: any, index: number) => {
        console.log(`  ${index + 1}. ${instance.name}:`, {
          status: instance.status,
          hasQr: !!instance.qrCode,
          qrLength: instance.qrCode?.length,
          phone: instance.phone || instance.phoneNumber,
          updatedAt: instance.updatedAt
        });
      });
      
      setInstances(data);
      calculateRecentActivity(data);
    } catch (err) {
      console.error('❌ Error fetching WhatsApp instances:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch instances');
    } finally {
      setLoading(false);
    }
  }, [token, calculateRecentActivity, handleRateLimit]);

  const fetchActiveSessions = useCallback(async () => {
    if (!token) return;

    try {
      console.log('🔄 Fetching active sessions...');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/whatsapp/sessions/active`;
      console.log('📍 Active sessions URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📱 Active sessions:', data.sessions);
        setActiveSessions(data.sessions);
      } else if (response.status === 429) {
        console.warn('⚠️ Rate limited for active sessions, skipping this fetch cycle');
        // No actualizar el error state para rate limiting
      } else {
        console.error('❌ Failed to fetch active sessions:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('❌ Error fetching active sessions:', err);
    }
  }, [token]);

  const getSessionInfo = useCallback(async (instanceId: string): Promise<SessionInfo | null> => {
    if (!token) return null;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/whatsapp/instances/${instanceId}/session-info`;
      console.log('📍 Session info URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch session info');
        return null;
      }
    } catch (error) {
      console.error('Error fetching session info:', error);
      return null;
    }
  }, [token]);

  const checkSessionReady = useCallback(async (instanceId: string): Promise<boolean> => {
    if (!token) return false;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/whatsapp/instances/${instanceId}/ready`;
      console.log('📍 Session ready URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.isReady;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error checking session ready:', error);
      return false;
    }
  }, [token]);

  const refreshInstances = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchInstances(), fetchActiveSessions()]);
  }, [fetchInstances, fetchActiveSessions]);

  useEffect(() => {
    fetchInstances();
    fetchActiveSessions();
  }, [fetchInstances, fetchActiveSessions]);

  // Auto-refresh when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Page gained focus, refreshing WhatsApp instances...');
      refreshInstances();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshInstances]);

  // Auto-refresh every 60 seconds when user is active (reducir frecuencia para evitar rate limiting)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        console.log('🔄 Auto-refreshing WhatsApp instances...');
        refreshInstances();
      }
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [refreshInstances]);

  const connectedInstances = instances.filter(instance => instance.status === 'CONNECTED');
  const hasConnectedInstances = connectedInstances.length > 0;

  return {
    instances,
    activeSessions,
    loading,
    error,
    connectedInstances,
    hasConnectedInstances,
    recentActivity,
    rateLimitInfo,
    refreshInstances,
    getSessionInfo,
    checkSessionReady,
  };
}
