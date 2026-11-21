const express = require('express');
const rateLimit = require('../middleware/rateLimit');
const sharedController = require('../controllers/sharedController');

const router = express.Router();

// No login here: the link is the key. So this is limited per IP, twice over:
// a generous cap on all requests, and a tight cap on failures, which is what guessing looks like.
router.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));
router.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 10, onlyFailures: true, message: 'Too many attempts. Please wait a few minutes and try again.' }));

router.get('/:token', sharedController.view);
router.get('/:token/documents/:id/file', sharedController.file);

module.exports = router;
