import { Request, Response, NextFunction } from 'express';
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
    res.status(500).json({ error: 'Error verifying tenant.' });
  }
};
