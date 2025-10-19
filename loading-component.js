// Shared Loading Screen Component JavaScript

class JandoLoadingScreen {
  constructor() {
    this.loadingInterval = null;
    this.isInitialized = false;
  }

  // Initialize the loading screen HTML
  init() {
    if (this.isInitialized) return;
    
    const loadingHTML = `
      <div class="loading-screen" id="jandoLoadingScreen" style="display: none;">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <h2>Uploading Results...</h2>
          <p>Please wait while we save your progress to the cloud.</p>
          <div class="loading-progress">
            <div class="loading-bar">
              <div class="loading-bar-fill" id="jandoLoadingBarFill"></div>
            </div>
            <div class="loading-percentage" id="jandoLoadingPercentage">0%</div>
          </div>
        </div>
      </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    this.isInitialized = true;
  }

  // Show loading screen with animation
  show() {
    this.init(); // Ensure it's initialized
    const loadingScreen = document.getElementById('jandoLoadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
      this.animateProgress();
    }
  }

  // Hide loading screen
  hide() {
    const loadingScreen = document.getElementById('jandoLoadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    this.resetProgress();
  }

  // Animate progress bar
  animateProgress() {
    let progress = 0;
    const progressBar = document.getElementById('jandoLoadingBarFill');
    const progressText = document.getElementById('jandoLoadingPercentage');
    
    if (!progressBar || !progressText) return;
    
    this.loadingInterval = setInterval(() => {
      progress += Math.random() * 15 + 5; // Random increment between 5-20%
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(this.loadingInterval);
      }
      
      progressBar.style.width = progress + '%';
      progressText.textContent = Math.round(progress) + '%';
    }, 200);
  }

  // Complete loading (set to 100%)
  complete() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
    
    const progressBar = document.getElementById('jandoLoadingBarFill');
    const progressText = document.getElementById('jandoLoadingPercentage');
    
    if (progressBar && progressText) {
      progressBar.style.width = '100%';
      progressText.textContent = '100%';
    }
  }

  // Reset progress bar
  resetProgress() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
    
    const progressBar = document.getElementById('jandoLoadingBarFill');
    const progressText = document.getElementById('jandoLoadingPercentage');
    
    if (progressBar && progressText) {
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
    }
  }

  // Show loading for a specific duration then hide
  showFor(duration = 2000) {
    this.show();
    setTimeout(() => {
      this.complete();
      setTimeout(() => {
        this.hide();
      }, 500);
    }, duration);
  }

  // Show loading during an async operation
  async showDuring(asyncFunction) {
    this.show();
    try {
      const result = await asyncFunction();
      this.complete();
      setTimeout(() => {
        this.hide();
      }, 500);
      return result;
    } catch (error) {
      this.hide();
      throw error;
    }
  }
}

// Create global instance
window.jandoLoading = new JandoLoadingScreen();

// Convenience functions for backward compatibility
window.showLoadingScreen = () => window.jandoLoading.show();
window.hideLoadingScreen = () => window.jandoLoading.hide();
window.completeLoading = () => window.jandoLoading.complete();
window.animateProgress = () => window.jandoLoading.animateProgress();