import { PineconeClient } from '@pinecone-database/pinecone';

// Ensure the PINECONE_API_KEY environment variable is set
if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY environment variable');
}

if (!process.env.PINECONE_ENVIRONMENT) {
    throw new Error('Missing PINECONE_ENVIRONMENT environment variable');
}

// Initialize the Pinecone client
const pineconeClient = new PineconeClient();
await pineconeClient.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT, // Example: "us-west1-gcp"
});

export default pineconeClient;
