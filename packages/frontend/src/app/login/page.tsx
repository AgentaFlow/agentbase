import { Suspense } from "react";
import LoginContent from "./LoginContent";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
