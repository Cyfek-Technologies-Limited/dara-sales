import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-[#07121f] bg-cover bg-center px-12 py-12"
      style={{ backgroundImage: "url('/dara-auth-waves.png')" }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[#06101c]/45" />
      <div className="relative z-10">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  );
}
