import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { BotIcon, Loader2Icon, Star } from "lucide-react";
import Markdown from "react-markdown";
import { Message } from "./Chat";

function ChatMessage({ message }: { message: Message }) {
    const isHuman = message.role === "human";
    const { user } = useUser();
  
    return (
      <div className={`flex flex-col items-${isHuman ? "end" : "start"} mb-4`}>
        <div
          className={`flex items-center gap-2 ${isHuman ? "flex-row-reverse" : ""}`}
        >
          {/* Avatar */}
          <div className="avatar">
            <div className="w-10 h-10 rounded-full">
              {isHuman ? (
                user?.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt="Profile Picture"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 bg-gray-300 flex items-center justify-center rounded-full">
                    <Star className="text-yellow-500 h-5 w-5" />
                  </div>
                )
              ) : (
                <div className="h-10 w-10 bg-indigo-600 flex items-center justify-center rounded-full">
                  <BotIcon className="text-white h-6 w-6" />
                </div>
              )}
            </div>
          </div>
  
          {/* Message Box */}
          <div
            className={`max-w-sm px-3 py-2 rounded-lg shadow ${
              isHuman
                ? "bg-indigo-600 text-white self-end"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {message.message === "Thinking..." ? (
              <div className="flex items-center gap-2">
                <Loader2Icon className="animate-spin h-4 w-4" />
                <span>Thinking...</span>
              </div>
            ) : (
              <Markdown>{message.message}</Markdown>
            )}
          </div>
        </div>
      </div>
    );
  }
  

export default ChatMessage;
