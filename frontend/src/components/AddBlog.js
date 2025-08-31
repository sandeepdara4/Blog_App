import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container,
  Paper,
  Grid,
  InputAdornment,
  Alert,
  Chip,
  LinearProgress,
  Fade,
  Zoom
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Title as TitleIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Send as SendIcon,
  Add as AddIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import axios from 'axios';
import { serverURL } from '../helper/Helper';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import socketService from '../services/socketService';
import Swal from 'sweetalert2';

// Styled Components
const AddBlogContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(4, 2),
  minHeight: 'calc(100vh - 80px)',
  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
}));

const AddBlogCard = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(30px)',
  borderRadius: theme.spacing(3),
  boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  padding: theme.spacing(4),
  maxWidth: 900,
  margin: '0 auto',
  border: '1px solid rgba(0,0,0,0.05)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
  },
}));

const AddBlogTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: theme.spacing(1),
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(2),
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(248, 250, 252, 0.9)',
      borderColor: 'rgba(102, 126, 234, 0.3)',
    },
    '&.Mui-focused': {
      backgroundColor: 'white',
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#667eea',
    fontWeight: 600,
  },
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: 'white',
  padding: theme.spacing(1.5, 4),
  borderRadius: theme.spacing(2),
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s ease',
  width: '100%',
  height: '56px',
  '&:hover': {
    background: 'linear-gradient(135deg, #5a6fd8, #6a4190)',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
  },
  '&:disabled': {
    background: theme.palette.grey[400],
    transform: 'none',
    boxShadow: 'none',
  },
}));

const PreviewButton = styled(Button)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#667eea',
  border: '2px solid #667eea',
  padding: theme.spacing(1.5, 4),
  borderRadius: theme.spacing(2),
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.3s ease',
  width: '100%',
  height: '56px',
  '&:hover': {
    background: '#667eea',
    color: 'white',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
  },
}));

const ImagePreview = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: 'center',
  '& img': {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: theme.spacing(2),
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    objectFit: 'contain',
  },
}));

const CharacterCount = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  textAlign: 'right',
  marginTop: theme.spacing(1),
}));

const AddBlog = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const [input, setInput] = useState({
    title: "",
    description: "",
    imageURL: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [imageValid, setImageValid] = useState(false);
  const [progress, setProgress] = useState(0);

  const { handleInputChange, cleanup } = useTypingIndicator('creating');

  // Connect to socket
  useEffect(() => {
    socketService.connect();
    return cleanup;
  }, [cleanup]);

  // Validate image URL
  useEffect(() => {
    if (input.imageURL) {
      const img = new Image();
      img.onload = () => setImageValid(true);
      img.onerror = () => setImageValid(false);
      img.src = input.imageURL;
    } else {
      setImageValid(false);
    }
  }, [input.imageURL]);

  const sendRequest = async () => {
    try {
      const res = await axios.post(`${serverURL}/api/blog/add`, {
        title: input.title,
        description: input.description,
        image: input.imageURL,
        user: localStorage.getItem("userId")
      });
      return res.data;
    } catch (err) {
      console.error('Error creating blog:', err);
      const errorMessage = err.response?.data?.message || "Failed to create blog. Please try again.";
      setError(errorMessage);
      throw err;
    }
  };

  const handleChange = handleInputChange((e) => {
    setInput((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
    
    // Clear messages when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!input.title.trim()) {
      setError('Title is required');
      return;
    }
    if (input.title.trim().length < 3) {
      setError('Title must be at least 3 characters long');
      return;
    }
    if (!input.description.trim()) {
      setError('Description is required');
      return;
    }
    if (input.description.trim().length < 10) {
      setError('Description must be at least 10 characters long');
      return;
    }
    if (!input.imageURL.trim()) {
      setError('Image URL is required');
      return;
    }
    if (!imageValid) {
      setError('Please provide a valid image URL');
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const data = await sendRequest();
      setProgress(100);
      setSuccess("Blog created successfully! Redirecting...");
      
      // Show success notification
      Swal.fire({
        icon: 'success',
        title: 'Blog Published!',
        text: 'Your blog has been published and is now live.',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        timer: 2000,
        showConfirmButton: false,
      });

      setTimeout(() => {
        navigate("/myblogs");
      }, 2000);
    } catch (err) {
      setProgress(0);
      console.error('Error creating blog:', err);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(!showPreview);
  };

  const isFormValid = input.title.trim() && 
                     input.description.trim() && 
                     input.imageURL.trim() && 
                     imageValid;

  const titleCharCount = input.title.length;
  const descriptionCharCount = input.description.length;
  const maxTitleLength = 200;
  const maxDescriptionLength = 5000;

  return (
    <AddBlogContainer maxWidth="lg">
      <Fade in={true}>
        <AddBlogCard elevation={0}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <AddBlogTitle variant="h1">
              Create Your Blog
            </AddBlogTitle>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
              Share your thoughts, ideas, and stories with the world
            </Typography>
          </Box>

          {/* Progress Bar */}
          {isLoading && (
            <Box mb={3}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  borderRadius: 2, 
                  height: 8,
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  }
                }} 
              />
              <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                Publishing your blog... {progress}%
              </Typography>
            </Box>
          )}

          {/* Messages */}
          {error && (
            <Zoom in={true}>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            </Zoom>
          )}

          {success && (
            <Zoom in={true}>
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                {success}
              </Alert>
            </Zoom>
          )}

          {/* Blog Form */}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={4}>
              {/* Title Section */}
              <Grid item xs={12}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TitleIcon color="primary" />
                    Blog Title
                  </Typography>
                  <StyledTextField
                    name="title"
                    onChange={handleChange}
                    value={input.title}
                    placeholder="Enter a compelling title for your blog"
                    fullWidth
                    required
                    error={titleCharCount > maxTitleLength}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TitleIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <CharacterCount 
                    color={titleCharCount > maxTitleLength ? 'error' : 'textSecondary'}
                  >
                    {titleCharCount}/{maxTitleLength} characters
                  </CharacterCount>
                </Box>
              </Grid>

              {/* Description Section */}
              <Grid item xs={12}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DescriptionIcon color="primary" />
                    Blog Content
                  </Typography>
                  <StyledTextField
                    name="description"
                    onChange={handleChange}
                    value={input.description}
                    placeholder="Write your blog content here..."
                    fullWidth
                    required
                    multiline
                    rows={8}
                    error={descriptionCharCount > maxDescriptionLength}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <DescriptionIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <CharacterCount 
                    color={descriptionCharCount > maxDescriptionLength ? 'error' : 'textSecondary'}
                  >
                    {descriptionCharCount}/{maxDescriptionLength} characters
                  </CharacterCount>
                </Box>
              </Grid>

              {/* Image URL Section */}
              <Grid item xs={12}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ImageIcon color="primary" />
                    Featured Image
                  </Typography>
                  <StyledTextField
                    name="imageURL"
                    onChange={handleChange}
                    value={input.imageURL}
                    placeholder="Enter the URL of your featured image"
                    fullWidth
                    required
                    error={input.imageURL && !imageValid}
                    helperText={input.imageURL && !imageValid ? "Invalid image URL" : ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ImageIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  {/* Image Preview */}
                  {input.imageURL && imageValid && (
                    <Fade in={true}>
                      <ImagePreview>
                        <img
                          src={input.imageURL}
                          alt="Blog preview"
                          onError={() => setImageValid(false)}
                        />
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                          ✓ Image loaded successfully
                        </Typography>
                      </ImagePreview>
                    </Fade>
                  )}
                </Box>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <PreviewButton
                      type="button"
                      onClick={handlePreview}
                      startIcon={<PreviewIcon />}
                      disabled={!isFormValid}
                    >
                      {showPreview ? 'Hide Preview' : 'Preview Blog'}
                    </PreviewButton>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SubmitButton
                      type="submit"
                      disabled={isLoading || !isFormValid}
                      startIcon={isLoading ? null : <SendIcon />}
                      endIcon={isLoading ? null : <AddIcon />}
                    >
                      {isLoading ? "Publishing..." : "Publish Blog"}
                    </SubmitButton>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </form>

          {/* Blog Preview */}
          {showPreview && isFormValid && (
            <Fade in={true}>
              <Box mt={6} p={4} sx={{ 
                background: 'rgba(102, 126, 234, 0.05)', 
                borderRadius: 3,
                border: '2px solid rgba(102, 126, 234, 0.1)'
              }}>
                <Typography variant="h5" color="primary" mb={3} fontWeight={700}>
                  📖 Blog Preview
                </Typography>
                
                {imageValid && (
                  <Box mb={3} textAlign="center">
                    <img
                      src={input.imageURL}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '12px',
                        objectFit: 'contain'
                      }}
                    />
                  </Box>
                )}
                
                <Typography variant="h4" fontWeight={700} mb={2}>
                  {input.title}
                </Typography>
                
                <Typography variant="body1" sx={{ 
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  color: 'text.secondary'
                }}>
                  {input.description}
                </Typography>
                
                <Box mt={3} display="flex" gap={1} flexWrap="wrap">
                  <Chip label={`By ${user?.name || 'You'}`} color="primary" variant="outlined" />
                  <Chip label={new Date().toLocaleDateString()} color="default" variant="outlined" />
                  <Chip label={`${Math.ceil(input.description.split(' ').length / 200)} min read`} color="default" variant="outlined" />
                </Box>
              </Box>
            </Fade>
          )}

          {/* Writing Tips */}
          <Box mt={6} p={3} sx={{ 
            background: 'rgba(102, 126, 234, 0.05)', 
            borderRadius: 2,
            border: '1px solid rgba(102, 126, 234, 0.1)'
          }}>
            <Typography variant="h6" color="primary" mb={2}>
              💡 Writing Tips
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip label="✓" color="success" size="small" />
                  <Typography variant="body2">Keep your title clear and engaging</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip label="✓" color="success" size="small" />
                  <Typography variant="body2">Use high-quality, relevant images</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip label="✓" color="success" size="small" />
                  <Typography variant="body2">Write compelling content that adds value</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip label="✓" color="success" size="small" />
                  <Typography variant="body2">Proofread before publishing</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </AddBlogCard>
      </Fade>
    </AddBlogContainer>
  );
};

export default AddBlog;