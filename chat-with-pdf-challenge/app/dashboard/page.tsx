import { auth } from "@clerk/nextjs/server"; // Ensure you're using the correct Clerk utility
import { redirect } from "next/navigation";
import Documents from "@/components/Documents";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { userId} = await auth(); // Fetch the userId of the logged-in user

  if (!userId) {
    redirect("/sign-in"); // Redirect to the sign-in page if not authenticated
  }

  return (
    <div className="h-full max-w-7xl mx-auto">
      <h1 className="text-3xl p-5 bg-gray-100 font-extralight text-indigo-600">
        My Documents
      </h1>
      <Documents />
    </div>
  );
}
