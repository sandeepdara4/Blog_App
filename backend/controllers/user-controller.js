import User from "../model/User.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";

export const getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const users = await User.find({ isActive: true })
            .select('-password')
            .populate('blogs', 'title createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const totalUsers = await User.countDocuments({ isActive: true });
        const totalPages = Math.ceil(totalUsers / limit);
        
        return res.status(200).json({
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch users',
            error: err.message 
        });
    }
};

export const getUserById = async (req, res, next) => {
    const userId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ 
            message: 'Invalid user ID format' 
        });
    }
    
    try {
        const user = await User.findById(userId)
            .select('-password')
            .populate({
                path: 'blogs',
                options: { sort: { createdAt: -1 } }
            });
            
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        // Update last active timestamp
        await user.updateLastActive();
        
        return res.status(200).json({ user });
    } catch (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch user details',
            error: err.message 
        });
    }
};

export const signup = async (req, res, next) => {
    const { name, email, password } = req.body;
    
    // Enhanced validation
    if (!name || !email || !password) {
        return res.status(400).json({ 
            message: 'All fields are required: name, email, password' 
        });
    }
    
    if (name.trim().length < 2) {
        return res.status(400).json({ 
            message: 'Name must be at least 2 characters long' 
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ 
            message: 'Password must be at least 6 characters long' 
        });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            message: 'Please provide a valid email address' 
        });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        if (existingUser) {
            return res.status(409).json({ 
                message: 'User already exists with this email. Please login instead.' 
            });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            blogs: [],
            createdAt: new Date(),
            lastActive: new Date()
        });

        const savedUser = await user.save();
        
        // Remove password from response
        const userResponse = savedUser.toObject();
        delete userResponse.password;
        
        // Emit real-time update for new user registration
        if (req.io) {
            req.io.emit('new-user-registered', {
                message: `Welcome ${name} to BLOGGY!`,
                userCount: await User.countDocuments()
            });
        }

        return res.status(201).json({ 
            user: userResponse,
            message: 'Account created successfully'
        });
    } catch (err) {
        console.error('Error during signup:', err);
        
        if (err.code === 11000) {
            return res.status(409).json({ 
                message: 'Email already exists. Please use a different email.' 
            });
        }
        
        return res.status(500).json({ 
            message: 'Failed to create account',
            error: err.message 
        });
    }
};

export const login = async (req, res, next) => {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
        return res.status(400).json({ 
            message: 'Email and password are required' 
        });
    }

    try {
        const existingUser = await User.findOne({ 
            email: email.toLowerCase().trim(),
            isActive: true 
        }).populate('blogs', 'title createdAt');
        
        if (!existingUser) {
            return res.status(404).json({ 
                message: 'No account found with this email address' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, existingUser.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Invalid password. Please try again.' 
            });
        }
        
        // Update last active timestamp
        await existingUser.updateLastActive();
        
        // Remove password from response
        const userResponse = existingUser.toObject();
        delete userResponse.password;
        
        // Emit real-time update for user login
        if (req.io) {
            req.io.to(`user-${existingUser._id}`).emit('user-logged-in', {
                message: 'Login successful!',
                timestamp: new Date()
            });
        }

        return res.status(200).json({ 
            message: 'Login successful',
            user: userResponse
        });
    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ 
            message: 'Login failed',
            error: err.message 
        });
    }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
    const userId = req.params.id;
    const { name, bio, website, location } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ 
            message: 'Invalid user ID format' 
        });
    }
    
    try {
        const updateData = {
            updatedAt: new Date()
        };
        
        if (name) updateData.name = name.trim();
        if (bio !== undefined) updateData['profile.bio'] = bio.trim();
        if (website !== undefined) updateData['profile.website'] = website.trim();
        if (location !== undefined) updateData['profile.location'] = location.trim();
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password').populate('blogs', 'title createdAt');
        
        if (!updatedUser) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        // Emit real-time update
        if (req.io) {
            req.io.to(`user-${userId}`).emit('profile-updated', {
                user: updatedUser,
                message: 'Profile updated successfully!'
            });
        }
        
        return res.status(200).json({ 
            user: updatedUser,
            message: 'Profile updated successfully'
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ 
            message: 'Failed to update profile',
            error: err.message 
        });
    }
};

// Get user statistics
export const getUserStats = async (req, res, next) => {
    const userId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ 
            message: 'Invalid user ID format' 
        });
    }
    
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        const blogStats = await mongoose.model('Blog').aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalBlogs: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: { $size: '$likes' } },
                    totalComments: { $sum: { $size: '$comments' } }
                }
            }
        ]);
        
        const stats = blogStats[0] || {
            totalBlogs: 0,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0
        };
        
        return res.status(200).json({ 
            stats: {
                ...stats,
                memberSince: user.createdAt,
                lastActive: user.lastActive
            }
        });
    } catch (err) {
        console.error('Error fetching user stats:', err);
        return res.status(500).json({ 
            message: 'Failed to fetch user statistics',
            error: err.message 
        });
    }
};