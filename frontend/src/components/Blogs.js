import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Blog from './Blog';
import { serverURL } from '../helper/Helper';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Skeleton, 
  Card, 
  CardContent,
  Alert,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Refresh as RefreshIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import Swal from 'sweetalert2';

// Styled Components
const BlogsContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(4, 2),
  minHeight: 'calc(100vh - 80px)',
  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
}));

const BlogsHeader = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(6),
  padding: theme.spacing(4, 0),
}));

const BlogsTitle = styled(Typography)(({ theme }) => ({
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

const BlogsSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.2rem',
  color: theme.palette.text.secondary,
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: 1.6,
}));

const SkeletonCard = styled(Card)(({ theme }) => ({
  background: 'white',
  borderRadius: theme.spacing(2),
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  maxWidth: '800px',
  margin: '0 auto',
  marginTop: theme.spacing(3),
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(8, 2),
  background: 'white',
  borderRadius: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  maxWidth: '600px',
  margin: '0 auto',
}));

const RefreshButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: 'white',
  padding: theme.spacing(1.5, 3),
  borderRadius: theme.spacing(2),
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #5a6fd8, #6a4190)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
  },
}));

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const sendRequest = async () => {
    try {
      const res = await axios.get(`${serverURL}/api/blog/`);
      const data = await res.data;
      return data;
    } catch (err) {
      console.log(err);
      const errorMessage = 'Something went wrong while fetching the blogs. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };

  const fetchBlogs = async () => {
    setLoading(true);
    setError("");
    
    try {
      const data = await sendRequest();
      setBlogs(data.blogs || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchBlogs();
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Render skeleton loading cards
  const renderSkeletons = () => {
    return Array.from({ length: 3 }).map((_, index) => (
      <SkeletonCard key={index} className="fade-in">
        <Box sx={{ position: 'relative' }}>
          {/* Image skeleton */}
          <Skeleton 
            variant="rectangular" 
            height={300} 
            sx={{ 
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'loading 1.5s infinite',
            }} 
          />
          
          {/* Header skeleton */}
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Skeleton variant="circular" width={56} height={56} />
              <Box sx={{ ml: 2, flexGrow: 1 }}>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="40%" height={24} />
              </Box>
            </Box>
            
            {/* User chip skeleton */}
            <Box mb={2}>
              <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 16 }} />
            </Box>
            
            {/* Content skeleton */}
            <Skeleton variant="text" width="100%" height={24} />
            <Skeleton variant="text" width="90%" height={24} />
            <Skeleton variant="text" width="80%" height={24} />
            <Skeleton variant="text" width="70%" height={24} />
          </Box>
        </Box>
      </SkeletonCard>
    ));
  };

  // Render empty state
  const renderEmptyState = () => (
    <EmptyState className="fade-in">
      <ArticleIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
      <Typography variant="h4" color="primary" mb={2} fontWeight={600}>
        No Blogs Available
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4} sx={{ maxWidth: '400px', mx: 'auto' }}>
        It looks like there are no blogs published yet. Be the first to share your story with the community!
      </Typography>
      <RefreshButton
        onClick={handleRetry}
        startIcon={<RefreshIcon />}
      >
        Refresh
      </RefreshButton>
    </EmptyState>
  );

  // Render error state
  const renderErrorState = () => (
    <EmptyState className="fade-in">
      <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
        {error}
      </Alert>
      <RefreshButton
        onClick={handleRetry}
        startIcon={<RefreshIcon />}
      >
        Try Again
      </RefreshButton>
    </EmptyState>
  );

  return (
    <BlogsContainer maxWidth="lg">
      {/* Header */}
      <BlogsHeader>
        <BlogsTitle variant="h1">
          Discover Amazing Stories
        </BlogsTitle>
        <BlogsSubtitle variant="h6">
          Explore a collection of inspiring blogs written by our community of creators
        </BlogsSubtitle>
      </BlogsHeader>

      {/* Content */}
      <Box>
        {loading ? (
          // Loading state with skeletons
          renderSkeletons()
        ) : error ? (
          // Error state
          renderErrorState()
        ) : blogs && blogs.length > 0 ? (
          // Blogs list
          <Box className="fade-in">
            {blogs.map((blog, index) => (
              <Blog
                key={blog._id}
                id={blog._id}
                isUser={localStorage.getItem("userId") === blog.user._id}
                title={blog.title}
                description={blog.description}
                imageURL={blog.image}
                userName={blog.user.name}
              />
            ))}
          </Box>
        ) : (
          // Empty state
          renderEmptyState()
        )}
      </Box>

      {/* Retry button for failed requests */}
      {!loading && !error && blogs.length === 0 && retryCount > 0 && (
        <Box textAlign="center" mt={4}>
          <RefreshButton
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
          >
            Refresh Blogs
          </RefreshButton>
        </Box>
      )}
    </BlogsContainer>
  );
};

export default Blogs;
