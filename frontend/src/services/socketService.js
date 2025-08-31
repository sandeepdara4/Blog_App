import { io } from 'socket.io-client';
import { serverURL } from '../helper/Helper';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(serverURL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join blogs room for real-time updates
      this.socket.emit('join-blogs-room');
      
      // Join user room if logged in
      const userId = localStorage.getItem('userId');
      if (userId) {
        this.socket.emit('join-user-room', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });

    return this.socket;
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Blog-related events
  onNewBlog(callback) {
    if (this.socket) {
      this.socket.on('new-blog', callback);
    }
  }

  onBlogUpdated(callback) {
    if (this.socket) {
      this.socket.on('blog-updated', callback);
    }
  }

  onBlogDeleted(callback) {
    if (this.socket) {
      this.socket.on('blog-deleted', callback);
    }
  }

  // User-related events
  onUserLoggedIn(callback) {
    if (this.socket) {
      this.socket.on('user-logged-in', callback);
    }
  }

  onNewUserRegistered(callback) {
    if (this.socket) {
      this.socket.on('new-user-registered', callback);
    }
  }

  // Typing indicators
  emitUserTyping(userId, userName, action) {
    if (this.socket && this.isConnected) {
      this.socket.emit('user-typing', { userId, userName, action });
    }
  }

  emitUserStoppedTyping(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('user-stopped-typing', { userId });
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onUserStoppedTyping(callback) {
    if (this.socket) {
      this.socket.on('user-stopped-typing', callback);
    }
  }

  // Utility methods
  joinUserRoom(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-user-room', userId);
    }
  }

  joinBlogsRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-blogs-room');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  // Clean up event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;