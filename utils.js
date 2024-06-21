// Function for custom error handling
function handleCustomError(error) {
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Headers:', error.response.headers);
    } else if (error.request) {
        console.error('Error Request:', error.request);
    } else {
        console.error('Error Message:', error.message);
    }
    throw new Error(`Error retrieving data: ${error.message}`);
}

module.exports = {
    handleCustomError,
  };