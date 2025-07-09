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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Phone, 
  QrCode, 
  Loader2, 
  CheckCircle,
  Wifi,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const [step, setStep] = useState<'setup' | 'qr' | 'connecting' | 'connected' | 'error'>('setup');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');

  // API function to get auth token (assuming it's stored in localStorage)
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  // Create WhatsApp instance
  const createWhatsAppInstance = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/api/whatsapp/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating WhatsApp instance');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating instance:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Connect WhatsApp instance
  const connectWhatsAppInstance = async (instanceId: string) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error connecting WhatsApp instance');
      }

      return await response.json();
    } catch (error) {
      console.error('Error connecting instance:', error);
      throw error;
    }
  };

  // Poll for QR code and status
  const pollQRCodeAndStatus = async (instanceId: string) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}/qr`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching QR code');
      }

      const data = await response.json();
      
      if (data.qrCode && data.qrCode !== qrCode) {
        setQrCode(data.qrCode);
      }

      setConnectionStatus(data.status);

      // Handle status changes
      if (data.status === 'CONNECTED') {
        setStep('connected');
        return false; // Stop polling
      } else if (data.status === 'ERROR') {
        setError('Error de conexión. Por favor intenta nuevamente.');
        setStep('error');
        return false; // Stop polling
      } else if (data.status === 'QR_CODE' && !qrCode) {
        setStep('qr');
      }

      return true; // Continue polling
    } catch (error) {
      console.error('Error polling QR code:', error);
      return true; // Continue polling even on error
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    
    if (!phoneNumber || !sessionName) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      // Create WhatsApp instance
      const instance = await createWhatsAppInstance();
      setInstanceId(instance.id);

      // Connect the instance
      await connectWhatsAppInstance(instance.id);
      
      setStep('connecting');

      // Start polling for QR code and status
      const pollInterval = setInterval(async () => {
        const shouldContinue = await pollQRCodeAndStatus(instance.id);
        if (!shouldContinue) {
          clearInterval(pollInterval);
        }
      }, 2000);

      // Clean up interval after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (step !== 'connected') {
          setError('Tiempo de conexión agotado. Por favor intenta nuevamente.');
          setStep('error');
        }
      }, 300000); // 5 minutes

    } catch (error: any) {
      setError(error.message || 'Error al crear la conexión');
      setStep('error');
    }
  };

  // Start connection process (for manual retry)
  const retryConnection = () => {
    setError('');
    setQrCode('');
    setStep('setup');
  };

  const goBack = () => {
    if (step === 'setup' || step === 'error') {
      router.push('/dashboard');
    } else {
      setStep('setup');
      setError('');
      setQrCode('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={goBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Conectar WhatsApp</h1>
          <p className="text-gray-600">
            Conecta tu número de WhatsApp para empezar a usar los chatbots
          </p>
        </div>

        {step === 'setup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Configuración de Número
              </CardTitle>
              <CardDescription>
                Proporciona los detalles de tu número de WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Número de WhatsApp</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Incluye el código de país (ej: +52 para México)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionName">Nombre de la Sesión</Label>
                  <Input
                    id="sessionName"
                    type="text"
                    placeholder="Mi WhatsApp Business"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Un nombre descriptivo para identificar esta conexión
                  </p>
                </div>

                <Button type="submit" className="w-full">
                  <QrCode className="h-4 w-4 mr-2" />
                  Generar Código QR
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'qr' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                Escanear Código QR
              </CardTitle>
              <CardDescription>
                Usa tu teléfono para escanear el código QR y conectar WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                {qrCode ? (
                  <div className="inline-block p-4 bg-white rounded-lg border">
                    <Image
                      src={qrCode}
                      alt="WhatsApp QR Code"
                      width={256}
                      height={256}
                      className="mx-auto"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Generando código QR...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm text-gray-600 mb-6">
                <p><strong>Instrucciones:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                  <li>Abre WhatsApp en tu teléfono</li>
                  <li>Ve a Configuración → Dispositivos vinculados</li>
                  <li>Toca &ldquo;Vincular un dispositivo&rdquo;</li>
                  <li>Escanea este código QR</li>
                </ol>
              </div>

              <Alert className="max-w-md mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  El código QR expira en 60 segundos. Si no logras escanearlo a tiempo, 
                  se generará uno nuevo automáticamente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {step === 'connecting' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wifi className="h-5 w-5 mr-2" />
                Conectando...
              </CardTitle>
              <CardDescription>
                Esperando a que escanees el código QR
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Esperando conexión de WhatsApp...
              </p>
              <p className="text-sm text-gray-500">
                Estado: {connectionStatus || 'Iniciando conexión...'}
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'error' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error de Conexión
              </CardTitle>
              <CardDescription>
                No se pudo establecer la conexión con WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={retryConnection}>
                  Intentar Nuevamente
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Volver al Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'connected' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                ¡Conexión Exitosa!
              </CardTitle>
              <CardDescription>
                Tu WhatsApp se ha conectado correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {sessionName}
                </h3>
                <p className="text-gray-600 mb-4">
                  Número: {phoneNumber}
                </p>
                <p className="text-sm text-gray-500">
                  Ya puedes crear chatbots y automatizar conversaciones
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push('/dashboard')}>
                  Ir al Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard/chatbots/new')}
                >
                  Crear Primer Chatbot
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
