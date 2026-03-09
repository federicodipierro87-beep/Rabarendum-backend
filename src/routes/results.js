const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/results - Get rankings by category
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const showPublic = req.query.public === 'true';

    // For non-admin users, only show if public flag is set by admin
    // For now, we'll allow all authenticated users to see results
    // In production, you might want to add a setting to control this

    const participants = await prisma.participant.findMany({
      include: {
        votes: true
      }
    });

    // Calculate averages and group by category
    const results = {
      CARRI: [],
      GRUPPI: [],
      TENDINE: [],
      GUGGEN: []
    };

    participants.forEach(participant => {
      const voteCount = participant.votes.length;
      const totalScore = participant.votes.reduce((sum, v) => sum + v.score, 0);
      const average = voteCount > 0 ? totalScore / voteCount : 0;

      results[participant.category].push({
        id: participant.id,
        name: participant.name,
        category: participant.category,
        average: Math.round(average * 100) / 100,
        voteCount,
        totalScore
      });
    });

    // Sort each category by average (descending)
    Object.keys(results).forEach(category => {
      results[category].sort((a, b) => b.average - a.average);
    });

    // Get voting progress stats (admin only)
    let stats = null;
    if (isAdmin) {
      const totalJurors = await prisma.user.count({
        where: { role: 'JUROR' }
      });

      const totalParticipants = await prisma.participant.count();

      const votesPerJuror = await prisma.vote.groupBy({
        by: ['userId'],
        _count: true
      });

      const jurorsCompleted = votesPerJuror.filter(
        j => j._count === totalParticipants
      ).length;

      stats = {
        totalJurors,
        totalParticipants,
        jurorsCompleted,
        votesPerJuror: votesPerJuror.map(v => ({
          userId: v.userId,
          voteCount: v._count
        }))
      };
    }

    res.json({ results, stats });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
});

// GET /api/results/progress - Get voting progress (admin only)
router.get('/progress', auth, admin, async (req, res) => {
  try {
    const jurors = await prisma.user.findMany({
      where: { role: 'JUROR' },
      select: {
        id: true,
        name: true,
        username: true,
        _count: {
          select: { votes: true }
        }
      }
    });

    const totalParticipants = await prisma.participant.count();

    const progress = jurors.map(juror => ({
      id: juror.id,
      name: juror.name,
      username: juror.username,
      votesCount: juror._count.votes,
      totalParticipants,
      completed: juror._count.votes === totalParticipants,
      percentage: totalParticipants > 0
        ? Math.round((juror._count.votes / totalParticipants) * 100)
        : 0
    }));

    res.json({ progress, totalParticipants });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress.' });
  }
});

module.exports = router;
