import Blog from "../model/Blog.js";
import mongoose from "mongoose";
import User from "../model/User.js";

export const getAllBlogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const blogs = await Blog.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const totalBlogs = await Blog.countDocuments();
        const totalPages = Math.ceil(totalBlogs / limit);
        
        if (!blogs || blogs.length === 0) {
            return res.status(200).json({
                blogs: [],
                pagination: {
                    currentPage: page,
                    totalPages: 0,
                    totalBlogs: 0,
                    hasNext: false,
                    hasPrev: false
                }
            });
        }
        
        return res.status(200).json({
            blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        console.error('Error fetching blogs:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch blogs',
            error: err.message 
        });
    }
};

export const addBlog = async (req, res, next) => {
    const { title, description, image, user } = req.body;
    
    // Validation
    if (!title || !description || !image || !user) {
        return res.status(400).json({ 
            message: 'All fields are required: title, description, image, user' 
        });
    }
    
    if (title.trim().length < 3) {
        return res.status(400).json({ 
            message: 'Title must be at least 3 characters long' 
        });
    }
    
    if (description.trim().length < 10) {
        return res.status(400).json({ 
            message: 'Description must be at least 10 characters long' 
        });
    }

    let existingUser;
    try {
        existingUser = await User.findById(user);
    } catch (err) {
        console.error('Error finding user:', err);
        return res.status(400).json({ 
            message: 'Invalid user ID format' 
        });
    }

    if (!existingUser) {
        return res.status(404).json({ 
            message: 'User not found' 
        });
    }

    const blog = new Blog({
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
        user,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const savedBlog = await blog.save({ session });
        existingUser.blogs.push(savedBlog._id);
        await existingUser.save({ session });
        
        await session.commitTransaction();
        
        // Populate the user data for the response
        const populatedBlog = await Blog.findById(savedBlog._id).populate('user', 'name email');
        
        // Emit real-time update to all connected clients
        if (req.io) {
            req.io.to('blogs-room').emit('new-blog', {
                blog: populatedBlog,
                message: `New blog "${title}" published by ${existingUser.name}`
            });
            
            // Notify the user
            req.io.to(`user-${user}`).emit('blog-created', {
                blog: populatedBlog,
                message: 'Your blog has been published successfully!'
            });
        }
        
        return res.status(201).json({ 
            blog: populatedBlog,
            message: 'Blog created successfully'
        });
    } catch (err) {
        await session.abortTransaction();
        console.error('Error creating blog:', err);
        return res.status(500).json({ 
            message: 'Failed to create blog',
            error: err.message 
        });
    } finally {
        session.endSession();
    }
};

export const updateBlog = async (req, res, next) => {
    const { title, description, image } = req.body;
    const blogId = req.params.id;
    
    // Validation
    if (!title || !description) {
        return res.status(400).json({ 
            message: 'Title and description are required' 
        });
    }
    
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
        return res.status(400).json({ 
            message: 'Invalid blog ID format' 
        });
    }

    try {
        const existingBlog = await Blog.findById(blogId).populate('user', 'name email');
        
        if (!existingBlog) {
            return res.status(404).json({ 
                message: 'Blog not found' 
            });
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            blogId,
            {
                title: title.trim(),
                description: description.trim(),
                image: image ? image.trim() : existingBlog.image,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('user', 'name email');

        // Emit real-time update
        if (req.io) {
            req.io.to('blogs-room').emit('blog-updated', {
                blog: updatedBlog,
                message: `Blog "${title}" has been updated`
            });
            
            req.io.to(`user-${existingBlog.user._id}`).emit('blog-updated', {
                blog: updatedBlog,
                message: 'Your blog has been updated successfully!'
            });
        }

        return res.status(200).json({ 
            blog: updatedBlog,
            message: 'Blog updated successfully'
        });
    } catch (err) {
        console.error('Error updating blog:', err);
        return res.status(500).json({ 
            message: 'Failed to update blog',
            error: err.message 
        });
    }
};

export const getById = async (req, res, next) => {
    const id = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
            message: 'Invalid blog ID format' 
        });
    }

    try {
        const blog = await Blog.findById(id).populate('user', 'name email createdAt');
        
        if (!blog) {
            return res.status(404).json({ 
                message: 'Blog not found' 
            });
        }
        
        // Track blog views (optional analytics)
        await Blog.findByIdAndUpdate(id, { 
            $inc: { views: 1 },
            lastViewed: new Date()
        });

        return res.status(200).json({ blog });
    } catch (err) {
        console.error('Error fetching blog:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch blog',
            error: err.message 
        });
    }
};

export const deleteBlog = async (req, res, next) => {
    const blogId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
        return res.status(400).json({ 
            message: 'Invalid blog ID format' 
        });
    }

    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const blog = await Blog.findById(blogId).populate('user', 'name email');
        
        if (!blog) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: 'Blog not found' 
            });
        }
        
        // Remove blog from user's blogs array
        await User.findByIdAndUpdate(
            blog.user._id,
            { $pull: { blogs: blogId } },
            { session }
        );
        
        // Delete the blog
        await Blog.findByIdAndDelete(blogId, { session });
        
        await session.commitTransaction();
        
        // Emit real-time update
        if (req.io) {
            req.io.to('blogs-room').emit('blog-deleted', {
                blogId,
                message: `Blog "${blog.title}" has been deleted`
            });
            
            req.io.to(`user-${blog.user._id}`).emit('blog-deleted', {
                blogId,
                message: 'Your blog has been deleted successfully!'
            });
        }
        
        return res.status(200).json({ 
            message: 'Blog deleted successfully',
            deletedBlogId: blogId
        });
    } catch (err) {
        await session.abortTransaction();
        console.error('Error deleting blog:', err);
        return res.status(500).json({ 
            message: 'Failed to delete blog',
            error: err.message 
        });
    } finally {
        session.endSession();
    }
};

export const getByUserId = async (req, res, next) => {
    const id = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
            message: 'Invalid user ID format' 
        });
    }

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const userWithBlogs = await User.findById(id)
            .populate({
                path: 'blogs',
                options: {
                    sort: { createdAt: -1 },
                    skip: (page - 1) * limit,
                    limit: limit
                }
            });

        if (!userWithBlogs) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        const totalBlogs = await Blog.countDocuments({ user: id });
        const totalPages = Math.ceil(totalBlogs / limit);

        return res.status(200).json({
            user: userWithBlogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        console.error('Error fetching user blogs:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch user blogs',
            error: err.message 
        });
    }
};

// New endpoint for real-time blog statistics
export const getBlogStats = async (req, res, next) => {
    try {
        const totalBlogs = await Blog.countDocuments();
        const totalUsers = await User.countDocuments();
        const recentBlogs = await Blog.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        const topAuthors = await Blog.aggregate([
            {
                $group: {
                    _id: '$user',
                    blogCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $project: {
                    name: '$userInfo.name',
                    blogCount: 1
                }
            },
            {
                $sort: { blogCount: -1 }
            },
            {
                $limit: 5
            }
        ]);

        return res.status(200).json({
            stats: {
                totalBlogs,
                totalUsers,
                recentBlogs,
                topAuthors
            }
        });
    } catch (err) {
        console.error('Error fetching blog stats:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch blog statistics',
            error: err.message 
        });
    }
};

// Search blogs endpoint
export const searchBlogs = async (req, res, next) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ 
                message: 'Search query is required' 
            });
        }
        
        const searchRegex = new RegExp(query.trim(), 'i');
        const skip = (page - 1) * limit;
        
        const blogs = await Blog.find({
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
        
        const totalResults = await Blog.countDocuments({
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        });
        
        return res.status(200).json({
            blogs,
            searchQuery: query,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalResults / limit),
                totalResults,
                hasNext: page < Math.ceil(totalResults / limit),
                hasPrev: page > 1
            }
        });
    } catch (err) {
        console.error('Error searching blogs:', err);
        return res.status(500).json({ 
            message: 'Failed to search blogs',
            error: err.message 
        });
    }
};