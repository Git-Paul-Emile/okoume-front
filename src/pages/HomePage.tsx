import { DealOfTheDay } from '@/features/home/components/DealOfTheDay';
import { ExclusiveOfferCard } from '@/features/home/components/ExclusiveOfferCard';
import { AdBanner } from '@/features/home/components/AdBanner';
import { PromotionsSection } from '@/features/home/components/PromotionsSection';
import { TopRatedSection } from '@/features/home/components/TopRatedSection';

export function HomePage() {
  return (
    <div className="container-page space-y-10 py-6 lg:space-y-14 lg:py-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <ExclusiveOfferCard />
        <DealOfTheDay />
      </div>

      <AdBanner placement="home-promo" />
      <TopRatedSection />
      <PromotionsSection />
    </div>
  );
}
