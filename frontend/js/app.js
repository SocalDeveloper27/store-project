// Application state
const state = {
  currentView: "inventory",
  inventory: [],
  currentItem: null,
  checkoutItems: [],
  loading: false,
  error: null,
};

// Add this to track active camera streams
let activeCameraStream = null;

// DOM elements
const app = document.getElementById("app");
const checkoutBtn = document.getElementById("checkoutBtn");
const inventoryBtn = document.getElementById("inventoryBtn");

// Initialize the application
async function init() {
  // Set up event listeners for navigation
  checkoutBtn.addEventListener("click", () => navigateTo("checkout"));
  inventoryBtn.addEventListener("click", () => navigateTo("inventory"));

  // Add popstate event listener for browser back/forward navigation
  window.addEventListener("popstate", handlePopState);

  // Check the URL to determine the initial view
  handlePopState();

  // Initial data load
  await loadInventory();
}

// Handle browser history navigation
function handlePopState() {
  const path = window.location.pathname;

  if (path.includes("/checkout")) {
    state.currentView = "checkout";
  } else if (path.includes("/add")) {
    state.currentView = "addItem";
  } else if (path.includes("/edit/")) {
    state.currentView = "editItem";
    const barcode = path.split("/edit/")[1];
    loadItem(barcode);
  } else {
    state.currentView = "inventory";
  }

  renderCurrentView();
}

// Navigate to a different view
function navigateTo(view, data = null) {
  state.currentView = view;
  state.error = null;

  // Update browser history
  let url = "/";
  switch (view) {
    case "checkout":
      url = "/checkout";
      break;
    case "addItem":
      url = "/add";
      break;
    case "editItem":
      if (data) {
        url = `/edit/${data.barcode}`;
        state.currentItem = data;
      }
      break;
  }

  history.pushState({ view, data }, "", url);
  renderCurrentView();
}

// Load inventory data from API
async function loadInventory() {
  state.loading = true;
  renderCurrentView();

  try {
    state.inventory = await window.api.getInventory();
    state.loading = false;
    renderCurrentView();
  } catch (error) {
    state.error = `Failed to load inventory: ${error.message}`;
    state.loading = false;
    renderCurrentView();
  }
}

// Load a single item by barcode
async function loadItem(barcode) {
  state.loading = true;
  renderCurrentView();

  try {
    state.currentItem = await window.api.getItem(barcode);
    state.loading = false;
    renderCurrentView();
  } catch (error) {
    state.error = `Failed to load item: ${error.message}`;
    state.loading = false;
    renderCurrentView();
  }
}

// Render the current view based on state
function renderCurrentView() {
  // Stop any active camera first
  stopCamera();

  // Then render the appropriate view
  if (state.currentView === "checkout") {
    renderCheckoutView();
  } else if (state.currentView === "inventory") {
    renderInventoryView();
  } else if (state.currentView === "addItem") {
    renderAddItemView();
  } else if (state.currentView === "editItem") {
    renderEditItemView();
  } else {
    app.innerHTML = "<div>Page not found</div>";
  }
}

// Add a function to stop camera
function stopCamera() {
  if (activeCameraStream) {
    console.log("Stopping active camera stream");
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }

  // Reset any global scanner objects
  if (window.currentScanner) {
    try {
      window.currentScanner.reset();
      window.currentScanner = null;
    } catch (e) {
      console.log("Error resetting scanner:", e);
    }
  }
}

// Render the inventory view
function renderInventoryView() {
  if (state.inventory.length === 0) {
    app.innerHTML = `
      <div class="inventory-container">
        <h1>Inventory</h1>
        <div class="button-group">
          <button class="button" id="addItemBtn">Add New Item</button>
        </div>
        <div class="empty-state">
          <p>No items in inventory.</p>
          <button class="button" id="emptyAddBtn">Add Your First Item</button>
        </div>
      </div>
    `;
    document
      .getElementById("addItemBtn")
      .addEventListener("click", () => navigateTo("addItem"));
    document
      .getElementById("emptyAddBtn")
      .addEventListener("click", () => navigateTo("addItem"));
    return;
  }

  let tableRows = state.inventory
    .map(
      (item) => `
    <tr>
      <td data-label="Name">${item.name}</td>
      <td data-label="Barcode">${item.barcode}</td>
      <td data-label="Quantity" class="${
        item.quantity === 0
          ? "out-of-stock"
          : item.quantity < 5
          ? "low-stock"
          : ""
      }">${item.quantity}</td>
      <td data-label="Description" class="description-cell">${
        item.description || ""
      }</td>
      <td data-label="Price">$${item.price.toFixed(2)}</td>
      <td data-label="Actions" class="actions">
        <button class="button button-secondary edit-btn" data-barcode="${
          item.barcode
        }">Edit</button>
        <button class="button button-danger delete-btn" data-barcode="${
          item.barcode
        }">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  app.innerHTML = `
    <div class="inventory-container">
      <h1>Inventory</h1>
      <div class="button-group">
        <button class="button" id="addItemBtn">Add New Item</button>
      </div>
      <table class="inventory-table responsive-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Barcode</th>
            <th>Quantity</th>
            <th>Description</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  // Add event listeners to buttons
  document
    .getElementById("addItemBtn")
    .addEventListener("click", () => navigateTo("addItem"));

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const barcode = btn.getAttribute("data-barcode");
      const item = state.inventory.find((i) => i.barcode === barcode);
      navigateTo("editItem", item);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const barcode = btn.getAttribute("data-barcode");
      if (confirm("Are you sure you want to delete this item?")) {
        try {
          btn.disabled = true;
          btn.textContent = "Deleting...";

          await window.api.deleteItem(barcode);
          await loadInventory();
        } catch (error) {
          btn.disabled = false;
          btn.textContent = "Delete";

          state.error = `Failed to delete item: ${error.message}`;
          renderCurrentView();
        }
      }
    });
  });
}

// Render the checkout view
function renderCheckoutView() {
  // The HTML structure with the scanner frame added
  app.innerHTML = `
    <h2>Checkout</h2>
    
    <!-- Add error message container -->
    <div id="error-message" class="error-message"></div>
    
    <!-- Scanner with frame -->
    <div class="scanner-container" id="scanner-container">
      <video id="scanner-video" playsinline autoplay muted></video>
      <div class="scanner-overlay">
        <div class="scanner-guide"></div>
      </div>
    </div>
    <p class="scanner-help">Position barcode within the frame to scan</p>
    
    <!-- Rest of your checkout view -->
    <div class="checkout-items">
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Name</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="checkout-items">
          <!-- Checkout items will be inserted here -->
        </tbody>
      </table>
      <div class="checkout-summary">
        <span>Total: $<span id="checkout-total">0.00</span></span>
      </div>
    </div>
    
    <div class="button-group">
      <button id="complete-checkout-btn" class="button">Complete Checkout</button>
      <button id="clear-checkout-btn" class="button button-secondary">Clear All</button>
    </div>
  `;

  // Set up event listeners
  document
    .getElementById("complete-checkout-btn")
    .addEventListener("click", completeCheckout);
  document
    .getElementById("clear-checkout-btn")
    .addEventListener("click", clearCheckout);

  // Start the camera for barcode scanning
  setupBarcodeScanner();

  // Update checkout items display
  updateCheckoutDisplay();
}

// Render the add item view
function renderAddItemView() {
  app.innerHTML = `
    <h1>Add New Item</h1>
    <div class="form-container">
      <!-- Add scanner container before the form -->
      <div id="scanner-container">
        <video id="scanner-video" playsinline></video>
        <div class="scanner-overlay">
          <div class="scanner-guide"></div>
        </div>
      </div>
      <p class="scanner-help">Position barcode within the frame to scan</p>
      <button id="toggleScannerBtn" class="button button-secondary">Toggle Scanner</button>
      
      <form id="add-item-form">
        <div class="form-group">
          <label for="barcode">Barcode:</label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            required
            autocomplete="off"
            inputmode="numeric"
          />
        </div>
        
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" required autocomplete="off" />
        </div>
        
        <div class="form-group">
          <label for="quantity">Quantity:</label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value="1"
            min="0"
            required
            inputmode="numeric"
            pattern="[0-9]*"
          />
        </div>
        
        <div class="form-group">
          <label for="price">Price ($):</label>
          <input
            type="number"
            step="0.01"
            id="price"
            name="price"
            value="0.00"
            min="0"
            required
            inputmode="decimal"
            pattern="[0-9]*\\.?[0-9]+"
          />
        </div>
        
        <div class="form-group">
          <label for="description">Description:</label>
          <textarea id="description" name="description"></textarea>
        </div>
        
        <div class="button-group">
          <button type="submit" class="button">Add Item</button>
          <button type="button" id="cancelBtn" class="button button-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Set up scanner on page load
  setupBarcodeScanner();

  // Add toggle functionality for the scanner
  document
    .getElementById("toggleScannerBtn")
    .addEventListener("click", function () {
      const scannerContainer = document.getElementById("scanner-container");
      if (scannerContainer.style.display === "none") {
        scannerContainer.style.display = "block";
        setupBarcodeScanner();
      } else {
        scannerContainer.style.display = "none";
        // Stop any running video streams
        const videoElement = document.getElementById("scanner-video");
        if (videoElement && videoElement.srcObject) {
          videoElement.srcObject.getTracks().forEach((track) => track.stop());
        }
      }
    });

  // Add event listeners for form
  document
    .getElementById("add-item-form")
    .addEventListener("submit", handleAddItem);
  document
    .getElementById("cancelBtn")
    .addEventListener("click", () => navigateTo("inventory"));
}

// Render the edit item view
function renderEditItemView() {
  if (!state.currentItem) {
    app.innerHTML = '<div class="error-message">Item not found</div>';
    return;
  }

  app.innerHTML = `
    <h1>Edit Item</h1>
    <div class="edit-container">
      <div class="item-details">
        <p><strong>Editing:</strong> ${state.currentItem.name} (Barcode: ${
    state.currentItem.barcode
  })</p>
      </div>
      
      <form id="edit-item-form">
        <div class="form-group">
          <label for="barcode">Barcode:</label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            value="${state.currentItem.barcode}"
            required
            autocomplete="off"
            inputmode="numeric"
          />
          <p class="barcode-info">
            Changing the barcode will create a new entry if the barcode doesn't exist.
          </p>
        </div>
        
        <div class="form-group">
          <label for="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value="${state.currentItem.name}"
            required
            autocomplete="off"
          />
        </div>
        
        <div class="form-group">
          <label for="quantity">Quantity:</label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value="${state.currentItem.quantity}"
            min="0"
            required
            inputmode="numeric"
            pattern="[0-9]*"
          />
        </div>
        
        <div class="form-group">
          <label for="price">Price ($):</label>
          <input
            type="number"
            step="0.01"
            id="price"
            name="price"
            value="${state.currentItem.price}"
            min="0"
            required
            inputmode="decimal"
            pattern="[0-9]*\\.?[0-9]+"
          />
        </div>
        
        <div class="form-group">
          <label for="description">Description:</label>
          <textarea id="description" name="description">${
            state.currentItem.description || ""
          }</textarea>
        </div>
        
        <div class="button-group">
          <button type="submit" class="button">Save Changes</button>
          <button type="button" id="deleteBtn" class="button button-danger">Delete Item</button>
          <button type="button" id="cancelEditBtn" class="button button-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Add event listeners
  document
    .getElementById("edit-item-form")
    .addEventListener("submit", handleEditItem);
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await window.api.deleteItem(state.currentItem.barcode);
        navigateTo("inventory");
        await loadInventory();
      } catch (error) {
        state.error = `Failed to delete item: ${error.message}`;
        renderCurrentView();
      }
    }
  });
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", () => navigateTo("inventory"));
}

// Setup barcode scanner
async function setupBarcodeScanner() {
  const videoElement = document.getElementById("scanner-video");
  if (!videoElement) return;

  // Add critical attributes for mobile browsers
  videoElement.setAttribute("playsinline", "true");
  videoElement.setAttribute("autoplay", "true");
  videoElement.setAttribute("muted", "true");

  // Check if camera is already running
  if (activeCameraStream) {
    console.log("Camera already running, stopping previous stream");
    stopCamera();
  }

  try {
    console.log("Starting camera with environment facing mode...");

    // Use constraints optimized for barcode scanning
    const constraints = {
      audio: false,
      video: {
        facingMode: "environment", // Force back camera
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: { ideal: 16 / 9 },
        focusMode: "continuous", // Request continuous autofocus if available
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("Camera access granted");

    // Save reference to stream for later cleanup
    activeCameraStream = stream;
    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => {
      videoElement
        .play()
        .then(() => {
          console.log("Video playback started, initializing barcode reader");

          // Initialize barcode reader after a delay
          setTimeout(() => {
            initBarcodeReader(videoElement);
          }, 1000); // Increased delay for better initialization
        })
        .catch((error) => {
          console.error("Error starting video playback:", error);
        });
    };
  } catch (error) {
    console.error("Camera access error:", error);
    // Error handling code...
  }
}

// Update barcode reader initialization with more robust approach
function initBarcodeReader(videoElement) {
  console.log("Initializing barcode reader...");

  if (!window.ZXing) {
    console.error(
      "ZXing library not found! Make sure it's loaded before this script."
    );
    return;
  }

  try {
    console.log("Creating ZXing reader instance");
    const codeReader = new ZXing.BrowserMultiFormatReader();

    console.log("Starting continuous decode");
    codeReader.decodeFromVideoElementContinuously(
      videoElement,
      (result, error) => {
        if (result) {
          const scannedBarcode = result.text.trim();
          console.log("Successfully scanned barcode:", scannedBarcode);

          // Provide feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          // Handle barcode based on current view
          if (state.currentView === "checkout") {
            addItemToCheckout(scannedBarcode);
          } else if (state.currentView === "addItem") {
            document.getElementById("barcode").value = scannedBarcode;

            // Highlight the input field
            const barcodeInput = document.getElementById("barcode");
            barcodeInput.classList.add("scan-success");
            setTimeout(
              () => barcodeInput.classList.remove("scan-success"),
              1500
            );
          }
        }

        if (error && !(error instanceof ZXing.NotFoundException)) {
          console.error("Scanning error:", error);
        }
      }
    );

    // Save scanner reference for cleanup
    window.currentScanner = codeReader;
    console.log("Continuous scanning started");
  } catch (error) {
    console.error("Error initializing barcode reader:", error);
  }
}

// Add item to checkout list
function addItemToCheckout(barcode) {
  const item = state.inventory.find((i) => i.barcode === barcode);

  if (!item) {
    const errorElement = document.getElementById("error-message");
    if (errorElement) {
      errorElement.textContent = "Item not found in inventory.";
    }
    return;
  }

  // Check if item already in checkout
  const existingItemIndex = state.checkoutItems.findIndex(
    (i) => i.barcode === barcode
  );

  if (existingItemIndex !== -1) {
    // Increment quantity if already in checkout
    state.checkoutItems[existingItemIndex].quantity += 1;
    state.checkoutItems[existingItemIndex].price =
      item.price * state.checkoutItems[existingItemIndex].quantity;
  } else {
    // Add new item to checkout
    state.checkoutItems.push({
      barcode: item.barcode,
      name: item.name,
      quantity: 1,
      price: item.price,
    });
  }

  renderCheckoutView();
}

// Calculate total price for checkout
function calculateTotal() {
  return state.checkoutItems.reduce((total, item) => total + item.price, 0);
}

// Handle add item form submission
async function handleAddItem(e) {
  e.preventDefault();

  const newItem = {
    barcode: document.getElementById("barcode").value,
    name: document.getElementById("name").value,
    quantity: parseInt(document.getElementById("quantity").value),
    price: parseFloat(document.getElementById("price").value),
    description: document.getElementById("description").value,
  };

  try {
    await window.api.addItem(newItem);
    await loadInventory();
    navigateTo("inventory");
  } catch (error) {
    state.error = `Failed to add item: ${error.message}`;
    renderCurrentView();
  }
}

// Handle edit item form submission
async function handleEditItem(e) {
  e.preventDefault();

  const updatedItem = {
    barcode: document.getElementById("barcode").value,
    name: document.getElementById("name").value,
    quantity: parseInt(document.getElementById("quantity").value),
    price: parseFloat(document.getElementById("price").value),
    description: document.getElementById("description").value,
  };

  try {
    await window.api.updateItem(state.currentItem.barcode, updatedItem);
    await loadInventory();
    navigateTo("inventory");
  } catch (error) {
    state.error = `Failed to update item: ${error.message}`;
    renderCurrentView();
  }
}

// Complete checkout process
async function completeCheckout() {
  if (state.checkoutItems.length === 0) {
    return;
  }

  try {
    const button = document.getElementById("checkout-button");
    button.disabled = true;
    button.textContent = "Processing...";

    await window.api.checkout(state.checkoutItems);

    // Reset checkout items
    state.checkoutItems = [];

    // Reload inventory
    await loadInventory();

    // Show success message and navigate back to inventory
    alert("Checkout completed successfully!");
    navigateTo("inventory");
  } catch (error) {
    state.error = `Checkout failed: ${error.message}`;
    renderCurrentView();
  }
}

// Clear all items from checkout
function clearCheckout() {
  state.checkoutItems = [];
  renderCheckoutView();
}

// Update checkout items display
function updateCheckoutDisplay() {
  const checkoutItemsContainer = document.getElementById("checkout-items");
  const totalPriceElement = document.getElementById("checkout-total");

  if (!checkoutItemsContainer || !totalPriceElement) return;

  checkoutItemsContainer.innerHTML = state.checkoutItems
    .map(
      (item, index) => `
      <tr>
        <td>${item.barcode}</td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>
          <button class="button button-danger" onclick="removeCheckoutItem(${index})">Remove</button>
        </td>
      </tr>
    `
    )
    .join("");

  totalPriceElement.textContent = calculateTotal().toFixed(2);
}

// Remove an item from checkout
function removeCheckoutItem(index) {
  state.checkoutItems.splice(index, 1);
  updateCheckoutDisplay();
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init);
