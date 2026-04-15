const express = require('express');
const { getPosts, createPost, deletePost } = require('../controllers/postController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getPosts)
  .post(protect, createPost);

router.route('/:id')
  .delete(protect, deletePost);

module.exports = router;
