// API URL - Change this to your deployed backend URL when deployed
let API_BASE_URL = "https://store-project-api-h325.onrender.com";

// For development/testing with a local backend
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  console.log("Using local development API endpoint");
  API_BASE_URL = "http://localhost:5000";
}

// API client for communicating with backend
window.api = {
  // Get all inventory items
  async getInventory() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch inventory");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching inventory:", error);
      throw error;
    }
  },

  // Get item by barcode
  async getItem(barcode) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/${barcode}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Item not found");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching item:", error);
      throw error;
    }
  },

  // Add a new item
  async addItem(item) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add item");
      }
      return await response.json();
    } catch (error) {
      console.error("Error adding item:", error);
      throw error;
    }
  },

  // Update an item
  async updateItem(barcode, item) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/${barcode}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }
      return await response.json();
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  },

  // Delete an item
  async deleteItem(barcode) {
    try {
      // First, ping the backend to wake it up if it's sleeping
      try {
        await fetch(`${API_BASE_URL}/`);
      } catch (e) {
        console.log("Wake-up ping failed, proceeding anyway...");
      }

      // Add loading indicator to UI
      const deleteBtn = document.querySelector(
        `.delete-btn[data-barcode="${barcode}"]`
      );
      if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting...";
      }

      // Now make the actual delete request with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_BASE_URL}/api/inventory/${barcode}`, {
        method: "DELETE",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete item");
      }

      return true;
    } catch (error) {
      console.error("Error deleting item:", error);
      if (error.name === "AbortError") {
        throw new Error(
          "Delete request timed out. Server might be starting up, please try again."
        );
      }
      throw error;
    }
  },

  // Process checkout
  async checkout(checkoutItems) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ checkoutItems }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Checkout failed");
      }
      return await response.json();
    } catch (error) {
      console.error("Error processing checkout:", error);
      throw error;
    }
  },
};
