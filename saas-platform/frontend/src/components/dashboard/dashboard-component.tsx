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
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  MessageSquare,
  BarChart3,
  Plus,
  Phone,
  Bot,
  Activity,
  LogOut,
  Clock,
  QrCode,
  Send,
} from 'lucide-react';

export function DashboardComponent() {
  const { user, tenant, logout, token } = useAuth();
  const { instances, connectedInstances, activeSessions, hasConnectedInstances, loading, recentActivity, rateLimitInfo, refreshInstances, getSessionInfo } = useWhatsApp();
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados para envío de mensajes
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [messageRecipient, setMessageRecipient] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Debug logs para verificar qué datos estamos recibiendo
  useEffect(() => {
    console.log('🎨 Dashboard recentActivity update:', recentActivity);
    console.log('📱 Dashboard instances:', instances);
    console.log('🟢 Connected instances:', connectedInstances);
    console.log('⚡ Active sessions:', activeSessions);
  }, [recentActivity, instances, connectedInstances, activeSessions]);

  // Refresh automático al cargar el componente
  useEffect(() => {
    console.log('🚀 Dashboard mounted, refreshing data...');
    refreshInstances();
  }, [refreshInstances]);

  const handleLogout = () => {
    logout();
  };

  const handleSessionClick = async (instance: any) => {
    if (instance.status === 'CONNECTED') {
      setSelectedSession(instance);
      setLoadingDetails(true);
      
      try {
        const details = await getSessionInfo(instance.id);
        setSessionDetails(details);
      } catch (error) {
        console.error('Error getting session details:', error);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedInstanceId || !messageRecipient || !messageText) {
      setSendResult({ type: 'error', message: 'Por favor completa todos los campos' });
      return;
    }

    // Verificar rate limiting
    if (rateLimitInfo.isRateLimited && rateLimitInfo.nextRetryTime) {
      const remainingTime = Math.ceil((rateLimitInfo.nextRetryTime.getTime() - Date.now()) / 1000);
      if (remainingTime > 0) {
        setSendResult({ 
          type: 'error', 
          message: `⏳ Rate limited. Reintenta en ${remainingTime} segundos` 
        });
        return;
      }
    }

    // Formatear el número: remover todos los caracteres que no sean números
    const cleanNumber = messageRecipient.replace(/\D/g, '');
    
    // Validación más flexible para diferentes países
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      setSendResult({ 
        type: 'error', 
        message: 'Formato incorrecto. Usa: código país + número (10-15 dígitos total)' 
      });
      return;
    }

    // Validación específica para México (más común)
    if (cleanNumber.startsWith('52') && cleanNumber.length !== 12) {
      setSendResult({ 
        type: 'error', 
        message: 'Para México usa: 52 + 10 dígitos (ej: 5219876543210)' 
      });
      return;
    }

    console.log('📤 Sending message:', {
      instanceId: selectedInstanceId,
      originalRecipient: messageRecipient,
      cleanRecipient: cleanNumber,
      message: messageText
    });

    setSendingMessage(true);
    setSendResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/whatsapp/instances/${selectedInstanceId}/send-message`;
      console.log('📍 Send message URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanNumber, // Usar el número limpio
          message: messageText,
          type: 'text'
        }),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        setSendResult({ type: 'success', message: '✅ Mensaje enviado exitosamente!' });
        setMessageText('');
        console.log('✅ Message sent successfully:', result);
      } else if (response.status === 429) {
        setSendResult({ 
          type: 'error', 
          message: '⚠️ Demasiadas solicitudes. Espera un momento antes de reintentar.' 
        });
      } else if (response.status === 503) {
        // Session being reconnected
        const errorData = await response.json();
        if (errorData.action === 'reconnecting') {
          setSendResult({ 
            type: 'error', 
            message: '🔄 Sesión desconectada. Reconectando automáticamente... Inténtalo en 30 segundos.' 
          });
          // Auto-refresh instances in 10 seconds to get updated status
          setTimeout(() => {
            refreshInstances();
          }, 10000);
        } else {
          setSendResult({ type: 'error', message: errorData.error || 'Servicio temporalmente no disponible' });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Send message error response:', errorText);
        try {
          const error = JSON.parse(errorText);
          setSendResult({ type: 'error', message: error.error || 'Error enviando mensaje' });
        } catch {
          setSendResult({ type: 'error', message: `Error HTTP ${response.status}: ${errorText}` });
        }
      }
    } catch (error) {
      console.error('❌ Send message network error:', error);
      setSendResult({ type: 'error', message: `Error de conexión: ${error.message}` });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {tenant?.name || 'Dashboard'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {tenant?.subdomain}.wppconnect.app
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ml-4 ${
                  tenant?.plan === 'PRO' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                Plan {tenant?.plan}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/dashboard/chatbots')}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Chatbots
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido de nuevo, {user?.firstName}!
          </h2>
          <p className="text-gray-600">
            Gestiona tus chatbots de WhatsApp desde aquí
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Números Conectados
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedInstances.length}</div>
              <p className="text-xs text-muted-foreground">
                {connectedInstances.length === 0 ? 'Ningún número conectado aún' : `${connectedInstances.length} número${connectedInstances.length > 1 ? 's' : ''} conectado${connectedInstances.length > 1 ? 's' : ''}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Chatbots Activos
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                <button 
                  onClick={() => router.push('/dashboard/chatbots')}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Crea tu primer chatbot
                </button>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversaciones Hoy
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Sin conversaciones aún
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Respuestas Automáticas
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">
                Tasa de automatización
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actividad Reciente */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas conexiones y códigos QR generados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Botón de refresh prominente */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                {loading ? 'Actualizando datos...' : `Última actualización: ${new Date().toLocaleTimeString()}`}
                {rateLimitInfo.isRateLimited && rateLimitInfo.nextRetryTime && (
                  <div className="text-orange-600 text-xs mt-1">
                    ⚠️ Rate limited - Siguiente actualización disponible en: {Math.max(0, Math.ceil((rateLimitInfo.nextRetryTime.getTime() - Date.now()) / 1000))}s
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshInstances}
                disabled={loading || (rateLimitInfo.isRateLimited && rateLimitInfo.nextRetryTime && rateLimitInfo.nextRetryTime.getTime() > Date.now())}
                className="flex items-center space-x-2"
              >
                <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {loading ? 'Actualizando...' : 
                   rateLimitInfo.isRateLimited ? 'Esperando...' : 
                   'Refrescar'}
                </span>
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* DEBUG: Información visible para debugging */}
              <div className="border rounded-lg p-4 bg-gray-50 border-gray-200 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">🔍 Debug Info (temporal)</h4>
                <div className="text-sm space-y-1">
                  <div>Total instancias: {instances.length}</div>
                  <div>Instancias conectadas: {connectedInstances.length}</div>
                  <div>Sesiones activas: {activeSessions.length}</div>
                  <div>¿Tiene QR reciente?: {recentActivity?.latestQr ? 'Sí' : 'No'}</div>
                  <div>¿Tiene conexión reciente?: {recentActivity?.latestConnection ? 'Sí' : 'No'}</div>
                  {instances.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">Instancias encontradas:</div>
                      {instances.map((inst, i) => (
                        <div key={i} className="ml-2 text-xs">
                          {i + 1}. {inst.name} - {inst.status} - QR: {inst.qrCode ? 'Sí' : 'No'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Último QR generado */}
              {recentActivity?.latestQr ? (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <QrCode className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-blue-900">
                          QR Code Generado
                        </h3>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          {new Date(recentActivity.latestQr.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Sesión: {recentActivity.latestQr.sessionName}
                      </p>
                      <div className="mt-3 flex items-center space-x-4">
                        <div className="bg-white p-2 rounded border">
                          <Image
                            src={recentActivity.latestQr.qrCode}
                            alt="Código QR"
                            width={128}
                            height={128}
                            className="w-32 h-32"
                          />
                        </div>
                        <div className="text-xs text-blue-600">
                          <p>📱 Escanea este código con WhatsApp</p>
                          <p>⚡ Estado: Esperando conexión</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Última conexión */}
              {recentActivity?.latestConnection ? (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <Phone className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-green-900">
                          Sesión Conectada
                        </h3>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          {new Date(recentActivity.latestConnection.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        📱 {recentActivity.latestConnection.phoneNumber}
                      </p>
                      <p className="text-sm text-green-700">
                        🏷️ {recentActivity.latestConnection.sessionName}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✅ Conectado y activo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Si no hay actividad reciente */}
              {!recentActivity?.latestQr && !recentActivity?.latestConnection && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-700 mb-2">
                    Sin actividad reciente
                  </h3>
                  <p className="text-sm">
                    Conecta tu primer número de WhatsApp para ver la actividad aquí
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push('/dashboard/whatsapp/connect')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enviar Mensaje Rápido */}
        {connectedInstances.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2" />
                Enviar Mensaje Rápido
              </CardTitle>
              <CardDescription>
                Envía un mensaje de prueba a cualquier contacto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Selector de instancia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar número de WhatsApp:
                  </label>
                  <select
                    value={selectedInstanceId}
                    onChange={(e) => setSelectedInstanceId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona una sesión conectada</option>
                    {connectedInstances.map((instance) => (
                      <option key={instance.id} value={instance.id}>
                        {instance.name} - {instance.phone || instance.phoneNumber || 'Sin número'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Número destino */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número destino (con código de país):
                  </label>
                  <input
                    type="text"
                    value={messageRecipient}
                    onChange={(e) => setMessageRecipient(e.target.value)}
                    placeholder="Ej: 5219876543210, 12345678901, etc."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    <div className="mb-2">
                      <strong>Formatos válidos:</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>🇲🇽 México: 52 + 10 dígitos</div>
                      <div>🇺🇸 EE.UU.: 1 + 10 dígitos</div>
                      <div>🇪🇸 España: 34 + 9 dígitos</div>
                      <div>🌍 Otros: Código país + número</div>
                    </div>
                    {messageRecipient && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border text-xs">
                        {(() => {
                          const clean = messageRecipient.replace(/\D/g, '');
                          if (!clean) return '⚪ Ingresa un número';
                          if (clean.length < 10) return '🔴 Muy corto (mínimo 10 dígitos)';
                          if (clean.length > 15) return '🔴 Muy largo (máximo 15 dígitos)';
                          if (clean.startsWith('52') && clean.length === 12) return '🟢 México válido';
                          if (clean.startsWith('1') && clean.length === 11) return '🟢 EE.UU./Canadá válido';
                          if (clean.startsWith('34') && clean.length === 11) return '🟢 España válido';
                          if (clean.length >= 10 && clean.length <= 15) return '🟡 Formato internacional';
                          return '🔴 Formato incorrecto';
                        })()}
                        <br/>
                        <span className="text-blue-600">📱 Se enviará a: +{messageRecipient.replace(/\D/g, '')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje:
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Resultado */}
                {sendResult && (
                  <div className={`p-3 rounded-md ${
                    sendResult.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {sendResult.message}
                  </div>
                )}

                {/* Botón enviar */}
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !selectedInstanceId || !messageRecipient || !messageText}
                  className="w-full"
                >
                  <Send className={`h-4 w-4 mr-2 ${sendingMessage ? 'animate-pulse' : ''}`} />
                  {sendingMessage ? 'Enviando...' : 'Enviar Mensaje'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Sessions Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                WhatsApp
              </CardTitle>
              <CardDescription>
                Gestiona tus conexiones de WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => router.push('/dashboard/whatsapp/connect')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Conectar Número
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={refreshInstances}
                  disabled={loading}
                >
                  {loading ? 'Actualizando...' : 'Actualizar Estado'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Estadísticas
              </CardTitle>
              <CardDescription>
                Resumen de tus sesiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Sesiones:</span>
                  <span className="font-medium">{instances.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conectadas:</span>
                  <span className="font-medium text-green-600">{connectedInstances.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activas:</span>
                  <span className="font-medium text-blue-600">{activeSessions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Create */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                Crear Chatbot
              </CardTitle>
              <CardDescription>
                Automatiza conversaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => router.push('/dashboard/chatbots/new')}
                disabled={!hasConnectedInstances}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Chatbot
              </Button>
              {!hasConnectedInstances && (
                <p className="text-xs text-gray-500 mt-2">
                  Necesitas conectar WhatsApp primero
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Sesiones de WhatsApp
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshInstances}
                disabled={loading}
              >
                <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              Estado detallado de todas tus conexiones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {instances.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sin conexiones de WhatsApp
                </h3>
                <p className="text-gray-600 mb-4">
                  Conecta tu primer número de WhatsApp para empezar
                </p>
                <Button onClick={() => router.push('/dashboard/whatsapp/connect')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {instances.map((instance) => {
                  const activeSession = activeSessions.find(
                    (session) => session.instanceId === instance.id
                  );
                  
                  return (
                    <div
                      key={instance.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        instance.status === 'CONNECTED' 
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : instance.status === 'ERROR'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => handleSessionClick(instance)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            instance.status === 'CONNECTED' ? 'bg-green-500' :
                            instance.status === 'ERROR' ? 'bg-red-500' :
                            instance.status === 'QR_CODE' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`} />
                          <div>
                            <h3 className="font-medium">{instance.name}</h3>
                            <p className="text-sm text-gray-600">
                              {instance.phone || instance.phoneNumber || 'Sin número'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            instance.status === 'CONNECTED' ? 'bg-green-100 text-green-800' :
                            instance.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                            instance.status === 'QR_CODE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {instance.status === 'CONNECTED' ? 'Conectado' :
                             instance.status === 'ERROR' ? 'Error' :
                             instance.status === 'QR_CODE' ? 'Esperando QR' :
                             instance.status}
                          </span>
                          {activeSession && (
                            <div className="text-xs text-gray-500 mt-1">
                              {activeSession.isOnline ? '🟢 En línea' : '🔴 Fuera de línea'}
                              {activeSession.batteryLevel && ` • ${activeSession.batteryLevel}%`}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {instance.status === 'CONNECTED' && activeSession && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Estado:</span>
                              <p className="font-medium">
                                {activeSession.isConnected ? 'Activo' : 'Inactivo'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">En línea:</span>
                              <p className="font-medium">
                                {activeSession.isOnline ? 'Sí' : 'No'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Batería:</span>
                              <p className="font-medium">
                                {activeSession.batteryLevel ? `${activeSession.batteryLevel}%` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Actualizado: {new Date(instance.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Details Modal */}
        {selectedSession && sessionDetails && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Detalles de {selectedSession.name}</CardTitle>
              <CardDescription>
                Información técnica detallada de la sesión
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDetails ? (
                <div className="text-center py-4">Cargando detalles...</div>
              ) : (
                <div className="space-y-4">
                  {sessionDetails.hostDevice && (
                    <div>
                      <h4 className="font-medium mb-2">Información del Dispositivo</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>Número: {sessionDetails.hostDevice.wid?.user || 'N/A'}</div>
                          <div>Plataforma: {sessionDetails.hostDevice.platform || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-2">Estado de Conexión</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Conectado: {sessionDetails.isConnected ? '✅' : '❌'}</div>
                        <div>En línea: {sessionDetails.isOnline ? '✅' : '❌'}</div>
                        <div>Autenticado: {sessionDetails.isAuthenticated ? '✅' : '❌'}</div>
                        <div>Logged In: {sessionDetails.isLoggedIn ? '✅' : '❌'}</div>
                      </div>
                    </div>
                  </div>

                  {sessionDetails.waVersion && (
                    <div>
                      <h4 className="font-medium mb-2">Información Técnica</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div>Versión WhatsApp: {sessionDetails.waVersion}</div>
                        <div>MultiDevice: {sessionDetails.isMultiDevice ? 'Sí' : 'No'}</div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSession(null)}
                  >
                    Cerrar Detalles
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
