import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PineconeStore } from "@langchain/pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import pineconeClient from "./pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { Document } from "langchain/document"; // Import Document class

// Define the index name in Pinecone
export const indexName = "chatwithpdf";

// Function to generate document parts (splitting large PDFs into smaller pieces)
export async function generateDocs(docId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("User not found");
    }
    console.log("--- Fetching the download URL from Firebase... ---");

    const firebaseRef = await adminDb
        .collection("users")
        .doc(userId)
        .collection("files")
        .doc(docId)
        .get();

    const downloadUrl = firebaseRef.data()?.downloadUrl;
    if (!downloadUrl) {
        throw new Error("Download URL not found");
    }
    console.log(`--- Download URL fetched successfully: ${downloadUrl} ---`);

    // Fetch the PDF from the specified URL
    const response = await fetch(downloadUrl);
    const data = await response.blob();
    console.log("--- Loading PDF document... ---");

    const loader = new PDFLoader(data);
    const docs = await loader.load();
    console.log("--- Splitting the document into smaller parts... ---");

    const splitter = new RecursiveCharacterTextSplitter();
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`--- Split into ${splitDocs.length} parts ---`);

    return splitDocs;
}

// Function to check if the namespace exists in Pinecone index
async function namespaceExists(index: Index<RecordMetadata>, namespace: string) {
    if (!namespace) throw new Error("No namespace value provided.");
    const { namespaces } = await index.describeIndexStats();
    return namespaces?.[namespace] !== undefined;
}

// Function to generate embeddings and store them in Pinecone vector store
export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("User not found");
    }
    let pineconeVectorStore;

    try {
        console.log("--- Generating embeddings using Hugging Face Inference API... ---");

        // Initialize Hugging Face Inference Embedding
        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACE_API_KEY,
            model: "sentence-transformers/paraphrase-mpnet-base-v2",
        });

        // Access Pinecone index
        const index = await pineconeClient.index(indexName);
        const namespaceAlreadyExists = await namespaceExists(index, docId);

        // If the namespace exists, reuse the existing index
        if (namespaceAlreadyExists) {
            console.log(`--- Namespace ${docId} already exists, reusing existing embeddings... ---`);
            pineconeVectorStore = await PineconeStore.fromExistingIndex(embeddings, {
                pineconeIndex: index,
                namespace: docId,
            });
            return pineconeVectorStore;
        } else {
            // If the namespace does not exist, generate new embeddings and store them
            const splitDocs = await generateDocs(docId);
            console.log(`--- Storing embeddings in namespace ${docId} in the ${indexName} Pinecone vector store... ---`);

            // Check if splitDocs is valid
            if (!splitDocs || splitDocs.length === 0) {
                throw new Error("No documents found after splitting the PDF.");
            }

            // Log the splitDocs for debugging
            console.log("--- Split document contents ---", splitDocs.map(doc => doc.pageContent));

            // Convert the split documents to valid Document objects
            const validDocs = splitDocs.filter(doc => doc.pageContent && typeof doc.pageContent === 'string');
            if (validDocs.length === 0) {
                throw new Error("No valid documents found after splitting.");
            }

            // Convert strings to Document objects
            const documents = validDocs.map(doc => new Document({
                pageContent: doc.pageContent, 
                metadata: doc.metadata || {} // Optionally include metadata if necessary
            }));

            // Now generate embeddings using the Document objects
            try {
                console.log("--- Sending request to Hugging Face API... ---");
                const result = await embeddings.embedDocuments(documents.map(doc => doc.pageContent));

                // Validate the Hugging Face response
                if (!result || !Array.isArray(result) || result.length !== documents.length) {
                    throw new Error("Invalid response from Hugging Face API.");
                }

                console.log("--- Embedding response from Hugging Face ---", result);

                // If embeddings are generated successfully, store them in Pinecone
                pineconeVectorStore = await PineconeStore.fromDocuments(
                    documents, // Use the Document objects here
                    embeddings,
                    {
                        pineconeIndex: index,
                        namespace: docId,
                    }
                );
                return pineconeVectorStore;
            } catch (error: unknown) {
                console.error("Error generating embeddings or storing in Pinecone:", error);
                throw new Error(`Failed to generate embeddings for docId ${docId}: ${error}`);
            }
        }
    } catch (error: unknown) {
        // Type guard to check if the error is an instance of Error
        if (error instanceof Error) {
            console.error("Error generating embeddings or storing in Pinecone:", error.message);
            throw new Error(`Failed to generate embeddings for docId ${docId}: ${error.message}`);
        } else {
            // Handle unknown error types
            console.error("An unknown error occurred");
            throw new Error("An unknown error occurred");
        }
    }
}
