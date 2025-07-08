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
import { useAuth } from '@/stores/auth';
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
  Settings, 
  User,
  Building,
  Palette,
  Save,
  Eye,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'appearance' | 'security'>('profile');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // Company form
  const [companyData, setCompanyData] = useState({
    name: tenant?.name || '',
    subdomain: tenant?.subdomain || '',
  });

  // Appearance form
  const [appearanceData, setAppearanceData] = useState({
    primaryColor: tenant?.primaryColor || '#3B82F6',
    secondaryColor: tenant?.secondaryColor || '#1F2937',
  });

  // Security form
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileSave = () => {
    setError('');
    setSuccess('Perfil actualizado correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCompanySave = () => {
    setError('');
    setSuccess('Información de empresa actualizada');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAppearanceSave = () => {
    setError('');
    setSuccess('Configuración de apariencia guardada');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSecuritySave = () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (securityData.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    setSuccess('Contraseña actualizada correctamente');
    setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setSuccess(''), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'company', label: 'Empresa', icon: Building },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
    { id: 'security', label: 'Seguridad', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Cuenta</h1>
          <p className="text-gray-600">
            Gestiona tu perfil, empresa y configuraciones
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {(success || error) && (
              <div className="mb-6">
                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Información Personal
                  </CardTitle>
                  <CardDescription>
                    Actualiza tu información personal y de contacto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleProfileSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Información de Empresa
                  </CardTitle>
                  <CardDescription>
                    Configura los datos de tu empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nombre de la Empresa</Label>
                    <Input
                      id="companyName"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdominio</Label>
                    <div className="flex">
                      <Input
                        id="subdomain"
                        value={companyData.subdomain}
                        onChange={(e) => setCompanyData({...companyData, subdomain: e.target.value})}
                        className="rounded-r-none"
                        readOnly
                      />
                      <div className="bg-gray-100 border border-l-0 rounded-r-md px-3 py-2 text-sm text-gray-500">
                        .wppconnect.app
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      El subdominio no se puede cambiar. Contacta soporte si necesitas modificarlo.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Eye className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="font-medium text-blue-900">Plan Actual: {tenant?.plan}</p>
                        <p className="text-sm text-blue-700">
                          Actualiza tu plan para acceder a más funcionalidades
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleCompanySave}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="h-5 w-5 mr-2" />
                    Personalización de Apariencia
                  </CardTitle>
                  <CardDescription>
                    Personaliza los colores de tu plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Color Primario</Label>
                      <div className="flex">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={appearanceData.primaryColor}
                          onChange={(e) => setAppearanceData({...appearanceData, primaryColor: e.target.value})}
                          className="w-16 h-10 rounded-r-none p-1"
                        />
                        <Input
                          value={appearanceData.primaryColor}
                          onChange={(e) => setAppearanceData({...appearanceData, primaryColor: e.target.value})}
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Color Secundario</Label>
                      <div className="flex">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={appearanceData.secondaryColor}
                          onChange={(e) => setAppearanceData({...appearanceData, secondaryColor: e.target.value})}
                          className="w-16 h-10 rounded-r-none p-1"
                        />
                        <Input
                          value={appearanceData.secondaryColor}
                          onChange={(e) => setAppearanceData({...appearanceData, secondaryColor: e.target.value})}
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium mb-2">Vista Previa</p>
                    <div className="flex space-x-2">
                      <div 
                        className="w-12 h-8 rounded"
                        style={{ backgroundColor: appearanceData.primaryColor }}
                      ></div>
                      <div 
                        className="w-12 h-8 rounded"
                        style={{ backgroundColor: appearanceData.secondaryColor }}
                      ></div>
                    </div>
                  </div>
                  <Button onClick={handleAppearanceSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Seguridad
                  </CardTitle>
                  <CardDescription>
                    Cambia tu contraseña y configura la seguridad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleSecuritySave}>
                    <Save className="h-4 w-4 mr-2" />
                    Cambiar Contraseña
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
