// API URL - Change this to your deployed backend URL when deployed
const API_BASE_URL = "https://store-project-api-h325.onrender.com";

// API client for communicating with backend
const api = {
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
      const response = await fetch(`${API_BASE_URL}/api/inventory/${barcode}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete item");
      }
      return await response.json();
    } catch (error) {
      console.error("Error deleting item:", error);
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

// For development/testing with a local backend
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  console.log("Using local development API endpoint");
  const API_BASE_URL = "http://localhost:5000";
}

// Export the API object
export default api;
