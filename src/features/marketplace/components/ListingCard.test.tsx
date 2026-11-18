import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Listing } from '../marketplace.backend';
import { ListingCard } from './ListingCard';

const listing: Listing = {
  slug: 'velo-vtt',
  title: 'Vélo VTT',
  description: 'Bon vélo.',
  category: { id: 'c1', label: 'Sport' },
  kind: 'product',
  condition: 'good',
  price: 85_000,
  quantity: 1,
  city: 'Libreville',
  district: 'Nzeng-Ayong',
  photos: ['https://res.cloudinary.com/okoume/image/upload/v.webp'],
  shop: { slug: 'cycles-awa', name: 'Cycles Awa', verified: true },
  sold: false,
  publishedAt: null,
  distanceKm: 3,
  sponsored: true,
};

describe('carte d’annonce', () => {
  it('montre prix, état, distance arrondie, boutique vérifiée et mise en avant', () => {
    renderWithProviders(<ListingCard listing={listing} />);
    expect(screen.getByRole('link', { name: 'Vélo VTT' })).toHaveAttribute('href', '/annonces/velo-vtt');
    expect(screen.getByText(/85\s000/)).toBeInTheDocument();
    expect(screen.getByText('Bon état, Sport')).toBeInTheDocument();
    expect(screen.getByText(/À environ 3 km, Nzeng-Ayong, Libreville/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Boutique vérifiée' })).toBeInTheDocument();
    expect(screen.getByText('Sponsorisé')).toBeInTheDocument();
  });

  it('signale une annonce vendue', () => {
    renderWithProviders(<ListingCard listing={{ ...listing, sold: true, sponsored: false, distanceKm: null }} />);
    expect(screen.getByText('Vendu')).toBeInTheDocument();
    expect(screen.queryByText('Sponsorisé')).not.toBeInTheDocument();
  });
});
