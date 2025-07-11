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
  Bot, 
  Wand2, 
  MessageSquare,
  Plus,
  Save,
  Play
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface ChatbotStep {
  id: string;
  type: 'message' | 'question' | 'action';
  content: string;
  responses?: string[];
}

function NewChatbotContent() {
  const router = useRouter();
  const [chatbotName, setChatbotName] = useState('');
  const [chatbotDescription, setChatbotDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [steps, setSteps] = useState<ChatbotStep[]>([]);
  const [error, setError] = useState('');
  const [triggerType, setTriggerType] = useState<'WELCOME' | 'KEYWORD' | 'EXACT_MESSAGE' | 'TIME_BASED'>('WELCOME');
  const [triggerValue, setTriggerValue] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [instances, setInstances] = useState<any[]>([]);

  // Cargar instancias de WhatsApp al montar
  React.useEffect(() => {
    const fetchInstances = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`${apiUrl}/api/whatsapp/instances`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          const text = await res.text();
          setError(`Error al cargar instancias: ${text}`);
          console.error('Error al cargar instancias:', text);
          return;
        }
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          setError('Respuesta inválida del backend (no es JSON)');
          console.error('Respuesta inválida del backend:', jsonErr);
          return;
        }
        setInstances(data);
      } catch (e) {
        setError('Error de red al cargar instancias');
        console.error('Error de red al cargar instancias:', e);
      }
    };
    fetchInstances();
  }, []);

  const addStep = (type: 'message' | 'question' | 'action') => {
    const newStep: ChatbotStep = {
      id: Date.now().toString(),
      type,
      content: '',
      responses: type === 'question' ? [''] : undefined
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, field: string, value: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const addResponse = (stepId: string) => {
    setSteps(steps.map(step => 
      step.id === stepId && step.responses 
        ? { ...step, responses: [...step.responses, ''] }
        : step
    ));
  };

  const updateResponse = (stepId: string, responseIndex: number, value: string) => {
    setSteps(steps.map(step => 
      step.id === stepId && step.responses
        ? { 
            ...step, 
            responses: step.responses.map((r, i) => i === responseIndex ? value : r)
          }
        : step
    ));
  };

  const saveChatbot = async () => {
    setError('');
    if (!chatbotName.trim()) {
      setError('El nombre del chatbot es requerido');
      return;
    }
    if (steps.length === 0) {
      setError('Agrega al menos un paso al flujo de conversación');
      return;
    }
    if (!whatsappInstanceId) {
      setError('Selecciona una instancia de WhatsApp');
      return;
    }
    if (!triggerType || !triggerValue) {
      setError('Completa el tipo y valor de disparador');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // 1. Crear el chatbot
      const chatbotRes = await fetch(`${apiUrl}/api/chatbots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: chatbotName,
          description: chatbotDescription,
          welcomeMessage,
          triggerType,
          triggerValue,
          whatsappInstanceId
        })
      });

      if (!chatbotRes.ok) {
        const err = await chatbotRes.json();
        throw new Error(err.error || 'Error al crear el chatbot');
      }
      const chatbot = await chatbotRes.json();

      // 2. Crear los flujos (steps)
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const flowRes = await fetch(`${apiUrl}/api/chatbots/${chatbot.id}/flows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: step.type === 'message' ? `Mensaje ${i+1}` : `Pregunta ${i+1}`,
            stepOrder: i + 1,
            stepType: step.type === 'question' ? 'RESPONSE' : 'TRIGGER',
            triggerCondition: step.type === 'message' ? 'welcome' : undefined,
            responseType: step.type === 'question' ? 'BUTTON' : 'TEXT',
            responseContent: step.content,
            buttons: step.type === 'question' ? step.responses?.filter(Boolean) : undefined,
          })
        });
        if (!flowRes.ok) {
          const err = await flowRes.json();
          throw new Error(err.error || 'Error al crear el flujo');
        }
      }

      // Éxito
      alert('¡Chatbot guardado exitosamente!');
      router.push('/dashboard/chatbots');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el chatbot');
    }
  };

  const testChatbot = () => {
    if (!chatbotName.trim()) {
      setError('Guarda el chatbot primero');
      return;
    }

    alert('Función de prueba no implementada aún');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Chatbot</h1>
          <p className="text-gray-600">
            Usa el wizard visual para crear flujos de conversación inteligentes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuración Básica */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  Configuración Básica
                </CardTitle>
                <CardDescription>
                  Define los aspectos básicos de tu chatbot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Chatbot</Label>
                    <Input
                      id="name"
                      value={chatbotName}
                      onChange={(e) => setChatbotName(e.target.value)}
                      placeholder="Ej: Atención al Cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={chatbotDescription}
                      onChange={(e) => setChatbotDescription(e.target.value)}
                      placeholder="Breve descripción del propósito"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome">Mensaje de Bienvenida</Label>
                  <Input
                    id="welcome"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="triggerType">Tipo de Disparador</Label>
                    <select
                      id="triggerType"
                      className="w-full border rounded p-2"
                      value={triggerType}
                      onChange={e => setTriggerType(e.target.value as any)}
                    >
                      <option value="WELCOME">Bienvenida</option>
                      <option value="KEYWORD">Palabra clave</option>
                      <option value="EXACT_MESSAGE">Mensaje exacto</option>
                      <option value="TIME_BASED">Por horario</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="triggerValue">Valor del Disparador</Label>
                    <Input
                      id="triggerValue"
                      value={triggerValue}
                      onChange={e => setTriggerValue(e.target.value)}
                      placeholder={triggerType === 'WELCOME' ? 'welcome' : 'Ej: hola, info, etc.'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsappInstanceId">Instancia de WhatsApp</Label>
                    <select
                      id="whatsappInstanceId"
                      className="w-full border rounded p-2"
                      value={whatsappInstanceId}
                      onChange={e => setWhatsappInstanceId(e.target.value)}
                    >
                      <option value="">Selecciona una instancia</option>
                      {instances.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.sessionName || inst.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Constructor de Flujo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wand2 className="h-5 w-5 mr-2" />
                    Constructor de Flujo
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => addStep('message')}>
                      <Plus className="h-4 w-4 mr-1" />
                      Mensaje
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addStep('question')}>
                      <Plus className="h-4 w-4 mr-1" />
                      Pregunta
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Arrastra y crea el flujo de conversación
                </CardDescription>
              </CardHeader>
              <CardContent>
                {steps.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Sin pasos definidos
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Agrega mensajes y preguntas para crear tu flujo de conversación
                    </p>
                    <div className="flex justify-center space-x-2">
                      <Button onClick={() => addStep('message')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Mensaje
                      </Button>
                      <Button variant="outline" onClick={() => addStep('question')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Pregunta
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={step.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                              {index + 1}
                            </span>
                            <span className="font-medium capitalize">{step.type}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStep(step.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label>Contenido</Label>
                            <Input
                              value={step.content}
                              onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                              placeholder={
                                step.type === 'message' 
                                  ? 'Escribe el mensaje...'
                                  : 'Escribe la pregunta...'
                              }
                            />
                          </div>

                          {step.type === 'question' && step.responses && (
                            <div>
                              <Label>Opciones de Respuesta</Label>
                              {step.responses.map((response, responseIndex) => (
                                <div key={responseIndex} className="flex mt-2">
                                  <Input
                                    value={response}
                                    onChange={(e) => updateResponse(step.id, responseIndex, e.target.value)}
                                    placeholder={`Opción ${responseIndex + 1}`}
                                    className="mr-2"
                                  />
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addResponse(step.id)}
                                className="mt-2"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar Opción
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel Lateral */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
                <CardDescription>
                  Guarda y prueba tu chatbot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={saveChatbot} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Chatbot
                </Button>
                <Button onClick={testChatbot} variant="outline" className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Probar Chatbot
                </Button>
              </CardContent>
            </Card>

            {/* Vista Previa */}
            {welcomeMessage && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Vista Previa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-100 rounded-lg p-3 mb-3">
                    <p className="text-sm">{welcomeMessage}</p>
                  </div>
                  {steps.map((step) => (
                    <div key={step.id} className="mb-2">
                      {step.type === 'message' && step.content && (
                        <div className="bg-green-100 rounded-lg p-2">
                          <p className="text-xs">{step.content}</p>
                        </div>
                      )}
                      {step.type === 'question' && step.content && (
                        <div className="bg-blue-100 rounded-lg p-2">
                          <p className="text-xs font-medium">{step.content}</p>
                          {step.responses?.map((response, i) => (
                            response && (
                              <div key={i} className="bg-white rounded px-2 py-1 mt-1 text-xs">
                                {i + 1}. {response}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewChatbotPage() {
  return (
    <ProtectedRoute>
      <NewChatbotContent />
    </ProtectedRoute>
  );
}
