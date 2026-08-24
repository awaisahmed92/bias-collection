import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="container-x grid place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="font-serif text-3xl font-medium">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-ink/50">Login to your Bias Collection account.</p>
          <LoginForm />
        </div>
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 border border-dashed border-line bg-white/60 p-4 text-xs leading-relaxed text-ink/60">
            <p className="mb-1 font-bold uppercase tracking-[0.14em] text-ink/40">Demo accounts (dev only)</p>
            <p>Admin: <b>admin@biascollection.pk</b> / Admin@12345</p>
            <p>Super Admin: <b>superadmin@biascollection.pk</b> / Admin@12345</p>
            <p>Customer: <b>customer@example.com</b> / Customer@123</p>
          </div>
        )}
      </div>
    </div>
  );
}
