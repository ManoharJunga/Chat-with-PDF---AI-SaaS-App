import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PineconeStore } from "@langchain/pinecone";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { HumanMessage, AIMessage } from "@langchain/core/messages"; // Corrected imports
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import pineconeClient from "./pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { Document } from "langchain/document";
import axios from "axios";


export const indexName = "chatwithpdf";


type HuggingFaceResponse = {
    answer: string;
  };

const maxRetries = 3;  // Maximum number of retries
const retryDelay = 2000; // Delay in milliseconds between retries
const model = new HuggingFaceInference({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "distilbert/distilbert-base-uncased-distilled-squad",
    temperature: 0,
    maxTokens: 10000,
});

async function fetchMessagesFromDB(docId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("User not found");
    }
    console.log("--- Fetching chat history from the firestore database... ---");
    const chats = await adminDb
        .collection(`users`)
        .doc(userId)
        .collection("files")
        .doc(docId)
        .collection("chat")
        .orderBy("createdAt", "desc")
        .get();
    const chatHistory = chats.docs.map((doc) =>
        doc.data().role === "human" ? new HumanMessage(doc.data().message) : new AIMessage(doc.data().message)
    );
    console.log(chatHistory.map((msg) => msg.content.toString()));

    return chatHistory;
}

async function namespaceExists(index: Index<RecordMetadata>, namespace: string): Promise<boolean> {
    if (!namespace) throw new Error("No namespace value provided.");
    const { namespaces } = await index.describeIndexStats();
    return namespaces?.[namespace] !== undefined;
}

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

export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("User not found");
    }
    let pineconeVectorStore;

    try {
        console.log("--- Generating embeddings using Hugging Face Inference API... ---");

        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACE_API_KEY,
            model: "sentence-transformers/paraphrase-mpnet-base-v2",
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

            if (!splitDocs || splitDocs.length === 0) {
                throw new Error("No documents found after splitting the PDF.");
            }

            const validDocs = splitDocs.filter(doc => doc.pageContent && typeof doc.pageContent === 'string');
            if (validDocs.length === 0) {
                throw new Error("No valid documents found after splitting.");
            }

            const documents = validDocs.map(doc => new Document({
                pageContent: doc.pageContent,
                metadata: doc.metadata || {},
            }));

            try {
                console.log("--- Sending request to Hugging Face API... ---");
                const result = await embeddings.embedDocuments(documents.map(doc => doc.pageContent));

                if (!result || !Array.isArray(result) || result.length !== documents.length) {
                    throw new Error("Invalid response from Hugging Face API.");
                }

                console.log("--- Embedding response from Hugging Face ---", result);

                pineconeVectorStore = await PineconeStore.fromDocuments(
                    documents,
                    embeddings,
                    {
                        pineconeIndex: index,
                        namespace: docId,
                    }
                );
                return pineconeVectorStore;
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.error("Error generating embeddings or storing in Pinecone:", error.message);
                    throw new Error(`Failed to generate embeddings for docId ${docId}: ${error.message}`);
                } else {
                    console.error("An unknown error occurred");
                    throw new Error("An unknown error occurred");
                }
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error generating embeddings or storing in Pinecone:", error.message);
            throw new Error(`Failed to generate embeddings for docId ${docId}: ${error.message}`);
        } else {
            console.error("An unknown error occurred");
            throw new Error("An unknown error occurred");
        }
    }
}

const generateLangchainCompletion = async (docId: string, question: string) => {
    try {
        console.log("=== Starting LangChain Completion ===");

        if (!docId || !question) {
            throw new Error("Both 'docId' and 'question' are required.");
        }

        const pineconeVectorStore = await generateEmbeddingsInPineconeVectorStore(docId);
        if (!pineconeVectorStore) throw new Error("Failed to generate Pinecone vector store.");

        const retriever = pineconeVectorStore.asRetriever({
            k: 5,
        });

        const contextDocs = await retriever.getRelevantDocuments(question);

        const maxContextLength = 2048;
        let extractedContext = "";
        for (const doc of contextDocs) {
            if ((extractedContext + doc.pageContent).length > maxContextLength) {
                break;
            }
            extractedContext += doc.pageContent + "\n";
        }

        console.log("Payload to Hugging Face API:", { context: extractedContext, question });

        const response = await axios.post<HuggingFaceResponse>(
            `https://api-inference.huggingface.co/models/${model.model}`,
            { context: extractedContext, question },
            {
                headers: {
                    Authorization: `Bearer ${model.apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.data.answer) throw new Error("Invalid or missing 'answer' in API response.");
        console.log("Answer from Hugging Face:", response.data.answer);
        return { context: extractedContext, question, answer: response.data.answer };
    } catch (error) {
        console.error("Error during LangChain completion:", error);
        throw error;
    }
};

export { model, generateLangchainCompletion };
