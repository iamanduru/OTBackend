// src/controllers/userController.js
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import validator from 'validator';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const { isEmail } = validator;

const requireTwoNames = (name) => {
  if (!name) return false;
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2;
};

export const createUser = async (req, res, next) => {
  try {
    let { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    if (!requireTwoNames(name)) {
      return res.status(400).json({ error: 'Name must contain at least two words' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check duplicate email
    const existing = await prisma.staffUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.staffUser.create({
      data: { name, email, passwordHash, role }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entity: 'StaffUser',
        entityId: user.id,
        action: 'CREATE',
        description: `User ${email} created by ${req.user?.userId || 'system'}`,
        staffId: req.user?.userId || user.id
      }
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.staffUser.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.staffUser.findUnique({
      where: { id: parseInt(id, 10) },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { name, email, role } = req.body;

    const data = {};

    if (name) {
      name = name.trim();
      if (!requireTwoNames(name)) {
        return res.status(400).json({ error: 'Name must contain at least two words' });
      }
      data.name = name;
    }

    if (email) {
      email = email.trim().toLowerCase();
      if (!isEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email belongs to another user
      const existing = await prisma.staffUser.findUnique({ where: { email } });
      if (existing && existing.id !== parseInt(id, 10)) {
        return res.status(409).json({ error: 'Email already in use by another user' });
      }
      data.email = email;
    }

    if (role) {
      data.role = role;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await prisma.staffUser.update({
      where: { id: parseInt(id, 10) },
      data
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entity: 'StaffUser',
        entityId: user.id,
        action: 'UPDATE',
        description: `User ${user.email} updated by ${req.user?.userId || 'system'}`,
        staffId: req.user?.userId || user.id
      }
    });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.staffUser.delete({
      where: { id: parseInt(id, 10) }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entity: 'StaffUser',
        entityId: user.id,
        action: 'DELETE',
        description: `User ${user.email} deleted by ${req.user?.userId || 'system'}`,
        staffId: req.user?.userId || user.id
      }
    });

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};
