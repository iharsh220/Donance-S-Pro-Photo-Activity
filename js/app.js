// Global variables
let croppieInstance = null;
let uploadedImage = null;
let croppedImageData = null;
let frameImage = new Image();

// Canvas dimensions to match poster
const CANVAS_SIZE = 1200; // High resolution for quality
const POSTER_SIZE = 3375; // Original poster size

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load the frame image
    frameImage.src = 'poster/poster.png';
    // Remove crossOrigin for local files
    // frameImage.crossOrigin = 'anonymous';

    // Add error handling for frame image
    frameImage.onerror = function() {
        console.error('Failed to load frame image');
        showError('Failed to load frame image. Please check if the poster file exists.');
    };

    frameImage.onload = function() {
        console.log('Frame image loaded successfully:', frameImage.width, 'x', frameImage.height);
    };

    // Setup event listeners
    setupEventListeners();

    // Animate step sections
    animateStepSections();
}

function setupEventListeners() {
    const photoInput = document.getElementById('photo-input');
    const uploadArea = document.getElementById('upload-area');
    
    // File input change event
    photoInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Click to upload (only on upload content, not button)
    uploadArea.addEventListener('click', (e) => {
        // Prevent double click if clicking on button
        if (!e.target.closest('.upload-btn')) {
            photoInput.click();
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    } else {
        showError('Please select a valid image file.');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('upload-area').classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('upload-area').classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('upload-area').classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processImageFile(files[0]);
    } else {
        showError('Please drop a valid image file.');
    }
}

function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result;
        showCropSection();
    };
    reader.readAsDataURL(file);
}

function showCropSection() {
    // Hide upload section and show crop section
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('crop-section').style.display = 'block';
    
    // Initialize CropMe
    setTimeout(() => {
        initializeCropMe();
    }, 300);
}

function initializeCropMe() {
    const cropArea = document.getElementById('crop-area');

    // Clear any existing instance
    if (croppieInstance) {
        croppieInstance.destroy();
    }

    // Create new Croppie instance with mobile-friendly settings
    const isMobile = window.innerWidth <= 768;
    const viewportSize = isMobile ? 250 : 320;
    const boundarySize = isMobile ? 300 : 400;

    croppieInstance = new Croppie(cropArea, {
        viewport: {
            width: viewportSize,
            height: viewportSize,
            type: 'circle'
        },
        boundary: {
            width: boundarySize,
            height: boundarySize
        },
        showZoomer: true,
        enableResize: false,
        enableOrientation: true,
        mouseWheelZoom: true, // Enable normal scroll zoom
        enableExif: true,
        enforceBoundary: true
    });

    // Bind the uploaded image
    croppieInstance.bind({
        url: uploadedImage,
        zoom: 0.8
    }).then(() => {
        console.log('Image loaded successfully in Croppie');

        // Add touch-friendly features for mobile
        if (isMobile) {
            addMobileTouchFeatures();
        }
    }).catch(error => {
        console.error('Error loading image:', error);
        showError('Error loading image. Please try again.');
    });
}

function resetCrop() {
    if (croppieInstance && uploadedImage) {
        croppieInstance.bind({
            url: uploadedImage,
            zoom: 0.8
        });
    }
}

function zoomIn() {
    if (croppieInstance) {
        const currentZoom = croppieInstance.get().zoom || 0;
        const newZoom = Math.min(currentZoom + 0.1, 2.0); // Max zoom 2.0
        croppieInstance.setZoom(newZoom);
    }
}

function zoomOut() {
    if (croppieInstance) {
        const currentZoom = croppieInstance.get().zoom || 0;
        const newZoom = Math.max(currentZoom - 0.1, 0.1); // Min zoom 0.1
        croppieInstance.setZoom(newZoom);
    }
}

function addMobileTouchFeatures() {
    const cropArea = document.getElementById('crop-area');

    // Add pinch-to-zoom for mobile
    let initialDistance = 0;
    let initialZoom = 0;

    cropArea.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            initialZoom = croppieInstance.get().zoom || 0;
        }
    });

    cropArea.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            const scale = currentDistance / initialDistance;
            const newZoom = Math.max(0.1, Math.min(2.0, initialZoom * scale));
            croppieInstance.setZoom(newZoom);
        }
    });

    // Add haptic feedback for zoom buttons (if supported)
    const zoomButtons = document.querySelectorAll('.btn-zoom');
    zoomButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (navigator.vibrate) {
                navigator.vibrate(50); // Short vibration
            }
        });
    });
}

function applyCrop() {
    if (!croppieInstance) {
        showError('No image to crop.');
        return;
    }

    // Show loading
    showLoading();

    // Get cropped image with Croppie
    croppieInstance.result({
        type: 'base64',
        size: {
            width: CANVAS_SIZE,
            height: CANVAS_SIZE
        },
        format: 'png',
        quality: 1,
        circle: false // We'll handle the circle in canvas
    }).then(croppedImage => {
        croppedImageData = croppedImage;
        hideLoading();
        showFrameSection();
    }).catch(error => {
        hideLoading();
        console.error('Error cropping image:', error);
        showError('Error cropping image. Please try again.');
    });
}

function showFrameSection() {
    // Hide crop section and show frame section
    document.getElementById('crop-section').style.display = 'none';
    document.getElementById('frame-section').style.display = 'block';
    
    // Start frame generation process
    generateFramedPhoto();
}

function generateFramedPhoto() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        
        progressFill.style.width = progress + '%';
        
        if (progress < 30) {
            progressText.textContent = 'Loading frame...';
        } else if (progress < 60) {
            progressText.textContent = 'Processing image...';
        } else if (progress < 90) {
            progressText.textContent = 'Applying frame...';
        }
    }, 200);
    
    // Wait for frame image to load, then create final image
    if (frameImage.complete) {
        createFinalImage(progressInterval, progressFill, progressText);
    } else {
        frameImage.onload = () => {
            createFinalImage(progressInterval, progressFill, progressText);
        };
    }
}

function createFinalImage(progressInterval, progressFill, progressText) {
    setTimeout(() => {
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        progressText.textContent = 'Complete!';
        
        // Create canvas for final image
        const canvas = document.getElementById('final-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match poster dimensions for high quality
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        console.log('Canvas size set to:', canvas.width, 'x', canvas.height);
        
        // Create image element for cropped photo
        const croppedImg = new Image();
        croppedImg.onload = function() {
            console.log('Cropped image loaded:', croppedImg.width, 'x', croppedImg.height);

            // Clear canvas first
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate center position
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Calculate circle size based on poster frame design
            // Adjust this based on where the circular area is in your poster
            const circleRadius = canvas.width * 0.35; // 35% of canvas width for the photo area
            const imgSize = circleRadius * 2;

            console.log('Drawing image at center:', centerX, centerY, 'circle radius:', circleRadius);

            // Create circular clipping path for the photo
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
            ctx.clip();

            // Draw the cropped image to fill the circle
            ctx.drawImage(croppedImg, centerX - circleRadius, centerY - circleRadius, imgSize, imgSize);
            ctx.restore();

            // Draw frame on top if it's loaded, scaled to canvas size
            if (frameImage.complete && frameImage.width > 0) {
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
                console.log('Frame drawn on canvas');
            } else {
                // If no frame, draw a simple border around the circle
                ctx.strokeStyle = '#667eea';
                ctx.lineWidth = Math.max(4, canvas.width * 0.005); // Scale line width with canvas
                ctx.beginPath();
                ctx.arc(centerX, centerY, circleRadius + 2, 0, 2 * Math.PI);
                ctx.stroke();
                console.log('Default border drawn');
            }

            // Show preview with animation
            document.querySelector('.progress-container').style.display = 'none';
            setTimeout(() => {
                document.getElementById('preview-container').style.display = 'block';
                // Add a subtle success animation
                showSuccessMessage();
            }, 300);
        };
        croppedImg.src = croppedImageData;
    }, 1000);
}

function downloadImage() {
    const canvas = document.getElementById('final-canvas');

    // Show loading for download
    showLoading();

    setTimeout(() => {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.download = `donance-s-pro-photo-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
        link.click();

        console.log('Downloaded image size:', canvas.width, 'x', canvas.height);
        hideLoading();
        showDownloadSuccess();
    }, 1000);
}

function showSuccessMessage() {
    // Create a temporary success indicator
    const successDiv = document.createElement('div');
    successDiv.innerHTML = '<i class="fas fa-check-circle"></i> Photo framed successfully!';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        box-shadow: 0 8px 16px rgba(40, 167, 69, 0.3);
        z-index: 1000;
        animation: slideInRight 0.5s ease-out;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.5s ease-out forwards';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 500);
    }, 3000);
}

function showDownloadSuccess() {
    const successDiv = document.createElement('div');
    successDiv.innerHTML = '<i class="fas fa-download"></i> Photo downloaded successfully!';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        z-index: 1000;
        animation: slideInRight 0.5s ease-out;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.5s ease-out forwards';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 500);
    }, 3000);
}

function startOver() {
    // Reset all variables
    croppieInstance = null;
    uploadedImage = null;
    croppedImageData = null;
    
    // Reset file input
    document.getElementById('photo-input').value = '';
    
    // Reset progress
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Preparing...';
    
    // Show upload section, hide others
    document.getElementById('upload-section').style.display = 'block';
    document.getElementById('crop-section').style.display = 'none';
    document.getElementById('frame-section').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'block';
    document.getElementById('preview-container').style.display = 'none';
    
    // Re-animate sections
    animateStepSections();
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    alert(message); // You can replace this with a better error display
}

function animateStepSections() {
    const sections = document.querySelectorAll('.step-section');
    sections.forEach((section, index) => {
        section.style.animationDelay = (index * 0.2) + 's';
    });
}
