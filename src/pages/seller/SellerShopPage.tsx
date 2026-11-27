import { PageLoader } from '@/components/feedback/PageLoader';
import { ShopForm } from '@/features/seller/components/ShopForm';
import { sellerBackend } from '@/features/seller/seller.backend';
import { useSellerAction, useSellerShop } from '@/features/seller/seller.queries';
import { toast } from '@/stores/toastStore';

export default function SellerShopPage() {
  const { data: shop } = useSellerShop();
  const update = useSellerAction(sellerBackend.updateShop);

  if (!shop) return <PageLoader />;

  return (
    <section className="card mx-auto max-w-2xl p-5">
      <h2 className="mb-4 text-lg">Fiche de la boutique</h2>
      <p
        className={shop.verified ? 'mb-4 text-sm text-forest' : 'mb-4 rounded-md bg-ivory p-3 text-sm text-ink-soft'}
        role="status"
      >
        {shop.verified
          ? 'Boutique vérifiée par OKOZA.'
          : 'La boutique est en attente de vérification. Les produits sont vérifiés avant publication.'}
      </p>
      <ShopForm
        initial={{
          name: shop.name,
          description: shop.description,
          city: shop.city,
          district: shop.district,
          phone: shop.phone,
          acceptedPaymentMethods: shop.acceptedPaymentMethods,
        }}
        submitLabel="Enregistrer"
        onSubmit={async (fields) => {
          await update.mutateAsync(fields);
          toast.success('Boutique enregistrée');
        }}
      />
    </section>
  );
}
