const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Get items for a list (for list owner - hide claim status!)
  router.get('/list/:listId', async (req, res) => {
    try {
      const { listId } = req.params;
      const userId = req.user.id;

      // Verify user owns this list
      const listCheck = await pool.query(
        'SELECT id FROM lists WHERE id = $1 AND user_id = $2',
        [listId, userId]
      );

      if (listCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get items WITHOUT claim information (owner shouldn't see this!)
      const result = await pool.query(
        `SELECT id, list_id, title, price, original_url, affiliate_url, 
                domain, image_url, notes, is_top_choice, created_at
         FROM items
         WHERE list_id = $1
         ORDER BY is_top_choice DESC, created_at DESC`,
        [listId]
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching items:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Create item
  router.post('/', async (req, res) => {
    try {
      const { list_id, title, price, original_url, affiliate_url, domain, image_url, notes, is_top_choice } = req.body;
      const userId = req.user.id;

      // Verify user owns this list
      const listCheck = await pool.query(
        'SELECT id FROM lists WHERE id = $1 AND user_id = $2',
        [list_id, userId]
      );

      if (listCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const result = await pool.query(
        `INSERT INTO items (list_id, title, price, original_url, affiliate_url, domain, image_url, notes, is_top_choice)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, list_id, title, price, original_url, affiliate_url, domain, image_url, notes, is_top_choice, created_at`,
        [list_id, title, price || null, original_url, affiliate_url, domain, image_url, notes, is_top_choice || false]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating item:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update item
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, price, original_url, affiliate_url, domain, image_url, notes, is_top_choice } = req.body;
      const userId = req.user.id;

      // Verify user owns this item's list
      const itemCheck = await pool.query(
        `SELECT i.id FROM items i
         JOIN lists l ON i.list_id = l.id
         WHERE i.id = $1 AND l.user_id = $2`,
        [id, userId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const result = await pool.query(
        `UPDATE items
         SET title = $1, price = $2, original_url = $3, affiliate_url = $4, 
             domain = $5, image_url = $6, notes = $7, is_top_choice = $8
         WHERE id = $9
         RETURNING id, list_id, title, price, original_url, affiliate_url, domain, image_url, notes, is_top_choice, created_at`,
        [title, price || null, original_url, affiliate_url, domain, image_url, notes, is_top_choice || false, id]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating item:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Toggle top choice
  router.post('/:id/toggle-top-choice', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user owns this item's list
      const itemCheck = await pool.query(
        `SELECT i.id, i.is_top_choice FROM items i
         JOIN lists l ON i.list_id = l.id
         WHERE i.id = $1 AND l.user_id = $2`,
        [id, userId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const newValue = !itemCheck.rows[0].is_top_choice;

      const result = await pool.query(
        `UPDATE items SET is_top_choice = $1 WHERE id = $2
         RETURNING id, list_id, title, price, original_url, affiliate_url, domain, image_url, notes, is_top_choice, created_at`,
        [newValue, id]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error toggling top choice:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete item
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user owns this item's list
      const itemCheck = await pool.query(
        `SELECT i.id FROM items i
         JOIN lists l ON i.list_id = l.id
         WHERE i.id = $1 AND l.user_id = $2`,
        [id, userId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await pool.query('DELETE FROM items WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting item:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
