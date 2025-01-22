import { Pinecone } from '@pinecone-database/pinecone';

// Ensure the API key and environment variables are set
if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT) {
    throw new Error('Missing required environment variables: PINECONE_API_KEY or PINECONE_ENVIRONMENT');
}

// Initialize Pinecone client directly with the API key
const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY, // Only include API key here
});

// You can also set the environment using the environment variable in your code
pineconeClient.environment = process.env.PINECONE_ENVIRONMENT; // Set the environment explicitly

(async () => {
    try {
        // Now the client should be correctly initialized and environment configured
        console.log('Pinecone API key is valid, and the client has been initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize Pinecone client. Possible reasons:');
        console.error('- Invalid API Key');
        console.error('- Incorrect environment');
        console.error('- Network issues');
        console.error((error as Error).message); // Type assertion for better error handling
    }
})();

export default pineconeClient; // Export the client for reuse
