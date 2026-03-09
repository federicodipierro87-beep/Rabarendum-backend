const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users - List all jurors (admin only)
router.get('/', auth, admin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'JUROR' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { votes: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST /api/users - Create juror (admin only)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: 'JUROR'
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ user });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Update juror (admin only)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id - Delete juror (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    // Only allow deleting jurors, not admins
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot delete admin users.' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found.' });
    }
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
