import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY environment variable');
}

const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

export const initializePineconeClient = async () => {
    try {
        await pineconeClient.init({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',  // Default to us-west1-gcp if not set
        });
        console.log("Pinecone client initialized successfully");
        return pineconeClient;
    } catch (error) {
        console.error("Error initializing Pinecone client:", error.message);
        throw new Error("Failed to initialize Pinecone client");
    }
};

export default pineconeClient;
