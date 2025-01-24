import Chat from "@/components/Chat";
import PdfView from "@/components/PdfView";
import { adminDb } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";

async function ChatToFilePage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  // Await params if necessary
  const { id } = await params;

  // Authenticate the user
  const { userId } = await auth();

  // Fetch file data from Firestore
  const ref = await adminDb
    .collection("users")
    .doc(userId!)
    .collection("files")
    .doc(id)
    .get();

  const url = ref.data()?.downloadUrl;

  return (
    <div className="grid lg:grid-cols-5 h-full overflow-hidden">
      {/* PDF Viewer on the Left */}
      <div className="col-span-5 lg:col-span-3 bg-gray-100 border-r-2 lg:border-indigo-600 lg:order-1 overflow-auto">
        <PdfView url={url} />
      </div>

      {/* Chat on the Right */}
      <div className="col-span-5 lg:col-span-2 overflow-y-auto lg:order-2">
        <Chat id={id} />
      </div>
    </div>
  );
}

export default ChatToFilePage;
