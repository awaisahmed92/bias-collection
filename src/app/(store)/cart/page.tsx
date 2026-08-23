import CartClient from "@/components/store/CartClient";

export const metadata = { title: "Shopping Bag" };

export default function CartPage() {
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 font-serif text-4xl font-medium">Shopping Bag</h1>
      <CartClient />
    </div>
  );
}
