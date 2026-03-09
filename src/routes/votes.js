const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/votes - Cast a vote
router.post('/', auth, async (req, res) => {
  try {
    const { participantId, score } = req.body;
    const userId = req.user.id;

    if (participantId === undefined || score === undefined) {
      return res.status(400).json({ error: 'participantId and score are required.' });
    }

    // Validate score
    if (score < 0 || score > 20 || !Number.isInteger(score)) {
      return res.status(400).json({ error: 'Score must be an integer between 0 and 20.' });
    }

    // Check participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    // Upsert vote (create or update)
    const vote = await prisma.vote.upsert({
      where: {
        userId_participantId: {
          userId,
          participantId
        }
      },
      update: { score },
      create: {
        userId,
        participantId,
        score
      },
      include: {
        participant: true
      }
    });

    res.json({ vote });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to cast vote.' });
  }
});

// GET /api/votes/my - Get current user's votes
router.get('/my', auth, async (req, res) => {
  try {
    const votes = await prisma.vote.findMany({
      where: { userId: req.user.id },
      include: {
        participant: true
      },
      orderBy: {
        participant: {
          category: 'asc'
        }
      }
    });

    // Create a map of participantId -> score for easy lookup
    const votesMap = {};
    votes.forEach(vote => {
      votesMap[vote.participantId] = vote.score;
    });

    res.json({ votes, votesMap });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ error: 'Failed to fetch votes.' });
  }
});

// DELETE /api/votes/:participantId - Remove a vote
router.delete('/:participantId', auth, async (req, res) => {
  try {
    const participantId = parseInt(req.params.participantId);
    const userId = req.user.id;

    await prisma.vote.delete({
      where: {
        userId_participantId: {
          userId,
          participantId
        }
      }
    });

    res.json({ message: 'Vote removed successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vote not found.' });
    }
    console.error('Delete vote error:', error);
    res.status(500).json({ error: 'Failed to delete vote.' });
  }
});

module.exports = router;
