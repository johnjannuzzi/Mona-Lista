const express = require('express');
const { nanoid } = require('nanoid');

module.exports = (pool) => {
  const router = express.Router();

  // Get all lists for user (hide claim info!)
  router.get('/', async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get lists with item count
      const listsResult = await pool.query(
        `SELECT l.*, 
                COUNT(i.id) as item_count
         FROM lists l
         LEFT JOIN items i ON l.id = i.list_id
         WHERE l.user_id = $1
         GROUP BY l.id
         ORDER BY l.created_at DESC`,
        [userId]
      );
      
      // Get preview images for each list (up to 3 items with images)
      const lists = await Promise.all(listsResult.rows.map(async (list) => {
        const imagesResult = await pool.query(
          `SELECT image_url FROM items 
           WHERE list_id = $1 AND image_url IS NOT NULL AND image_url != ''
           ORDER BY is_top_choice DESC, created_at DESC
           LIMIT 3`,
          [list.id]
        );
        return {
          ...list,
          preview_images: imagesResult.rows.map(r => r.image_url)
        };
      }));
      
      res.json(lists);
    } catch (err) {
      console.error('Error fetching lists:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Get single list (hide claim info!)
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        'SELECT * FROM lists WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching list:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Create list
  router.post('/', async (req, res) => {
    try {
      const { name, description, occasion_date } = req.body;
      const userId = req.user.id;
      const shareCode = nanoid(10);

      const result = await pool.query(
        `INSERT INTO lists (user_id, name, description, occasion_date, share_code)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, name, description, occasion_date || null, shareCode]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating list:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update list
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, occasion_date } = req.body;
      const userId = req.user.id;

      const result = await pool.query(
        `UPDATE lists
         SET name = $1, description = $2, occasion_date = $3
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [name, description, occasion_date || null, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating list:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete list
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Delete items first
      await pool.query(
        `DELETE FROM items WHERE list_id = $1 
         AND list_id IN (SELECT id FROM lists WHERE user_id = $2)`,
        [id, userId]
      );

      const result = await pool.query(
        'DELETE FROM lists WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting list:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
