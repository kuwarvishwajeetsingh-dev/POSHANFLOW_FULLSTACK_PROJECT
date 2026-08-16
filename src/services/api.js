// Backend Dev ko sirf yahan API base URL paste karna hoga
const API_BASE_URL = "http://localhost:5000/api"; 

export const apiService = {
  // Login Endpoint
  login: async (credentials) => {
    // Backend dev replace with: return fetch(`${API_BASE_URL}/login`, { method: 'POST', body: JSON.stringify(credentials) })
    return { success: true, role: credentials.role };
  },

  // Get Inventory & Attendance Data
  getDashboardData: async () => {
    return {
      stock: { rice: 18, pulse: 3.5, oil: 0.9 },
      history: [
        { id: 'PO-9508', date: '16/08/2026', items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg', status: 'Pending Dispatch' },
        { id: 'PO-8842', date: '12/08/2026', items: 'Rice: 100kg, Pulses: 20kg', status: 'Delivered' }
      ]
    };
  },

  // Create Purchase Order Endpoint
  createPurchaseOrder: async (orderPayload) => {
    // Backend dev replace with: POST request to /purchase-orders
    return { success: true, orderId: `PO-${Math.floor(1000 + Math.random() * 9000)}` };
  }
};