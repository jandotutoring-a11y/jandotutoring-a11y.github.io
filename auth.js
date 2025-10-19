/**
 * Jando EDU - Authentication System
 * Handles login, logout, and user session management across all pages
 */

class JandoAuth {
  constructor() {
    this.scriptURL = "https://script.google.com/macros/s/AKfycbzwNZGb_nRFF9t4lLdJdbII1kuDKhsiy4_liBxOe3pNc6rWP7swfem33C_ALT3OWQ9GoQ/exec";
    this.currentUser = null;
    this.init();
  }

  // Initialize authentication system
  init() {
    // Check if user is already logged in
    this.currentUser = this.getStoredUser();
    
    if (!this.currentUser) {
      this.showAuthModal();
    } else {
      this.updateHeaderWithUser();
      // Trigger event for existing users too
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('jandoAuthComplete', { detail: this.currentUser }));
      }, 100);
    }
    
    this.setupMenuHandlers();
  }

  // Show authentication modal
  showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  // Hide authentication modal
  hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  // Authenticate user with student code
  async authenticateUser() {
    const codeInput = document.getElementById('studentCodeInput');
    const errorDiv = document.getElementById('authError');
    const loginBtn = document.getElementById('authLoginBtn');
    
    const code = codeInput.value.trim();
    
    // Test mode - different codes for testing year levels
    if (code.toLowerCase().startsWith('test')) {
      let yearLevel = '6'; // default
      let testName = 'Test Student';
      
      // Allow testing different year levels
      if (code.toLowerCase() === 'test5') {
        yearLevel = '5';
        testName = 'Test Year 5 Student';
      } else if (code.toLowerCase() === 'test6') {
        yearLevel = '6';
        testName = 'Test Year 6 Student';
      } else if (code.toLowerCase() === 'test7') {
        yearLevel = '7';
        testName = 'Test Year 7 Student';
      } else if (code.toLowerCase() === 'test') {
        yearLevel = '6';
        testName = 'Test Student (Year 6)';
      }
      
      this.currentUser = {
        code: code,
        name: testName,
        yearLevel: yearLevel,
        year: yearLevel,
        rewards: '🐶,🐱,🐭,🎉,🏆,⭐',
        loginTime: new Date().toISOString()
      };
      
      console.log('Test login:', this.currentUser);
      
      this.storeUser(this.currentUser);
      this.updateHeaderWithUser();
      this.hideAuthModal();
      
      // Trigger custom event for pages to refresh their data
      window.dispatchEvent(new CustomEvent('jandoAuthComplete', { detail: this.currentUser }));
      return;
    }
    
    if (!code) {
      this.showError('Please enter your student code');
      return;
    }

    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
    try {
      console.log('Attempting authentication with code:', code);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 20000)
      );
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(`${this.scriptURL}?code=${encodeURIComponent(code)}`),
        timeoutPromise
      ]);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.text();
      
      console.log('Login response:', result);
      
      if (result === "Invalid") {
        this.showError("Invalid student code. Please try again.");
        return;
      }
      
      // Try to parse as JSON (new format)
      let userData;
      try {
        userData = JSON.parse(result);
        console.log('Parsed user data:', userData);
      } catch (e) {
        // Fallback for old format (just name string)
        console.log('Using fallback format');
        userData = {
          name: result,
          code: code,
          rewards: "",
          yearLevel: "",
          lastLogin: "",
          totalGames: 0,
          totalScore: 0
        };
      }
      
      // Store user data
      this.currentUser = {
        ...userData,
        loginTime: new Date().toISOString()
      };
      
      // Get rewards data
      try {
        const rewardsResponse = await fetch(`${this.scriptURL}?rewards=${encodeURIComponent(code)}`);
        const rewardsData = await rewardsResponse.text();
        if (rewardsData !== "Invalid") {
          // Check if response is JSON and extract rewards properly
          try {
            if (rewardsData.startsWith('{') || rewardsData.startsWith('[')) {
              const parsedData = JSON.parse(rewardsData);
              this.currentUser.rewards = parsedData.rewards || rewardsData;
            } else {
              this.currentUser.rewards = rewardsData;
            }
          } catch (parseError) {
            console.log('Rewards data is not JSON, storing as-is');
            this.currentUser.rewards = rewardsData;
          }
        }
      } catch (rewardsError) {
        console.log('Could not fetch rewards, continuing without them');
      }
      
      this.storeUser(this.currentUser);
      this.updateHeaderWithUser();
      this.hideAuthModal();
      
      // Trigger custom event for pages to refresh their data
      window.dispatchEvent(new CustomEvent('jandoAuthComplete', { detail: this.currentUser }));
      
    } catch (error) {
      console.error('Authentication error:', error);
      if (error.message === 'Request timeout') {
        this.showError('Request timed out. Please check your internet connection and try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        this.showError('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('HTTP error')) {
        this.showError('Server error. Please try again in a moment.');
      } else {
        this.showError('Connection error. Please try again.');
      }
    } finally {
      loginBtn.textContent = 'Login';
      loginBtn.disabled = false;
    }
  }

  // Store user data in localStorage
  storeUser(userData) {
    localStorage.setItem('jandoUser', JSON.stringify(userData));
  }

  // Get stored user data
  getStoredUser() {
    const stored = localStorage.getItem('jandoUser');
    return stored ? JSON.parse(stored) : null;
  }

  // Update header with user information
  updateHeaderWithUser() {
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && this.currentUser) {
      userGreeting.textContent = `Hi, ${this.currentUser.name}!`;
      userGreeting.style.display = 'block';
    }
  }

  // Setup menu event handlers
  setupMenuHandlers() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (menuBtn && menuDropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
      });

      // Close menu when clicking outside
      document.addEventListener('click', () => {
        menuDropdown.classList.remove('show');
      });

      // Prevent menu from closing when clicking inside
      menuDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem('jandoUser');
    this.currentUser = null;
    
    // Redirect to home page or refresh
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
      window.location.reload();
    } else {
      window.location.href = 'index.html';
    }
  }

  // Show error message
  showError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  // Show success message
  showSuccess(message) {
    // You can implement a toast notification or use alert for now
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-green);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: var(--shadow-lg);
      z-index: 3000;
      animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Get current user data
  getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    
    const stored = localStorage.getItem('jandoUser');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        return null;
      }
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Helper function for existing games to check if user is logged in
  // and get their code without showing duplicate login
  getStudentCodeForGame() {
    if (this.currentUser) {
      return this.currentUser.code;
    }
    return null;
  }

  // Helper function to set student name in game header
  setGameStudentName(name) {
    if (this.currentUser && name) {
      this.currentUser.name = name;
      this.storeUser(this.currentUser);
      this.updateHeaderWithUser();
    }
  }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.jandoAuth = new JandoAuth();
});

// Handle Enter key in auth modal
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && document.getElementById('authModal').classList.contains('show')) {
    window.jandoAuth.authenticateUser();
  }
});