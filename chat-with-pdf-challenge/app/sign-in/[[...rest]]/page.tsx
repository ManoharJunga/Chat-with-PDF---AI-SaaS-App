import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="p-6 bg-white shadow-md rounded-lg">
        <SignIn 
          path="/sign-in" 
          routing="path" 
          signUpUrl="/sign-up" 
          afterSignInUrl="/dashboard" // Redirect to dashboard after sign-in
        />
      </div>
    </div>
  );
}
