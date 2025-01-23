import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { PineconeStore } from "@langchain/pinecone";

import { createRetrievalChain } from "langchain/chains/retrieval"
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import pineconeClient from "./pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { Document } from "langchain/document"; // Import Document class
import { HuggingFaceInference } from "@langchain/community/llms/hf";


// Define the index name in Pinecone
export const indexName = "chatwithpdf";

const model = new HuggingFaceInference({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "deepset/roberta-base-squad2", // For the GPT-2 model
    temperature: 0, // Adjust temperature as needed
    maxTokens: 1000, // Adjust based on the model's token limit
    // // You can replace this with GPT-3 or any other language model available
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

const generateLangchainCompletion = async (docId: string, question: string) => {
    console.log("--- Starting generateLangchainCompletion ---");
    console.log(`Doc ID: ${docId}`);
    console.log(`Question: ${question}`);

    // Step 1: Generate Pinecone Vector Store
    let pineconeVectorStore;
    try {
        pineconeVectorStore = await generateEmbeddingsInPineconeVectorStore(docId);
        console.log(`--- Pinecone Vector Store Generated Successfully ---`);
    } catch (error) {
        console.error(`Error generating Pinecone vector store:`, error);
        throw error;
    }

    if (!pineconeVectorStore) {
        console.error(`Pinecone vector store not found.`);
        throw new Error("Pinecone vector store not found");
    }

    // Step 2: Create a retriever
    console.log("--- Creating a retriever... ---");
    const retriever = pineconeVectorStore.asRetriever();
    console.log(`Retriever created successfully:`, retriever);

    // Step 3: Fetch relevant context from the Pinecone Vector Store
    let context;
    try {
        // Use getRelevantDocuments to fetch context based on the question
        context = await retriever.getRelevantDocuments(question);
        console.log("--- Context fetched successfully ---");
        console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    } catch (error) {
        console.error(`Error fetching context from Pinecone Vector Store:`, error);
        throw error;
    }

    // Step 4: Define a prompt template for answering questions with context
    console.log("--- Defining a prompt template for answering questions... ---");
    const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
        ["system", "Answer the user's questions based on the below context: \n\n{context}"],
        ["user", "{input}"],
    ]);
    console.log(`History-aware retrieval prompt created: ${JSON.stringify(historyAwareRetrievalPrompt, null, 2)}`);

    // Step 5: Create the document combining chain
    let historyAwareCombineDocsChain;
    try {
        historyAwareCombineDocsChain = await createStuffDocumentsChain({
            llm: model,
            prompt: historyAwareRetrievalPrompt,
        });
        console.log("--- Document combining chain created successfully ---");
    } catch (error) {
        console.error(`Error creating document combining chain:`, error);
        throw error;
    }

    // Step 6: Create the main conversational retrieval chain
    console.log("--- Creating the main retrieval chain... ---");
    let conversationalRetrievalChain;
    try {
        conversationalRetrievalChain = await createRetrievalChain({
            retriever: retriever,
            combineDocsChain: historyAwareCombineDocsChain,
        });
        console.log("--- Conversational retrieval chain created successfully ---");
    } catch (error) {
        console.error(`Error creating conversational retrieval chain:`, error);
        throw error;
    }

    // Step 7: Run the chain with the provided question and context
    console.log("--- Running the chain with the question and context... ---");
    console.log(question, context);

    // Step 7: Run the chain with the provided question and context
    console.log("--- Running the chain with the question and context... ---");
    console.log(question, context);

    // Extract the pageContent from each document in the context
    const extractedContext = context.map(doc => doc.pageContent).join("\n");

    let reply;
    try {
        // Ensure inputs are structured properly
        const inputs = {
            input: question,  // Directly include `input`
            context: extractedContext,  // Directly include `context`
            chat_history: [], // Optional, you can provide chat history here if needed
        };

        // Pass the inputs correctly structured to the chain
        reply = await conversationalRetrievalChain.invoke(inputs);

        console.log("--- Chain execution completed successfully ---");
        console.log(`Reply: ${JSON.stringify(reply, null, 2)}`);
    } catch (error) {
        console.error(`Error running the conversational retrieval chain:`, error);
        throw error;
    }

    if (!reply || typeof reply.answer !== "string") {
        console.error("Invalid reply structure.");
        throw new Error("The reply does not contain a valid answer.");
    }

    console.log(`--- Final Answer: ${reply.answer} ---`);
    return {
        context: extractedContext,  // Include the extracted context in the response
        question: question,
        answer: reply.answer,
    };

};

export { model, generateLangchainCompletion };
