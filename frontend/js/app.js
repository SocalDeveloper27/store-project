// Log to confirm app.js is loaded
console.log("App.js loaded");

// Ensure the state object exists
if (typeof state === "undefined") {
  window.state = {
    currentView: "inventory", // Default view
    inventory: [],
    checkoutItems: [],
    error: null,
  };
}

// Initialize the app when the DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded, initializing app...");
  initApp();
});

// Main app initialization function
function initApp() {
  try {
    console.log("Initializing app...");

    // Set up navigation buttons
    document.getElementById("checkoutBtn").addEventListener("click", () => {
      state.currentView = "checkout";
      renderCurrentView();
    });

    document.getElementById("inventoryBtn").addEventListener("click", () => {
      state.currentView = "inventory";
      renderCurrentView();
    });

    // Render the default view
    renderCurrentView();

    // Hide the loading indicator
    document.querySelector(".loading").style.display = "none";
  } catch (error) {
    console.error("Error initializing app:", error);
    document.querySelector(".loading").textContent =
      "Error loading app. Check the console for details.";
  }
}

// Render the current view based on the state
function renderCurrentView() {
  console.log("Rendering view:", state.currentView);

  if (state.currentView === "checkout") {
    renderCheckoutView();
  } else if (state.currentView === "inventory") {
    renderInventoryView();
  } else {
    console.error("Unknown view:", state.currentView);
  }
}

// Render the inventory view
function renderInventoryView() {
  console.log("Rendering inventory view...");

  app.innerHTML = `
    <h2>Inventory</h2>
    <div class="button-group">
      <button id="addItemBtn" class="button">Add New Item</button>
      <button id="refreshInventoryBtn" class="button button-secondary">Refresh</button>
    </div>
    <div class="inventory-container">
      <p>Loading inventory...</p>
    </div>
  `;

  // Add event listeners for buttons
  document.getElementById("addItemBtn").addEventListener("click", () => {
    state.currentView = "addItem";
    renderCurrentView();
  });

  document
    .getElementById("refreshInventoryBtn")
    .addEventListener("click", () => {
      renderInventoryView();
    });

  // Simulate loading inventory (replace with API call if needed)
  setTimeout(() => {
    const inventoryContainer = document.querySelector(".inventory-container");
    inventoryContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Name</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>12345</td>
            <td>Sample Item</td>
            <td>$9.99</td>
          </tr>
        </tbody>
      </table>
    `;
  }, 1000);
}

// Render the checkout view
function renderCheckoutView() {
  console.log("Rendering checkout view...");

  app.innerHTML = `
    <h2>Checkout</h2>
    <div class="scanner-container">
      <video id="scanner-video" playsinline autoplay muted></video>
      <div class="scanner-overlay">
        <div class="scanner-guide"></div>
      </div>
    </div>
    <div id="scan-status" class="scan-status">Ready to scan</div>
  `;

  // Initialize the camera for the checkout view
  if (window.cameraHandler) {
    window.cameraHandler.initializeCamera("checkout");
  }
}
