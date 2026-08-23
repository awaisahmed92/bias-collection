import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <div className="container-x grid place-items-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-serif text-3xl font-medium">Join Bias</h1>
        <p className="mb-6 mt-1 text-sm text-ink/50">Faster checkout, order tracking and early access.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
