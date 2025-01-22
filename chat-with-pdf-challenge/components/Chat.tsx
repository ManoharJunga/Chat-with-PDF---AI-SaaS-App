'use client';

import { FormEvent, useEffect, useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useUser } from "@clerk/nextjs";
import { Loader2Icon } from "lucide-react";
import { collection, orderBy, query } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore"; 
import { db } from "@/firebase"; // Ensure this is the correct Firebase initialization import
import { askQuestion } from "@/actions/askQuestion";


export type Message = {
  id?: string;
  role: "human" | "ai" | "placeholder";
  message: string;
  createdAt: Date;
};

function Chat({ id }: { id: string }) {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();

  const [snapshot, loading, error] = useCollection(
    user &&
      query(
        collection(db, "users", user?.id, "files", id, "chat"),
        orderBy("createdAt", "asc")
      )
  );
  useEffect(() => {
    if(!snapshot) return;

    console.log("Updated snapshot", snapshot.docs);

    const lastMessage = messages.pop();
    if(lastMessage?.role === "ai" && lastMessage.message === "Thinking..."){
        return;
    }

    const newMessages = snapshot.docs.map(doc => {
        const {role, message, createdAt} = doc.data();

        return {
            id: doc.id,
            role,
            message,
            createdAt: createdAt.toDate(),
        };
        setMessages(newMessages);
    });

  }, [snapshot]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input;

    setInput("");

    setMessages((prev) => [
        ...prev,
        {
            role:"human",
            message: q,
            createdAt: new Date(),
        },
        {
            role:"ai",
            message: "Thinking...",
            createdAt: new Date(),
        }
    ]);

    startTransition(async () => {
        const { sucess, message } = await askQuestion(id, q);
        if(!sucess){
                setMessages((prev) => 
                    prev.slice(0, prev.length - 1).concat([
                        {
                            role:"ai",
                            message: `Woops...${message}`,
                            createdAt: new Date(),
                        }
                    ])
                )
        }
    })
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Section */}
      <div className="flex-1 w-full overflow-y-auto p-4">
        
        {messages.map((message) =>(
            <div key={message.id}>
                <p>{message.message}</p>
            </div>  
        ))}
      </div>

      {/* Input Form Section */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 p-4 bg-indigo-600/75 sticky bottom-0"
      >
        <Input
          className="flex-1"
          placeholder="Ask a Question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" disabled={!input || isPending}>
          {isPending ? (
            <Loader2Icon className="animate-spin text-indigo-600" />
          ): (
            "Ask"
          )}
        </Button>
      </form>
    </div>
  );
}

export default Chat;
