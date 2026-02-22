import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="hero-grid flex min-h-screen items-center justify-center px-4">
      <div className="card-glass rounded-3xl p-4 sm:p-6">
        <SignUp />
      </div>
    </main>
  );
}
