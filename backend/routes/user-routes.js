import express from "express";
import { 
    getAllUsers, 
    getUserById, 
    login, 
    signup,
    updateProfile,
    getUserStats
} from "../controllers/user-controller.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/profile/:id", updateProfile);
router.get("/stats/:id", getUserStats);

export default router;