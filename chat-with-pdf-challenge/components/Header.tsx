import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "./ui/button";
import { FilePlus2 } from "lucide-react";

function Header() {
  return (
    <div className="flex justify-between bg-white shadow-sm p-5 border-b">
      {/* Logo or Title */}
      <Link href="/dashboard" className="text-2xl font-semibold">
        Chat to <span className="text-indigo-600">PDF</span>
      </Link>
        
      {/* User actions when signed in */}
      <SignedIn>
        <div className="flex items-center space-x-2">
          {/* Pricing Button */}
          <Button asChild variant="link" className="hidden md:flex">
            <Link href="/dashboard/upgrade">Pricing</Link>
          </Button>

          {/* My Documents Button */}
          <Button asChild variant="outline">
            <Link href="/dashboard">My Documents</Link>
          </Button>

          <Button asChild variant="outline" className="border-indigo-600">
            <Link href="/dashboard/upload">
                <FilePlus2 className="text-indigo-600" />
            </Link>
          </Button>

          {/* User Profile Button */}
          <UserButton />
        </div>
      </SignedIn>
    </div>
  );
}

export default Header;
