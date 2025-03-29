// Add this at the top to check if it's loaded
console.log("Camera.js loading...");

// Make sure we notify when module is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("Camera.js ready");
});

// Global variables to track camera state
let activeCameraStream = null;
let currentScanner = null;

// Function to initialize camera - call this when views change
function initializeCamera(viewType) {
  console.log(`Initializing camera for ${viewType} view`);

  // Wait for DOM to be ready
  setTimeout(() => {
    const videoElement = document.getElementById("scanner-video");
    if (!videoElement) {
      console.log("No video element found, scanner not needed for this view");
      return;
    }

    // Add critical attributes for iOS Safari compatibility
    videoElement.setAttribute("playsinline", "");
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("muted", "");

    // Stop any existing camera stream first
    stopCamera();

    // Start camera with proper settings
    startCamera(videoElement, viewType);
  }, 300);
}

// Stop camera when switching views
function stopCamera() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }

  if (currentScanner) {
    try {
      currentScanner.reset();
    } catch (e) {
      console.log("Error resetting scanner:", e);
    }
    currentScanner = null;
  }
}

// Start camera with optimal settings
async function startCamera(videoElement, viewType) {
  const scannerContainer = videoElement.parentElement;
  const statusElement =
    document.getElementById("scan-status") ||
    document.querySelector(".scan-status");

  if (statusElement) statusElement.textContent = "Accessing camera...";

  try {
    console.log("Requesting camera access...");

    // Camera constraints optimized for barcode scanning
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" }, // Prefer back camera
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeCameraStream = stream;
    videoElement.srcObject = stream;

    if (statusElement)
      statusElement.textContent = "Camera ready, preparing scanner...";

    // Start barcode scanner when video is ready
    videoElement.onloadedmetadata = () => {
      videoElement
        .play()
        .then(() => {
          console.log("Video playing, initializing barcode scanner");
          if (statusElement) statusElement.textContent = "Scanner active";

          // Initialize barcode reader with a delay to ensure video is playing
          setTimeout(() => {
            initBarcodeScanner(videoElement, viewType);
          }, 1000);
        })
        .catch((error) => {
          console.error("Error playing video:", error);
          if (statusElement)
            statusElement.textContent = `Video error: ${error.message}`;
        });
    };
  } catch (error) {
    console.error("Camera error:", error);

    // Show meaningful error based on error type
    let errorMessage = "Camera access failed.";
    if (error.name === "NotAllowedError") {
      errorMessage =
        "Camera permission denied. Please allow camera access in your browser settings.";
    } else if (error.name === "NotFoundError") {
      errorMessage = "No camera found on your device.";
    } else if (error.name === "NotReadableError") {
      errorMessage = "Camera is being used by another application.";
    }

    if (scannerContainer) {
      scannerContainer.innerHTML = `
        <div class="error-message" style="padding:15px;text-align:center;">
          <p>${errorMessage}</p>
          <p style="font-size:0.8em;color:#666;">${error.name}: ${error.message}</p>
        </div>`;
    }

    if (statusElement) statusElement.textContent = errorMessage;
  }
}

// Initialize barcode scanner
function initBarcodeScanner(videoElement, viewType) {
  if (!window.ZXing) {
    console.error("ZXing library not loaded");
    return;
  }

  try {
    console.log("Creating ZXing barcode reader");
    const codeReader = new ZXing.BrowserMultiFormatReader();

    // Start continuous scanning
    codeReader.decodeFromVideoElementContinuously(
      videoElement,
      (result, err) => {
        if (result) {
          const barcode = result.text.trim();
          console.log("Barcode detected:", barcode);

          // Process based on current view
          handleScannedBarcode(barcode, viewType);

          // Provide haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        }

        if (err && !(err instanceof ZXing.NotFoundException)) {
          console.error("Scanning error:", err);
        }
      }
    );

    // Store for later cleanup
    currentScanner = codeReader;
  } catch (error) {
    console.error("Error initializing barcode scanner:", error);
  }
}

// Handle scanned barcode differently depending on view
function handleScannedBarcode(barcode, viewType) {
  if (viewType === "checkout") {
    // For checkout view, try to add item to checkout
    if (window.addItemToCheckout) {
      window.addItemToCheckout(barcode);
    } else {
      console.error("addItemToCheckout function not found");
    }
  } else if (viewType === "addItem") {
    // For add item view, fill the barcode input
    const barcodeInput = document.getElementById("barcode");
    if (barcodeInput) {
      barcodeInput.value = barcode;

      // Visual feedback
      barcodeInput.classList.add("scan-success");
      setTimeout(() => barcodeInput.classList.remove("scan-success"), 1500);
    }
  }

  // Update status with scanned barcode
  const statusElement =
    document.getElementById("scan-status") ||
    document.querySelector(".scan-status");
  if (statusElement) {
    statusElement.innerHTML = `<strong>Scanned:</strong> ${barcode}`;
    statusElement.classList.add("scan-success");
    setTimeout(() => statusElement.classList.remove("scan-success"), 1500);
  }
}

// Export functions for app.js to use
window.cameraHandler = {
  initializeCamera,
  stopCamera,
};
