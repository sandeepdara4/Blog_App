import express from "express";
import { 
    addBlog, 
    getAllBlogs, 
    updateBlog, 
    getById, 
    deleteBlog, 
    getByUserId,
    getBlogStats,
    searchBlogs
} from "../controllers/blog-controller.js";

const blogRouter = express.Router();

// Public routes
blogRouter.get("/", getAllBlogs);
blogRouter.get("/search", searchBlogs);
blogRouter.get("/stats", getBlogStats);
blogRouter.get("/:id", getById);

// Protected routes (require authentication)
blogRouter.post("/add", addBlog);
blogRouter.put("/update/:id", updateBlog);
blogRouter.delete("/:id", deleteBlog);
blogRouter.get("/user/:id", getByUserId);

export default blogRouter;