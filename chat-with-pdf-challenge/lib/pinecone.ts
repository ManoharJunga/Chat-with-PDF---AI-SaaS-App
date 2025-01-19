import { Pinecone } from '@pinecone-database/pinecone';

if(!process.env.PINECONE_API_KEY){
    throw new Error('Missing PINECONE_API_KEY environment variable');
}

const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
export default pineconeClient;