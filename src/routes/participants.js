const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();
const prisma = new PrismaClient();

const VALID_CATEGORIES = ['CARRI', 'GRUPPI', 'TENDINE', 'GUGGEN'];

// GET /api/participants - List all participants (grouped by category)
router.get('/', auth, async (req, res) => {
  try {
    const participants = await prisma.participant.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Group by category
    const grouped = {
      CARRI: [],
      GRUPPI: [],
      TENDINE: [],
      GUGGEN: []
    };

    participants.forEach(p => {
      grouped[p.category].push(p);
    });

    res.json({ participants: grouped });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Failed to fetch participants.' });
  }
});

// POST /api/participants - Add participant (admin only)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required.' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    const participant = await prisma.participant.create({
      data: { name, category }
    });

    res.status(201).json({ participant });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Participant already exists in this category.' });
    }
    console.error('Create participant error:', error);
    res.status(500).json({ error: 'Failed to create participant.' });
  }
});

// PUT /api/participants/:id - Update participant (admin only)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    const participant = await prisma.participant.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(category && { category })
      }
    });

    res.json({ participant });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Participant not found.' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Participant already exists in this category.' });
    }
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Failed to update participant.' });
  }
});

// DELETE /api/participants/:id - Delete participant (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.participant.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Participant deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Participant not found.' });
    }
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Failed to delete participant.' });
  }
});

module.exports = router;
