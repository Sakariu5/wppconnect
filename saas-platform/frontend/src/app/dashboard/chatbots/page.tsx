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

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  ArrowLeft, 
  Bot, 
  Plus,
  MessageSquare,
  Activity,
  Settings,
  Play,
  Pause
} from 'lucide-react';

export default function ChatbotsPage() {
  const router = useRouter();

  // Datos simulados de chatbots
  const chatbots = [
    {
      id: 1,
      name: 'Atención al Cliente',
      description: 'Respuestas automáticas para consultas frecuentes',
      status: 'active',
      conversations: 247,
      responses: 89,
      lastActivity: '2 min ago'
    },
    {
      id: 2,
      name: 'Ventas Online',
      description: 'Asistente para proceso de compras',
      status: 'paused',
      conversations: 156,
      responses: 67,
      lastActivity: '1 hour ago'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Chatbots</h1>
              <p className="text-gray-600">
                Gestiona y configura tus chatbots de WhatsApp
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard/chatbots/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Chatbot
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Chatbots Activos
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chatbots.filter(c => c.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                de {chatbots.length} total
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
              <div className="text-2xl font-bold">
                {chatbots.reduce((acc, c) => acc + c.conversations, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% desde ayer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tasa de Respuesta
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(chatbots.reduce((acc, c) => acc + c.responses, 0) / chatbots.length)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio general
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chatbots List */}
        {chatbots.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin chatbots creados
              </h3>
              <p className="text-gray-600 mb-4">
                Crea tu primer chatbot para empezar a automatizar conversaciones
              </p>
              <Button onClick={() => router.push('/dashboard/chatbots/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Chatbot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        <Bot className="h-5 w-5 mr-2" />
                        {chatbot.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {chatbot.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          chatbot.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {chatbot.status === 'active' ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {chatbot.conversations}
                      </div>
                      <div className="text-xs text-gray-500">Conversaciones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {chatbot.responses}%
                      </div>
                      <div className="text-xs text-gray-500">Respuestas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {chatbot.lastActivity}
                      </div>
                      <div className="text-xs text-gray-500">Última actividad</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant={chatbot.status === 'active' ? 'outline' : 'default'}
                      >
                        {chatbot.status === 'active' ? (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                    <Button size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
