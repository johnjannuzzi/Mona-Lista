const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Get shared list by share code
  router.get('/:shareCode', async (req, res) => {
    try {
      const { shareCode } = req.params;

      // Get list info
      const listResult = await pool.query(
        `SELECT l.*, u.name as owner_name
         FROM lists l
         JOIN users u ON l.user_id = u.id
         WHERE l.share_code = $1`,
        [shareCode]
      );

      if (listResult.rows.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      const list = listResult.rows[0];

      // Get items (don't show claimer name to protect privacy, but show if claimed)
      const itemsResult = await pool.query(
        `SELECT id, title, price, original_url, affiliate_url, domain, 
                image_url, notes, is_top_choice,
                CASE WHEN claimed_at IS NOT NULL THEN true ELSE false END as is_claimed,
                claimer_name
         FROM items
         WHERE list_id = $1
         ORDER BY is_top_choice DESC, created_at DESC`,
        [list.id]
      );

      res.json({
        id: list.id,
        name: list.name,
        description: list.description,
        occasion_date: list.occasion_date,
        owner_name: list.owner_name,
        items: itemsResult.rows
      });
    } catch (err) {
      console.error('Error fetching shared list:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Claim an item
  router.post('/:shareCode/claim/:itemId', async (req, res) => {
    try {
      const { shareCode, itemId } = req.params;
      const { claimer_name } = req.body;

      // Verify the item belongs to a list with this share code
      const verifyResult = await pool.query(
        `SELECT i.id, i.claimed_at
         FROM items i
         JOIN lists l ON i.list_id = l.id
         WHERE l.share_code = $1 AND i.id = $2`,
        [shareCode, itemId]
      );

      if (verifyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      if (verifyResult.rows[0].claimed_at) {
        return res.status(400).json({ error: 'Item already claimed' });
      }

      // Claim the item
      await pool.query(
        `UPDATE items
         SET claimed_at = NOW(), claimer_name = $1
         WHERE id = $2`,
        [claimer_name || 'Someone special', itemId]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('Error claiming item:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Unclaim an item
  router.post('/:shareCode/unclaim/:itemId', async (req, res) => {
    try {
      const { shareCode, itemId } = req.params;

      // Verify the item belongs to a list with this share code
      const verifyResult = await pool.query(
        `SELECT i.id, i.claimed_at
         FROM items i
         JOIN lists l ON i.list_id = l.id
         WHERE l.share_code = $1 AND i.id = $2`,
        [shareCode, itemId]
      );

      if (verifyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      if (!verifyResult.rows[0].claimed_at) {
        return res.status(400).json({ error: 'Item is not claimed' });
      }

      // Unclaim the item
      await pool.query(
        `UPDATE items
         SET claimed_at = NULL, claimer_name = NULL
         WHERE id = $1`,
        [itemId]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('Error unclaiming item:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
