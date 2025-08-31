import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Blog from './Blog';
import { serverURL } from '../helper/Helper';
import { 
  Box, 
  Typography, 
  Container, 
  CircularProgress, 
  Alert,
  Button,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Article as ArticleIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

// Styled Components
const UserBlogContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(4, 2),
  minHeight: 'calc(100vh - 80px)',
  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
}));

const UserBlogHeader = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(6),
  padding: theme.spacing(4, 0),
}));

const UserBlogTitle = styled(Typography)(({ theme }) => ({
  fontSize: '3rem',
  fontWeight: 700,
  marginBottom: theme.spacing(2),
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2.5rem',
  },
}));

const UserBlogSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.2rem',
  color: theme.palette.text.secondary,
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: 1.6,
}));

const EmptyState = styled(Paper)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(8, 4),
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  borderRadius: theme.spacing(3),
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  maxWidth: '600px',
  margin: '0 auto',
  marginTop: theme.spacing(4),
}));

const CreateBlogButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: 'white',
  padding: theme.spacing(1.5, 4),
  borderRadius: theme.spacing(3),
  fontSize: '1.1rem',
  fontWeight: 700,
  textTransform: 'none',
  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #5a6fd8, #6a4190)',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
  },
}));

const RefreshButton = styled(Button)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.9)',
  color: theme.palette.primary.main,
  padding: theme.spacing(1, 3),
  borderRadius: theme.spacing(2),
  fontWeight: 600,
  textTransform: 'none',
  border: '2px solid rgba(102, 126, 234, 0.2)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(102, 126, 234, 0.1)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)',
  },
}));

const UserBlog = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const id = localStorage.getItem("userId");

  const sendRequest = async () => {
    try {
      const res = await axios.get(`${serverURL}/api/blog/user/${id}`);
      const data = await res.data;
      return data;
    } catch (err) {
      console.error('Error fetching user blogs:', err);
      setError('Failed to fetch your blogs. Please try again.');
      throw err;
    }
  };

  const fetchUserBlogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await sendRequest();
      setUser(data.user);
    } catch (err) {
      console.error('Error in fetchUserBlogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchUserBlogs();
  };

  useEffect(() => {
    fetchUserBlogs();
  }, []);

  if (loading) {
    return (
      <UserBlogContainer maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main' }} />
        </Box>
      </UserBlogContainer>
    );
  }

  if (error) {
    return (
      <UserBlogContainer maxWidth="lg">
        <Box textAlign="center" py={8}>
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3, fontSize: '1.1rem' }}>
            {error}
          </Alert>
          <RefreshButton
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
          >
            Try Again
          </RefreshButton>
        </Box>
      </UserBlogContainer>
    );
  }

  return (
    <UserBlogContainer maxWidth="lg">
      {/* Header */}
      <UserBlogHeader>
        <UserBlogTitle variant="h1">
          My Blog Collection
        </UserBlogTitle>
        <UserBlogSubtitle variant="h6">
          Manage and showcase your personal blog posts
        </UserBlogSubtitle>
      </UserBlogHeader>

      {/* Content */}
      <Box>
        {user && user.blogs && user.blogs.length > 0 ? (
          <Box className="fade-in">
            {user.blogs.map((blog, index) => (
              <Blog
                key={blog._id}
                id={blog._id}
                isUser={true}
                title={blog.title}
                description={blog.description}
                imageURL={blog.image}
                userName={user.name}
              />
            ))}
          </Box>
        ) : (
          <EmptyState className="fade-in">
            <ArticleIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h4" color="primary" mb={2} fontWeight={600}>
              No Blogs Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4} sx={{ maxWidth: '400px', mx: 'auto' }}>
              You haven't created any blog posts yet. Start sharing your thoughts and stories with the world!
            </Typography>
            <CreateBlogButton
              component={Link}
              to="/blogs/add"
              startIcon={<AddIcon />}
            >
              Create Your First Blog
            </CreateBlogButton>
          </EmptyState>
        )}
      </Box>

      {/* Refresh button for failed requests */}
      {!loading && !error && user && user.blogs && user.blogs.length === 0 && (
        <Box textAlign="center" mt={4}>
          <RefreshButton
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </RefreshButton>
        </Box>
      )}
    </UserBlogContainer>
  );
};

export default UserBlog;
