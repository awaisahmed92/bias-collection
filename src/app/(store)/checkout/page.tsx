import CheckoutClient from "@/components/store/CheckoutClient";

export const metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 font-serif text-4xl font-medium">Checkout</h1>
      <CheckoutClient />
    </div>
  );
}
