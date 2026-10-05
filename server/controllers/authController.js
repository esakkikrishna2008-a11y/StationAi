import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import { config } from '../config/config.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (config.nodeEnv !== 'production') {
      console.log(`[AUTH] Login request received for email: ${email.trim()}`);
    }

    const db = await getDb();
    const user = await db.get(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);

    if (!user) {
      if (config.nodeEnv !== 'production') {
        console.log(`[AUTH] User not found for email: ${email.trim()}`);
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (config.nodeEnv !== 'production') {
      console.log(`[AUTH] User found: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      if (config.nodeEnv !== 'production') {
        console.log(`[AUTH] Password verification failed for: ${user.email}`);
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (config.nodeEnv !== 'production') {
      console.log(`[AUTH] Password verification successful for: ${user.email}`);
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopName: user.shop_name,
      phone: user.phone
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    if (config.nodeEnv !== 'production') {
      console.log(`[AUTH] JWT generated successfully for user ID: ${user.id} (${user.role})`);
    }

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopName: user.shop_name,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
}

export async function register(req, res) {
  try {
    const { name, email, password, shopName, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const db = await getDb();
    const existing = await db.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);

    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      `INSERT INTO users (name, email, password, role, shop_name, phone)
       VALUES (?, ?, ?, 'ADMIN', ?, ?)`,
      [name.trim(), email.trim(), hashedPassword, shopName || 'StationAI Store', phone || '']
    );

    const newUser = await db.get(`SELECT id, name, email, role, shop_name, phone, created_at FROM users WHERE id = ?`, [result.lastID]);

    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        shopName: newUser.shop_name,
        phone: newUser.phone
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        shopName: newUser.shop_name,
        phone: newUser.phone,
        createdAt: newUser.created_at
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
}

export async function getProfile(req, res) {
  try {
    const db = await getDb();
    const user = await db.get(
      `SELECT id, name, email, role, shop_name as shopName, phone, created_at as createdAt FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, shopName, phone, email } = req.body;
    const db = await getDb();

    if (email && email !== req.user.email) {
      const existing = await db.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?`, [email.trim(), req.user.id]);
      if (existing) {
        return res.status(400).json({ error: 'Email is already taken by another account' });
      }
    }

    await db.run(
      `UPDATE users
       SET name = COALESCE(?, name),
           shop_name = COALESCE(?, shop_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, shopName, phone, email, req.user.id]
    );

    const updated = await db.get(
      `SELECT id, name, email, role, shop_name as shopName, phone, created_at as createdAt FROM users WHERE id = ?`,
      [req.user.id]
    );

    const token = jwt.sign(
      {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        shopName: updated.shopName,
        phone: updated.phone
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      message: 'Profile updated successfully',
      token,
      user: updated
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
}
