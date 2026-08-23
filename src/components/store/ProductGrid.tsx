import ProductCard from "./ProductCard";

export default function ProductGrid({ products, cols = 4 }: { products: any[]; cols?: 2 | 3 | 4 }) {
  if (!products?.length) return null;
  const colCls = cols === 4 ? "lg:grid-cols-4" : cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 ${colCls}`}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
