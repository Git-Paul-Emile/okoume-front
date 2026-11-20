import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CategoryCircles } from '@/features/categories/components/CategoryCircles';
import { CategorySidebar } from '@/features/categories/components/CategorySidebar';
import { DealOfTheDay } from '@/features/home/components/DealOfTheDay';
import { HelpBand } from '@/features/home/components/HelpBand';
import { HeroSlider } from '@/features/home/components/HeroSlider';
import { ProductTabsSection } from '@/features/home/components/ProductTabsSection';
import { ExclusiveOfferCard } from '@/features/home/components/ExclusiveOfferCard';
import { AdBanner } from '@/features/home/components/AdBanner';
import { PromoBanners } from '@/features/home/components/PromoBanners';
import { PromotionsSection } from '@/features/home/components/PromotionsSection';
import { TopRatedSection } from '@/features/home/components/TopRatedSection';
import { TraditionalWearSection } from '@/features/home/components/TraditionalWearSection';
import { RecentlyViewed } from '@/features/products/components/RecentlyViewed';

export function HomePage() {
  return (
    <div className="container-page space-y-10 py-6 lg:space-y-14 lg:py-8">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CategorySidebar />
        <HeroSlider />
      </div>

      <section className="rounded-lg border border-sage bg-white p-4">
        <SectionHeading title="Acheter par catégorie" />
        <CategoryCircles />
      </section>

      {/* La colonne de gauche s'étire sur toute la hauteur de « Articles du moment » */}
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden flex-col gap-4 lg:flex">
          <ExclusiveOfferCard className="flex-[1.15]" />
          <DealOfTheDay className="flex-1" />
        </aside>
        <ProductTabsSection />
      </div>

      <div className="lg:hidden">
        <DealOfTheDay />
      </div>

      <Reveal>
        <PromoBanners>
          <AdBanner placement="home-promo" className="lg:mb-3" />
        </PromoBanners>
      </Reveal>

      <TraditionalWearSection />

      <TopRatedSection />

      <PromotionsSection />

      <RecentlyViewed />

      <HelpBand />
    </div>
  );
}
