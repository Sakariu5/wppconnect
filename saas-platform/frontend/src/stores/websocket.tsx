'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// Tipos para WebSocket
interface WebSocketContextType {
  socket: any | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  joinTenant: (tenantId: string) => void;
  leaveTenant: () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectSocket = useCallback(async () => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;

    const token = window.localStorage?.getItem('token');
    if (!token) {
      console.warn('No token found, skipping WebSocket connection');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    setIsConnecting(true);
    setError(null);

    try {
      // Import dinámico de socket.io-client
      const { io } = await import('socket.io-client');

      const newSocket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        console.log('WebSocket connected successfully');
      });

      newSocket.on('disconnect', (reason: string) => {
        setIsConnected(false);
        setIsConnecting(false);
        console.log('WebSocket disconnected:', reason);
      });

      newSocket.on('connect_error', (err: any) => {
        setIsConnected(false);
        setIsConnecting(false);
        setError(`Connection error: ${err.message || 'Unknown error'}`);
        console.error('WebSocket connection error:', err);
      });

      newSocket.on('reconnect', (attemptNumber: number) => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      });

      newSocket.on('reconnect_error', (err: any) => {
        setError(`Reconnection error: ${err.message || 'Unknown error'}`);
        console.error('WebSocket reconnection error:', err);
      });

      newSocket.on('reconnect_failed', () => {
        setIsConnected(false);
        setIsConnecting(false);
        setError('Failed to reconnect to server after multiple attempts');
        console.error('WebSocket reconnection failed');
      });

      // Eventos específicos de la aplicación
      newSocket.on('message', (data: any) => {
        console.log('New message received:', data);
      });

      newSocket.on('whatsapp_status', (data: any) => {
        console.log('WhatsApp status update:', data);
      });

      newSocket.on('error', (err: any) => {
        console.error('WebSocket error:', err);
        setError(`WebSocket error: ${err.message || err}`);
      });

      setSocket(newSocket);
    } catch (err) {
      setError('Failed to initialize socket connection');
      setIsConnecting(false);
      console.error('Failed to create socket:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      try {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setIsConnecting(false);
      } catch (err) {
        console.error('Error disconnecting socket:', err);
      }
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connectSocket();
    }, 500);
  }, [disconnect, connectSocket]);

  useEffect(() => {
    connectSocket();

    // Cleanup al desmontar el componente
    return () => {
      disconnect();
    };
  }, []);

  // Manejar cambios de visibilidad de la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !isConnected &&
        !isConnecting
      ) {
        console.log('Page became visible, attempting to reconnect...');
        reconnect();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      };
    }
  }, [isConnected, isConnecting, reconnect]);

  const joinTenant = useCallback(
    (tenantId: string) => {
      if (socket && isConnected) {
        socket.emit('join-tenant', tenantId);
        console.log('Joined tenant:', tenantId);
      } else {
        console.warn('Cannot join tenant: socket not connected');
      }
    },
    [socket, isConnected]
  );

  const leaveTenant = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('leave-tenant');
      console.log('Left current tenant');
    } else {
      console.warn('Cannot leave tenant: socket not connected');
    }
  }, [socket, isConnected]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    isConnecting,
    error,
    joinTenant,
    leaveTenant,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Hook personalizado para manejar mensajes específicos
export const useWebSocketMessage = (
  eventName: string,
  handler: (data: any) => void
) => {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (socket && isConnected) {
      socket.on(eventName, handler);
      return () => {
        if (socket && socket.off) {
          socket.off(eventName, handler);
        }
      };
    }
  }, [socket, isConnected, eventName, handler]);
};

// Hook para enviar mensajes
export const useWebSocketEmit = () => {
  const { socket, isConnected } = useWebSocket();

  return useCallback(
    (eventName: string, data?: any) => {
      if (socket && isConnected) {
        socket.emit(eventName, data);
        return true;
      } else {
        console.warn(`Cannot emit ${eventName}: socket not connected`);
        return false;
      }
    },
    [socket, isConnected]
  );
};
