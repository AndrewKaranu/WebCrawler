// This file adds some debug utilities to help diagnose rendering issues
// Add this to the app's entry point

// Global error handler for React rendering
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

// Add error tracking for fetch calls
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    console.log(`Fetch request: ${args[0]}`);
    const response = await originalFetch(...args);
    console.log(`Fetch response for ${args[0]}: ${response.status}`);
    return response;
  } catch (error) {
    console.error(`Fetch error for ${args[0]}:`, error);
    throw error;
  }
};

console.log('Debug utilities loaded');
