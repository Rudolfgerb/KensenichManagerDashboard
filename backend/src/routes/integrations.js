import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all integrations
router.get('/', (req, res) => {
  try {
    const integrations = db.prepare(`
      SELECT * FROM integrations
      ORDER BY connected DESC, name ASC
    `).all();

    res.json(integrations);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Connect an integration
router.post('/connect', (req, res) => {
  try {
    const { integrationId, name, apiKey, config } = req.body;

    const existing = db.prepare('SELECT * FROM integrations WHERE id = ?').get(integrationId);

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE integrations
        SET connected = 1, api_key = ?, config = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(apiKey, JSON.stringify(config || {}), integrationId);
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO integrations (id, name, api_key, config, connected)
        VALUES (?, ?, ?, ?, 1)
      `).run(integrationId || uuidv4(), name, apiKey, JSON.stringify(config || {}));
    }

    res.json({ success: true, message: 'Integration connected' });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect an integration
router.post('/disconnect', (req, res) => {
  try {
    const { integrationId } = req.body;

    db.prepare(`
      UPDATE integrations
      SET connected = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(integrationId);

    res.json({ success: true, message: 'Integration disconnected' });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics data (aggregated from all connected integrations)
router.get('/analytics', async (req, res) => {
  try {
    const connectedIntegrations = db.prepare(`
      SELECT * FROM integrations WHERE connected = 1
    `).all();

    // In real implementation, fetch from each API
    const mockAnalytics = {
      overview: {
        totalVisitors: 15420,
        totalPageviews: 48930,
        avgSessionDuration: '3:45',
        bounceRate: '42.3%',
        conversionRate: '3.2%'
      },
      googleAnalytics: {
        sessions: 12450,
        users: 8920,
        pageviews: 35600,
        avgSessionDuration: 225,
        bounceRate: 45.2,
        topPages: [
          { page: '/mutuus', views: 5420, avgTime: '4:12' },
          { page: '/landing', views: 3890, avgTime: '3:45' },
          { page: '/pricing', views: 2560, avgTime: '2:30' }
        ],
        trafficSources: [
          { source: 'Organic', sessions: 6200, percentage: 49.8 },
          { source: 'Direct', sessions: 3740, percentage: 30.0 },
          { source: 'Social', sessions: 1865, percentage: 15.0 },
          { source: 'Referral', sessions: 645, percentage: 5.2 }
        ]
      },
      socialMedia: {
        facebook: {
          followers: 2450,
          reach: 15600,
          engagement: 4.2,
          posts: 12,
          topPost: { text: 'New Feature Launch', likes: 340, shares: 89 }
        },
        instagram: {
          followers: 5680,
          reach: 28900,
          engagement: 6.8,
          posts: 18,
          topPost: { text: 'Behind the Scenes', likes: 780, comments: 124 }
        },
        tiktok: {
          followers: 12400,
          views: 145000,
          engagement: 8.5,
          videos: 25,
          topVideo: { title: 'Product Demo', views: 45000, likes: 3400 }
        },
        linkedin: {
          followers: 890,
          impressions: 12400,
          engagement: 3.4,
          posts: 8,
          topPost: { text: 'Company Update', reactions: 145, comments: 23 }
        },
        twitter: {
          followers: 3200,
          impressions: 45600,
          engagement: 2.8,
          tweets: 45,
          topTweet: { text: 'Product announcement', retweets: 89, likes: 234 }
        }
      },
      email: {
        gmail: {
          sent: 450,
          received: 1240,
          opened: 340,
          clicked: 89,
          openRate: 75.5,
          clickRate: 19.7
        },
        campaigns: [
          { name: 'Newsletter Q1', sent: 2400, opened: 1820, clicked: 450, revenue: 4500 },
          { name: 'Product Launch', sent: 5600, opened: 3920, clicked: 1240, revenue: 12800 },
          { name: 'Black Friday', sent: 8900, opened: 6780, clicked: 2340, revenue: 28900 }
        ]
      },
      timeSeries: generateTimeSeriesData()
    };

    res.json(mockAnalytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to generate time series data
function generateTimeSeriesData() {
  const data = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      visitors: Math.floor(300 + Math.random() * 200),
      pageviews: Math.floor(800 + Math.random() * 400),
      sessions: Math.floor(400 + Math.random() * 250),
      conversions: Math.floor(10 + Math.random() * 15)
    });
  }

  return data;
}

export default router;
