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
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
  
  // Estados para envío de mensajes
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [messageRecipient, setMessageRecipient] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Estados para mensajes filtrados por sesión
  const [filteredMessages, setFilteredMessages] = useState(recentMessages);
  
  // Estados para el formulario de conexión de WhatsApp
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionForm, setConnectionForm] = useState<{
    whatsappNumber: string;
    sessionName: string;
  }>({
    whatsappNumber: '',
    sessionName: ''
  });
  const [generatingQR, setGeneratingQR] = useState(false);
  const [showQRFromForm, setShowQRFromForm] = useState(false);

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

  // Elimina todas las instancias menos la que se va a crear
  const removeOtherInstances = async (sessionName: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const existingInstances = await fetch(`${apiUrl}/api/whatsapp/instances`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (existingInstances.ok) {
      const instances = await existingInstances.json();
      for (const instance of instances) {
        if (instance.name !== sessionName) {
          await fetch(`${apiUrl}/api/whatsapp/instances/${instance.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
        }
      }
    }
  };

  // Mostrar el formulario directamente en el dashboard, sin redirección
  const handleConnectWhatsApp = () => {
    setShowConnectionForm(true);
    setShowQRFromForm(false);
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

  // Nueva función para generar QR y eliminar todas las demás instancias
  const handleGenerateQR = async () => {
    if (!connectionForm.whatsappNumber || !connectionForm.sessionName) {
      setSendResult({ type: 'error', message: 'Por favor completa todos los campos' });
      return;
    }

    setGeneratingQR(true);
    setSendResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      // Elimina todas las instancias menos la que se va a crear
      setSendResult({ type: 'success', message: '🧹 Eliminando otras instancias...' });
      await removeOtherInstances(connectionForm.sessionName);

      // Verifica si existe una instancia con el mismo nombre y la elimina
      const existingInstances = await fetch(`${apiUrl}/api/whatsapp/instances`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      let instanceId = null;
      if (existingInstances.ok) {
        const instances = await existingInstances.json();
        const existingSession = instances.find((instance: any) => instance.name === connectionForm.sessionName);
        if (existingSession) {
          await fetch(`${apiUrl}/api/whatsapp/instances/${existingSession.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Crear la nueva instancia
      setSendResult({ type: 'success', message: '🔧 Creando nueva instancia...' });
      const createInstanceUrl = `${apiUrl}/api/whatsapp/instances`;
      const createResponse = await fetch(createInstanceUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionName: connectionForm.sessionName }),
      });
      const createData = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(`Error creating instance: ${createData.error || createData.details || 'Error desconocido'}`);
      }
      instanceId = createData.id;

      // Conectar la instancia y generar QR
      setSendResult({ type: 'success', message: '🔌 Iniciando conexión y generando QR...' });
      const connectUrl = `${apiUrl}/api/whatsapp/instances/${instanceId}/connect`;
      const connectResponse = await fetch(connectUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const connectData = await connectResponse.json();
      if (connectResponse.ok) {
        setSendResult({ type: 'success', message: '✅ Conexión iniciada. El código QR se generará en unos segundos...' });
        setShowQRFromForm(true);
        setTimeout(() => {
          setShowConnectionForm(false);
        }, 1000);
        setTimeout(() => {
          refreshInstances();
        }, 2000);
        setTimeout(() => {
          setSendResult({ type: 'success', message: '📱 Esperando código QR... Si no aparece en 30 segundos, refresca el QR.' });
        }, 4000);
      } else {
        throw new Error(`Error connecting instance: ${connectData.error || connectData.details || 'Error desconocido'}`);
      }
    } catch (error: any) {
      setSendResult({ type: 'error', message: `❌ ${error.message}` });
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleCancelConnection = () => {
    setShowConnectionForm(false);
    setConnectionForm({ whatsappNumber: '', sessionName: '' });
    setSendResult(null);
    setShowQRFromForm(false);
  };

  const handleCloseAllInstances = async () => {
    if (!confirm('¿Estás seguro de que quieres cerrar todas las instancias de WhatsApp? Esto desconectará todos los números conectados.')) {
      return;
    }

    setGeneratingQR(true);
    setSendResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/whatsapp/instances/close-all`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({ 
          type: 'success', 
          message: `✅ ${data.message}` 
        });
        
        // Refresh instances after closing all
        setTimeout(() => {
          refreshInstances();
        }, 2000);
      } else {
        setSendResult({ 
          type: 'error', 
          message: `❌ Error: ${data.error || 'Error desconocido'}` 
        });
      }
    } catch (error: any) {
      setSendResult({ 
        type: 'error', 
        message: `❌ Error de conexión: ${error.message}` 
      });
    } finally {
      setGeneratingQR(false);
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
        {/* Botones de control global */}
        {connectedInstances.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Control de Instancias
                    </h3>
                    <p className="text-sm text-gray-600">
                      {connectedInstances.length} instancia{connectedInstances.length !== 1 ? 's' : ''} conectada{connectedInstances.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleCloseAllInstances}
                    disabled={generatingQR}
                    size="sm"
                  >
                    {generatingQR ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Cerrando...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar Todas las Instancias
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda: Conectar WhatsApp */}
          <div className="space-y-6">
            {/* Botón Conectar WhatsApp / Formulario de Conexión */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Conectar WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mostrar el formulario siempre en el dashboard, sin redirección */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Proporciona los detalles de tu número de WhatsApp
                  </p>
                  {/* Número de WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de WhatsApp
                    </label>
                    <input
                      type="text"
                      value={connectionForm.whatsappNumber}
                      onChange={(e) => setConnectionForm({
                        ...connectionForm,
                        whatsappNumber: e.target.value 
                      })}
                      placeholder="+1234567890"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Incluye el código de país (ej: +52 para México)
                    </p>
                  </div>
                  {/* Nombre de la Sesión */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Sesión
                    </label>
                    <input
                      type="text"
                      value={connectionForm.sessionName}
                      onChange={(e) => setConnectionForm({
                        ...connectionForm,
                        sessionName: e.target.value 
                      })}
                      placeholder="Mi WhatsApp Business"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Un nombre descriptivo para identificar esta conexión
                    </p>
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
                  {/* Botones */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleGenerateQR}
                      disabled={generatingQR || !connectionForm.whatsappNumber || !connectionForm.sessionName}
                      className="flex-1"
                      size="lg"
                    >
                      <QrCode className={`h-4 w-4 mr-2 ${generatingQR ? 'animate-pulse' : ''}`} />
                      {generatingQR ? 'Generando...' : 'Generar Código QR'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelConnection}
                      disabled={generatingQR}
                      size="lg"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Selector de Sesión y Envío Rápido */}
            {connectedInstances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="h-5 w-5 mr-2" />
                    Enviar Mensaje Rápido
                  </CardTitle>
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
          {/* Columna Derecha: Código QR de sesión activa y demás controles */}
          <div className="space-y-6">
            {/* Mostrar QR siempre visible y refrescable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="h-5 w-5 mr-2" />
                  Código QR de tu sesión activa
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {connectedInstances.length > 0 && recentActivity?.latestQr ? (
                  <>
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
                    <p className="text-xs text-gray-500 mb-4">
                      Generado: {new Date(recentActivity.latestQr.timestamp).toLocaleString()}
                    </p>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        📱 Escanea este código con tu WhatsApp para conectar tu número
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={refreshInstances}
                      className="mt-4"
                      size="sm"
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refrescar QR
                    </Button>
                  </>
                ) : (
                  <div className="text-gray-500 py-8">
                    <p>No hay sesión activa. Conecta tu WhatsApp para ver el QR.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
