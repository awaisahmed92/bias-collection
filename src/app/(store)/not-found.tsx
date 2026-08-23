import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x grid place-items-center py-32 text-center">
      <p className="font-serif text-8xl text-ink/20">404</p>
      <h1 className="mt-4 font-serif text-3xl">This piece isn't on our rack</h1>
      <p className="mt-2 text-sm text-ink/50">The page you're looking for doesn't exist or was moved.</p>
      <Link href="/" className="btn-primary mt-8">Back to Home</Link>
    </div>
  );
}
