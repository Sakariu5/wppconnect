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
import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth';

const prisma = new PrismaClient();

export interface TenantRequest extends AuthenticatedRequest {
  tenant?: {
    id: string;
    subdomain: string;
    name: string;
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    plan: string;
  };
}

export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });

    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ error: 'Tenant not found or inactive.' });
    }

    req.tenant = {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      logo: tenant.logo || undefined,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      plan: tenant.plan,
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error verifying tenant.' });
  }
};
