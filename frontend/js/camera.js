console.log("Camera.js loaded");

// Global variables to track camera state
let activeCameraStream = null;
let currentScanner = null;

// Function to initialize the camera
function initializeCamera(viewType) {
  console.log(`Initializing camera for ${viewType} view`);

  setTimeout(() => {
    const videoElement = document.getElementById("scanner-video");
    if (!videoElement) {
      console.log("No video element found, skipping camera initialization");
      return;
    }

    // Add attributes for iOS compatibility
    videoElement.setAttribute("playsinline", "");
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("muted", "");

    // Stop any existing camera stream
    stopCamera();

    // Start the camera
    startCamera(videoElement, viewType);
  }, 300);
}

// Function to stop the camera
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

// Function to start the camera
async function startCamera(videoElement, viewType) {
  try {
    console.log("Requesting camera access...");

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeCameraStream = stream;
    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => {
      videoElement.play().then(() => {
        console.log("Camera started successfully");
        initBarcodeScanner(videoElement, viewType);
      });
    };
  } catch (error) {
    console.error("Error accessing camera:", error);
  }
}

// Function to initialize the barcode scanner
function initBarcodeScanner(videoElement, viewType) {
  if (!window.ZXing) {
    console.error("ZXing library not loaded");
    return;
  }

  try {
    const codeReader = new ZXing.BrowserMultiFormatReader();
    codeReader.decodeFromVideoElementContinuously(
      videoElement,
      (result, err) => {
        if (result) {
          console.log("Barcode detected:", result.text);
          handleScannedBarcode(result.text, viewType);
        }
      }
    );

    currentScanner = codeReader;
  } catch (error) {
    console.error("Error initializing barcode scanner:", error);
  }
}

// Function to handle scanned barcodes
function handleScannedBarcode(barcode, viewType) {
  console.log(`Scanned barcode (${viewType}):`, barcode);
}

// Export functions for app.js
window.cameraHandler = {
  initializeCamera,
  stopCamera,
};
