const Post = require('../models/Post');

// Get all active posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isActive: true })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    
    // Check if user is allowed to create post
    const allowedRoles = ['panchayat_secretary', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create posts'
      });
    }

    const post = await Post.create({
      title,
      description,
      imageUrl,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete post (soft delete or hard delete)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Allow deletion only by the creator or panchayat_secretary
    if (post.createdBy.toString() !== req.user.id && req.user.role !== 'panchayat_secretary') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
