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
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  tenantName: Joi.string().required(),
  subdomain: Joi.string().alphanum().min(3).max(20).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  subdomain: Joi.string().optional(),
});

// Register new tenant and admin user (temporary mock)
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName, tenantName, subdomain } =
      value;

    // Mock validation - normally would check database
    if (subdomain === 'test' || email === 'test@example.com') {
      return res
        .status(400)
        .json({ error: 'Subdomain or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mock user and tenant creation
    const mockResult = {
      user: {
        id: 'user_' + Date.now(),
        email,
        firstName,
        lastName,
        role: 'ADMIN',
      },
      tenant: {
        id: 'tenant_' + Date.now(),
        subdomain,
        name: tenantName,
        plan: 'FREE',
      },
    };

    // Generate JWT
    const token = jwt.sign(
      {
        id: mockResult.user.id,
        email: mockResult.user.email,
        role: mockResult.user.role,
        tenantId: mockResult.tenant.id,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: mockResult.user,
      tenant: mockResult.tenant,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Login (mock)
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, subdomain } = value;

    // Mock login
    if (email !== 'test@example.com' || password !== 'password123') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Mock user data
    const mockUser = {
      id: 'user_123',
      email,
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN',
      lastLogin: new Date(),
    };

    const mockTenant = {
      id: 'tenant_123',
      subdomain: subdomain || 'test',
      name: 'Test Company',
      logo: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      plan: 'FREE',
    };

    // Generate JWT
    const token = jwt.sign(
      {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockTenant.id,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: mockUser,
      tenant: mockTenant,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as any;

    // Mock user verification
    const mockUser = {
      id: decoded.id,
      email: decoded.email,
      firstName: 'Test',
      lastName: 'User',
      role: decoded.role,
    };

    const mockTenant = {
      id: decoded.tenantId,
      subdomain: 'test',
      name: 'Test Company',
      logo: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      plan: 'FREE',
    };

    res.json({
      valid: true,
      user: mockUser,
      tenant: mockTenant,
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

export default router;
