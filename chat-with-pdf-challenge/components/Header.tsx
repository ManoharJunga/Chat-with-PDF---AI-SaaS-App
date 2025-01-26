import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "./ui/button";
import { FilePlus2 } from "lucide-react";

function Header() {
  return (
    <header className="flex justify-between items-center bg-white shadow-md px-6 py-4 border-b">
      {/* Logo or Title */}
      <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
        FileFox
      </Link>

      {/* User actions when signed in */}
      <SignedIn>
        <nav className="flex items-center space-x-4">
          {/* Pricing Button */}
          <Button asChild variant="link" className="hidden md:inline-flex">
            <Link href="/dashboard/upgrade">Pricing</Link>
          </Button>

          {/* My Documents Button */}
          <Button asChild variant="outline">
            <Link href="/dashboard">My Documents</Link>
          </Button>

          {/* Upload Button */}
          <Button asChild variant="outline" className="border-indigo-600">
            <Link href="/dashboard/upload">
              <FilePlus2 className="text-indigo-600 mr-1" /> Upload
            </Link>
          </Button>

          {/* User Profile Button */}
          <UserButton />
        </nav>
      </SignedIn>
    </header>
  );
}

export default Header;
