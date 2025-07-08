'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  MessageSquare,
  Zap,
  Users,
  BarChart3,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">
              ChatBot SaaS
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Comenzar Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4" variant="secondary">
            🚀 Platform White-Label
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Crea Chatbots de WhatsApp
            <br />
            <span className="text-blue-600">Sin Programar</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma SaaS white-label que permite a tus clientes conectar
            WhatsApp y crear chatbots inteligentes con un wizard visual
            intuitivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8">
                Probar Demo Gratis
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Ver Video Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para automatizar WhatsApp
            </h2>
            <p className="text-lg text-gray-600">
              Funcionalidades profesionales para crear experiencias
              conversacionales increíbles
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <Zap className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Wizard Visual</CardTitle>
                <CardDescription>
                  Crear flujos de conversación con drag & drop sin conocimientos
                  técnicos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Conexión WhatsApp</CardTitle>
                <CardDescription>
                  Conecta múltiples números de WhatsApp con escaneo QR simple
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Multi-Tenant</CardTitle>
                <CardDescription>
                  Cada cliente tiene su propia instancia con branding
                  personalizado
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-orange-600 mb-2" />
                <CardTitle>Analytics Avanzados</CardTitle>
                <CardDescription>
                  Métricas detalladas de conversaciones, rendimiento y
                  engagement
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <Shield className="h-10 w-10 text-red-600 mb-2" />
                <CardTitle>Seguridad Enterprise</CardTitle>
                <CardDescription>
                  Encriptación end-to-end y cumplimiento de estándares de
                  seguridad
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-emerald-600 mb-2" />
                <CardTitle>Handoff a Humanos</CardTitle>
                <CardDescription>
                  Transferencia fluida a agentes humanos cuando sea necesario
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para revolucionar tu atención al cliente?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de empresas que ya automatizaron WhatsApp con
            nuestra plataforma
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Comenzar Trial Gratuito
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <MessageSquare className="h-6 w-6" />
            <span className="text-xl font-bold">ChatBot SaaS</span>
          </div>
          <p className="text-gray-400">
            © 2024 ChatBot SaaS. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
