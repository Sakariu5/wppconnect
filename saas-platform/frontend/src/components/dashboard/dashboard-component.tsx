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
  LogOut,
  QrCode,
  Send,
  Inbox,
  User,
  RefreshCw,
  Plus,
  Phone,
} from 'lucide-react';

export function DashboardComponent() {
  const { user, tenant, logout, token } = useAuth();
  const { connectedInstances, recentActivity, recentMessages, loading, refreshInstances, refreshMessages } = useWhatsApp();
  const router = useRouter();
  
  // Estados para envío de mensajes
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [messageRecipient, setMessageRecipient] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Estados para mensajes filtrados por sesión
  const [filteredMessages, setFilteredMessages] = useState(recentMessages);

  // Filtrar mensajes cuando cambie la sesión seleccionada o los mensajes
  useEffect(() => {
    if (selectedInstanceId) {
      const filtered = recentMessages.filter(
        message => message.conversation.whatsappInstance.id === selectedInstanceId
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(recentMessages);
    }
  }, [selectedInstanceId, recentMessages]);

  // Refresh automático al cargar el componente
  useEffect(() => {
    console.log('🚀 Dashboard mounted, refreshing data...');
    refreshInstances();
  }, [refreshInstances]);

  const handleLogout = () => {
    logout();
  };

  const handleConnectWhatsApp = () => {
    router.push('/dashboard/whatsapp/connect');
  };

  // Función mejorada para limpiar y validar números
  const cleanAndValidateNumber = (input: string): { valid: boolean; cleaned: string; error?: string } => {
    console.log('🧹 Cleaning number input:', { original: input, length: input.length });
    
    // Quitar todos los caracteres que no sean dígitos
    const digitsOnly = input.replace(/\D/g, '');
    console.log('🔢 Digits only:', { digitsOnly, length: digitsOnly.length });
    
    // Validaciones básicas
    if (digitsOnly.length < 10) {
      return { valid: false, cleaned: digitsOnly, error: 'Número muy corto (mínimo 10 dígitos)' };
    }
    
    if (digitsOnly.length > 15) {
      return { valid: false, cleaned: digitsOnly, error: 'Número muy largo (máximo 15 dígitos)' };
    }
    
    // Validaciones específicas por país
    if (digitsOnly.startsWith('52')) {
      // México: 52 + 10 u 11 dígitos
      if (digitsOnly.length === 12 || digitsOnly.length === 13) {
        return { valid: true, cleaned: digitsOnly };
      } else {
        return { valid: false, cleaned: digitsOnly, error: 'Formato México incorrecto (52 + 10/11 dígitos)' };
      }
    } else if (digitsOnly.startsWith('1')) {
      // EE.UU./Canadá: 1 + 10 dígitos
      if (digitsOnly.length === 11) {
        return { valid: true, cleaned: digitsOnly };
      } else {
        return { valid: false, cleaned: digitsOnly, error: 'Formato EE.UU./Canadá incorrecto (1 + 10 dígitos)' };
      }
    } else if (digitsOnly.startsWith('34')) {
      // España: 34 + 9 dígitos
      if (digitsOnly.length === 11) {
        return { valid: true, cleaned: digitsOnly };
      } else {
        return { valid: false, cleaned: digitsOnly, error: 'Formato España incorrecto (34 + 9 dígitos)' };
      }
    }
    
    // Formato internacional genérico (10-15 dígitos)
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { valid: true, cleaned: digitsOnly };
    }
    
    return { valid: false, cleaned: digitsOnly, error: 'Formato de número no válido' };
  };

  const handleSendMessage = async () => {
    if (!selectedInstanceId || !messageRecipient || !messageText) {
      setSendResult({ type: 'error', message: 'Por favor completa todos los campos' });
      return;
    }

    const validation = cleanAndValidateNumber(messageRecipient);
    const cleaned = validation.cleaned;

    console.log('📤 Sending message details:', {
      instanceId: selectedInstanceId,
      originalRecipient: messageRecipient,
      cleanRecipient: cleaned,
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
          to: cleaned, // Usar el número limpio
          message: messageText,
          type: 'text'
        }),
      });

      console.log('📡 Response status:', response.status);
      const responseText = await response.text();
      console.log('📄 Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse response as JSON:', e);
        throw new Error(`Server response was not valid JSON: ${responseText.substring(0, 100)}`);
      }

      if (response.ok) {
        console.log('✅ Message sent successfully:', data);
        setSendResult({ 
          type: 'success', 
          message: `✅ Mensaje enviado correctamente a +${cleaned}` 
        });
        setMessageText('');
        setMessageRecipient('');
        
        // Refresh messages after successful send
        setTimeout(() => {
          refreshMessages();
        }, 2000);
      } else {
        console.error('❌ Send message failed:', data);
        setSendResult({ 
          type: 'error', 
          message: `❌ Error: ${data.error || data.details || 'Error desconocido'}` 
        });
      }
    } catch (error: any) {
      console.error('❌ Send message error:', error);
      setSendResult({ 
        type: 'error', 
        message: `❌ Error de conexión: ${error.message}` 
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  📱 WhatsApp Dashboard
                </h1>
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
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido de nuevo, {user?.firstName}!
          </h2>
          <p className="text-gray-600">
            Gestiona tus chatbots de WhatsApp desde aquí
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda */}
          <div className="space-y-6">
            {/* Botón Conectar WhatsApp */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Conectar WhatsApp
                </CardTitle>
                <CardDescription>
                  Conecta un nuevo número de WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={handleConnectWhatsApp}
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Conectar Número de WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Mostrar QR si existe */}
            {recentActivity?.latestQr && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="h-5 w-5 mr-2" />
                    Código QR Generado
                  </CardTitle>
                  <CardDescription>
                    Escanea este código con WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <div className="inline-block p-4 bg-white rounded-lg border">
                      <Image
                        src={recentActivity.latestQr.qrCode}
                        alt="Código QR"
                        width={200}
                        height={200}
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Sesión: <span className="font-medium">{recentActivity.latestQr.sessionName}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Generado: {new Date(recentActivity.latestQr.timestamp).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Selector de Sesión y Envío Rápido */}
            {connectedInstances.length > 0 && (
              <Card>
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
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                        placeholder="Ej: 5215549681111, 5255496811111, 12345678901, etc."
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        <div className="mb-2">
                          <strong>Formatos válidos:</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>🇲🇽 México: 52 + 10/11 dígitos</div>
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
                              if (clean.startsWith('52') && clean.length === 13) return '🟢 México válido (con área metropolitana)';
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
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      size="lg"
                    >
                      <Send className={`h-4 w-4 mr-2 ${sendingMessage ? 'animate-pulse' : ''}`} />
                      {sendingMessage ? 'Enviando...' : 'Enviar Mensaje'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna Derecha - Mensajes Recientes */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Inbox className="h-5 w-5 mr-2" />
                    Mensajes Recientes
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshMessages}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
                <CardDescription>
                  {selectedInstanceId 
                    ? `Mensajes de la sesión seleccionada (${filteredMessages.length})`
                    : `Últimos mensajes de todas tus instancias (${recentMessages.length})`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(selectedInstanceId ? filteredMessages : recentMessages).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-700 mb-2">
                      Sin mensajes recientes
                    </h3>
                    <p className="text-sm">
                      {selectedInstanceId 
                        ? 'No hay mensajes para esta sesión'
                        : 'Los mensajes que recibas aparecerán aquí'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {(selectedInstanceId ? filteredMessages : recentMessages).slice(0, 10).map((message) => (
                      <div
                        key={message.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {message.conversation.contactName || 'Contacto sin nombre'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    📱 {message.conversation.contactPhone}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">
                                    {new Date(message.createdAt).toLocaleString()}
                                  </p>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {message.conversation.whatsappInstance.name}
                                  </span>
                                </div>
                              </div>
                              <div className="bg-gray-100 rounded-lg p-3">
                                <p className="text-sm text-gray-800">
                                  {message.content}
                                </p>
                                {message.messageType !== 'chat' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700 mt-2">
                                    {message.messageType === 'image' ? '📷 Imagen' :
                                     message.messageType === 'document' ? '📄 Documento' :
                                     message.messageType === 'audio' ? '🎵 Audio' :
                                     message.messageType === 'video' ? '🎥 Video' :
                                     message.messageType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {(selectedInstanceId ? filteredMessages : recentMessages).length > 10 && (
                      <div className="text-center pt-4">
                        <p className="text-sm text-gray-500">
                          Mostrando los 10 mensajes más recientes de {(selectedInstanceId ? filteredMessages : recentMessages).length} total
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Información de estado si no hay conexiones */}
        {connectedInstances.length === 0 && (
          <Card className="mt-8">
            <CardContent className="text-center py-8">
              <Phone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Sin conexiones de WhatsApp
              </h3>
              <p className="text-gray-600 mb-6">
                Para empezar a enviar mensajes, necesitas conectar tu primer número de WhatsApp
              </p>
              <Button 
                onClick={handleConnectWhatsApp}
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Conectar WhatsApp
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
