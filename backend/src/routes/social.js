import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, runAsync, getAsync, allAsync } from '../db.js';

const router = express.Router();

// Promisified db methods
const dbWrapper = {
  run: (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
  get: (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  })
};

// Platform icons mapping
const PLATFORM_ICONS = {
  'Instagram': '📸',
  'YouTube': '📺',
  'TikTok': '🎵',
  'Twitter/X': '🐦',
  'LinkedIn': '💼',
  'Facebook': '👥'
};

// Get all social profiles
router.get('/profiles', async (req, res) => {
  try {
    const profiles = await dbWrapper.all('SELECT * FROM social_profiles ORDER BY platform');

    const transformedProfiles = profiles.map(p => ({
      id: p.id,
      platform: p.platform,
      username: p.username || '',
      connected: p.connected === 1,
      followers: p.followers || 0,
      following: p.following || 0,
      posts: p.posts || 0,
      engagement_rate: p.engagement_rate || 0,
      lastSync: p.last_sync,
      icon: PLATFORM_ICONS[p.platform] || '🌐'
    }));

    res.json(transformedProfiles);
  } catch (error) {
    console.error('Error fetching social profiles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single profile
router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await dbWrapper.get('SELECT * FROM social_profiles WHERE id = ?', [req.params.id]);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      id: profile.id,
      platform: profile.platform,
      username: profile.username,
      connected: profile.connected === 1,
      followers: profile.followers,
      following: profile.following,
      posts: profile.posts,
      engagement_rate: profile.engagement_rate,
      lastSync: profile.last_sync,
      profileData: profile.profile_data ? JSON.parse(profile.profile_data) : null,
      icon: PLATFORM_ICONS[profile.platform] || '🌐'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connect social profile
router.post('/profiles/:id/connect', async (req, res) => {
  try {
    const { username, accessToken, refreshToken, tokenExpiresAt } = req.body;

    await dbWrapper.run(`
      UPDATE social_profiles SET
        username = ?,
        access_token = ?,
        refresh_token = ?,
        token_expires_at = ?,
        connected = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [username, accessToken, refreshToken, tokenExpiresAt, req.params.id]);

    const profile = await dbWrapper.get('SELECT * FROM social_profiles WHERE id = ?', [req.params.id]);

    res.json({
      id: profile.id,
      platform: profile.platform,
      username: profile.username,
      connected: true,
      message: `${profile.platform} connected successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect social profile
router.post('/profiles/:id/disconnect', async (req, res) => {
  try {
    await dbWrapper.run(`
      UPDATE social_profiles SET
        access_token = NULL,
        refresh_token = NULL,
        token_expires_at = NULL,
        connected = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    res.json({ success: true, message: 'Profile disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile metrics
router.put('/profiles/:id/metrics', async (req, res) => {
  try {
    const { followers, following, posts, engagement_rate } = req.body;

    await dbWrapper.run(`
      UPDATE social_profiles SET
        followers = COALESCE(?, followers),
        following = COALESCE(?, following),
        posts = COALESCE(?, posts),
        engagement_rate = COALESCE(?, engagement_rate),
        last_sync = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [followers, following, posts, engagement_rate, req.params.id]);

    // Also save to metrics history
    await dbWrapper.run(`
      INSERT INTO social_metrics (id, profile_id, metric_date, followers, following, posts, engagement_rate)
      VALUES (?, ?, date('now'), ?, ?, ?, ?)
    `, [uuidv4(), req.params.id, followers || 0, following || 0, posts || 0, engagement_rate || 0]);

    const profile = await dbWrapper.get('SELECT * FROM social_profiles WHERE id = ?', [req.params.id]);
    res.json({
      id: profile.id,
      platform: profile.platform,
      followers: profile.followers,
      following: profile.following,
      posts: profile.posts,
      engagement_rate: profile.engagement_rate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get metrics history for a profile
router.get('/profiles/:id/metrics', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const metrics = await dbWrapper.all(`
      SELECT * FROM social_metrics
      WHERE profile_id = ?
      AND metric_date >= date('now', '-${parseInt(days)} days')
      ORDER BY metric_date DESC
    `, [req.params.id]);

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get aggregated analytics for all connected profiles
router.get('/analytics', async (req, res) => {
  try {
    const profiles = await dbWrapper.all('SELECT * FROM social_profiles WHERE connected = 1');

    const totalFollowers = profiles.reduce((sum, p) => sum + (p.followers || 0), 0);
    const totalPosts = profiles.reduce((sum, p) => sum + (p.posts || 0), 0);
    const avgEngagement = profiles.length > 0
      ? profiles.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / profiles.length
      : 0;

    // Get recent metrics for growth calculation
    const recentMetrics = await dbWrapper.all(`
      SELECT profile_id, followers FROM social_metrics
      WHERE metric_date = date('now', '-30 days')
    `);

    const metricsMap = new Map(recentMetrics.map(m => [m.profile_id, m.followers]));
    let growthLast30 = 0;
    profiles.forEach(p => {
      const oldFollowers = metricsMap.get(p.id) || p.followers;
      growthLast30 += (p.followers || 0) - oldFollowers;
    });

    res.json({
      total_followers: totalFollowers,
      total_posts: totalPosts,
      avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
      growth_last_30: growthLast30,
      connected_platforms: profiles.length,
      platforms: profiles.map(p => ({
        platform: p.platform,
        followers: p.followers,
        posts: p.posts,
        engagement_rate: p.engagement_rate,
        icon: PLATFORM_ICONS[p.platform] || '🌐'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync profile from external API (placeholder for OAuth integration)
router.post('/profiles/:id/sync', async (req, res) => {
  try {
    const profile = await dbWrapper.get('SELECT * FROM social_profiles WHERE id = ?', [req.params.id]);

    if (!profile || !profile.connected) {
      return res.status(400).json({ error: 'Profile not connected' });
    }

    // TODO: Implement actual API calls to each platform
    // For now, return a placeholder response
    res.json({
      success: true,
      message: `Sync for ${profile.platform} would happen here with OAuth`,
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
