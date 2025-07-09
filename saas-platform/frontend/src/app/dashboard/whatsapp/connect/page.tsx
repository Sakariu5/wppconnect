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

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  MessageSquare
} from 'lucide-react';

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const [step, setStep] = useState<'setup' | 'qr' | 'connecting' | 'connected'>('setup');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    
    if (!phoneNumber || !sessionName) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Simular proceso de conexión
    setStep('qr');
    
    // Simular generación de QR (en producción se generaría un QR real)
    setTimeout(() => {
      setQrCode('generated'); // Solo indicamos que el QR fue "generado"
    }, 1000);
  };

  const simulateConnection = () => {
    setStep('connecting');
    setTimeout(() => {
      setStep('connected');
    }, 3000);
  };

  const goBack = () => {
    if (step === 'setup') {
      router.push('/dashboard');
    } else {
      setStep('setup');
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
                    {/* Usando un placeholder para el QR - en producción se generaría un QR real */}
                    <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium">Código QR</p>
                        <p className="text-xs text-gray-400">WhatsApp Connection</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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

              <Button onClick={simulateConnection} className="w-full max-w-sm">
                Simular Conexión (Demo)
              </Button>
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
                Estableciendo conexión con WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">
                Por favor espera mientras establecemos la conexión...
              </p>
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
