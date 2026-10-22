import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-black text-brand-500">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <Link href="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </div>
  );
}
