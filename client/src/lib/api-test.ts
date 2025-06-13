// Temporary test to verify apiRequest function signature
import { apiRequest } from "./queryClient";

// Test the actual function signature
export const testApiRequest = async () => {
  try {
    // This should work with the correct signature: apiRequest(url, method, data)
    const response = await apiRequest('/api/user', 'GET');
    console.log('apiRequest test successful with (method, url, data) signature');
    return true;
  } catch (error) {
    console.error('apiRequest test failed:', error);
    return false;
  }
};