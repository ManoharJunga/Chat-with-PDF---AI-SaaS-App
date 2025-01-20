import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PineconeStore } from "@langchain/pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import pineconeClient from "./pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const indexName = "manohar";

// Function to generate document parts
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
        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACE_API_KEY, // Hugging Face API key
            model: "sentence-transformers/all-MiniLM-L6-v2", // Example model
        });

        const index = await pineconeClient.index(indexName);
        const namespaceAlreadyExists = await namespaceExists(index, docId);

        if (namespaceAlreadyExists) {
            console.log(`--- Namespace ${docId} already exists, reusing existing embeddings... ---`);
            pineconeVectorStore = await PineconeStore.fromExistingIndex(embeddings, {
                pineconeIndex: index,
                namespace: docId,
            });
            return pineconeVectorStore;
        } else {
            const splitDocs = await generateDocs(docId);
            console.log(`--- Storing embeddings in namespace ${docId} in the ${indexName} Pinecone vector store... ---`);
            pineconeVectorStore = await PineconeStore.fromDocuments(
                splitDocs,
                embeddings,
                {
                    pineconeIndex: index,
                    namespace: docId,
                }
            );
            return pineconeVectorStore;
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
