"use server";

import { Message } from "@/components/Chat";
import { adminDb } from "@/firebaseAdmin";
import { generateLangchainCompletion } from "@/lib/langchain";
import { auth } from "@clerk/nextjs/server";

const FREE_LIMIT = 100;
const PRO_LIMIT = 100;

export async function askQuestion(id: string, question: string) {
    try {
        // Authenticate the user
        const { userId } = await auth();
        if (!userId) {
            return { success: false, message: "User not authenticated" };
        }

        // Reference the chat collection in Firestore
        const chatRef = adminDb
            .collection("chats")
            .doc(userId)
            .collection("files")
            .doc(id)
            .collection("chat");

        // Fetch user messages to check the rate limit
        const chatSnapshot = await chatRef.get();
        const userMessages = chatSnapshot.docs.filter(
            (doc) => doc.data().role === "human"
        );

        // Check rate limits
        if (userMessages.length >= FREE_LIMIT) {
            return { success: false, message: "You have reached your free limit" };
        }

        // Add the user's question to Firestore
        const userMessage: Message = {
            role: "human",
            message: question,
            createdAt: new Date(),
        };
        await chatRef.add(userMessage);

        // Generate a reply from Langchain
        const reply = await generateLangchainCompletion(id, question);

        // Add the AI's reply to Firestore
        const aiMessage: Message = {
            role: "ai",
            message: reply,
            createdAt: new Date(),
        };
        await chatRef.add(aiMessage);

        return { success: true, message: null };
    } catch (error) {
        console.error("Error in askQuestion:", error);
        return { success: false, message: "An error occurred while processing the request" };
    }
}
