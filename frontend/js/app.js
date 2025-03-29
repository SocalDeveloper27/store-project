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

  // Add event listener for the "Add Item" button
  document.getElementById("addItemBtn").addEventListener("click", () => {
    state.currentView = "addItem";
    renderAddItemView();
  });

  // Add event listener for the "Refresh" button
  document
    .getElementById("refreshInventoryBtn")
    .addEventListener("click", () => {
      renderInventoryView();
    });

  // Load and display the inventory
  loadInventory();
}

// Load and display the inventory
async function loadInventory() {
  try {
    const inventory = await api.getInventory();
    state.inventory = inventory;

    const inventoryContainer = document.querySelector(".inventory-container");
    if (inventory.length === 0) {
      inventoryContainer.innerHTML = `
        <p>No items in inventory.</p>
        <button id="addFirstItemBtn" class="button">Add Your First Item</button>
      `;
      document
        .getElementById("addFirstItemBtn")
        .addEventListener("click", () => {
          state.currentView = "addItem";
          renderAddItemView();
        });
      return;
    }

    inventoryContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Name</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${inventory
            .map(
              (item) => `
            <tr>
              <td>${item.barcode}</td>
              <td>${item.name}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>
                <button class="button button-secondary" onclick="editItem('${
                  item.barcode
                }')">Edit</button>
                <button class="button button-danger" onclick="deleteItem('${
                  item.barcode
                }')">Delete</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error("Error loading inventory:", error);
    document.querySelector(".inventory-container").innerHTML = `
      <p>Error loading inventory. Please try again later.</p>
    `;
  }
}

// Edit an item
function editItem(barcode) {
  state.currentView = "editItem";
  state.currentItemBarcode = barcode;
  renderEditItemView();
}

// Delete an item
async function deleteItem(barcode) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await api.deleteItem(barcode);
    alert("Item deleted successfully.");
    renderInventoryView();
  } catch (error) {
    console.error("Error deleting item:", error);
    alert("Failed to delete item. Please try again.");
  }
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
    <table id="checkout-items" class="responsive-table">
      <thead>
        <tr>
          <th>Barcode</th>
          <th>Name</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <!-- Items will be dynamically added here -->
      </tbody>
    </table>
    <div class="checkout-total">Total: $<span id="total-price">0.00</span></div>
    <button id="completeCheckoutBtn" class="button">Complete Checkout</button>
  `;

  // Initialize the camera for the checkout view
  if (window.cameraHandler) {
    window.cameraHandler.initializeCamera("checkout");
  }

  // Add event listener for the "Complete Checkout" button
  document
    .getElementById("completeCheckoutBtn")
    .addEventListener("click", async () => {
      if (state.checkoutItems.length === 0) {
        alert("No items in the checkout list.");
        return;
      }

      try {
        const response = await api.checkout(state.checkoutItems);
        if (response.success) {
          alert("Checkout completed successfully!");
          state.checkoutItems = [];
          renderCheckoutView(); // Refresh the view
        } else {
          alert("Checkout failed: " + response.message);
        }
      } catch (error) {
        console.error("Error completing checkout:", error);
        alert("An error occurred during checkout.");
      }
    });
}

// Add item to the checkout list
function addItemToCheckout(barcode) {
  const item = state.inventory.find((product) => product.barcode === barcode);
  if (!item) {
    alert("Item not found in inventory.");
    return;
  }

  const existingItem = state.checkoutItems.find(
    (checkoutItem) => checkoutItem.barcode === barcode
  );
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.checkoutItems.push({
      barcode: item.barcode,
      name: item.name,
      quantity: 1,
      price: item.price,
    });
  }

  renderCheckoutItems();
}

// Render the checkout items table
function renderCheckoutItems() {
  const tbody = document.querySelector("#checkout-items tbody");
  tbody.innerHTML = "";

  let totalPrice = 0;
  state.checkoutItems.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.barcode}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
      <td>
        <button class="button button-danger" onclick="removeCheckoutItem(${index})">Remove</button>
      </td>
    `;
    tbody.appendChild(row);
    totalPrice += item.price * item.quantity;
  });

  document.getElementById("total-price").textContent = totalPrice.toFixed(2);
}

// Remove an item from the checkout list
function removeCheckoutItem(index) {
  state.checkoutItems.splice(index, 1);
  renderCheckoutItems();
}
