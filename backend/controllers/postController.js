const Post = require('../models/Post');
const { deleteFromS3 } = require('../utils/s3Utils');

// Get all active posts
exports.getPosts = async (req, res) => {
  try {
    const query = { isActive: true };
    
    // Scoping
    if (req.user && req.user.role === 'citizen') {
      query.village = req.user.village;
    } else if (req.user && req.user.role === 'panchayat_secretary') {
      query.village = req.user.village;
    } else if (req.user && ['collector', 'secretariat_office'].includes(req.user.role)) {
      query.district = req.user.district;
    }

    const posts = await Post.find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('❌ Error in getPosts:', error);
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
    const allowedRoles = ['admin', 'secretariat_office'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create posts'
      });
    }

    const postData = {
      title,
      description,
      imageUrl,
      createdBy: req.user.id,
      district: req.user.district
    };

    if (req.user.role === 'panchayat_secretary') {
      postData.village = req.user.village;
    }

    const post = await Post.create(postData);

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
    
    // Allow deletion only by the creator or authorized roles
    const authorizedRoles = ['admin', 'secretariat_office'];
    if (post.createdBy.toString() !== req.user.id && !authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Delete image from S3 if it exists
    if (post.imageUrl) {
      await deleteFromS3(post.imageUrl);
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
