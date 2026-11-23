import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { RouteError } from '@/components/feedback/RouteError';
import { MainLayout } from '@/components/layout/MainLayout';
import { RequireAdmin } from '@/features/admin/components/RequireAdmin';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { HomePage } from '@/pages/HomePage';

const CatalogPage = lazy(() => import('@/pages/CatalogPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'));
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const PromotionsPage = lazy(() => import('@/pages/PromotionsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const InvoicePage = lazy(() => import('@/pages/InvoicePage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ShopsPage = lazy(() => import('@/pages/ShopsPage'));
const BecomeSellerPage = lazy(() => import('@/pages/BecomeSellerPage'));
const SellerLayout = lazy(() => import('@/pages/seller/SellerLayout'));
const SellerDashboardPage = lazy(() => import('@/pages/seller/SellerDashboardPage'));
const SellerShopPage = lazy(() => import('@/pages/seller/SellerShopPage'));
const SellerProductsPage = lazy(() => import('@/pages/seller/SellerProductsPage'));
const SellerOrdersPage = lazy(() => import('@/pages/seller/SellerOrdersPage'));
const SellerOrderPage = lazy(() => import('@/pages/seller/SellerOrderPage'));
const SellerDeliveryPage = lazy(() => import('@/pages/seller/SellerDeliveryPage'));
const SellerProductEditPage = lazy(() => import('@/pages/seller/SellerProductEditPage'));
const AccountLayout = lazy(() => import('@/pages/account/AccountLayout'));
const AccountOverviewPage = lazy(() => import('@/pages/account/AccountOverviewPage'));
const AccountOrdersPage = lazy(() => import('@/pages/account/AccountOrdersPage'));
const AccountOrderDetailPage = lazy(() => import('@/pages/account/AccountOrderDetailPage'));
const AccountProfilePage = lazy(() => import('@/pages/account/AccountProfilePage'));
const AccountAddressesPage = lazy(() => import('@/pages/account/AccountAddressesPage'));
const AccountFavoritesPage = lazy(() => import('@/pages/account/AccountFavoritesPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminForgotPasswordPage = lazy(() => import('@/pages/admin/AdminForgotPasswordPage'));
const AdminInvitePage = lazy(() => import('@/pages/admin/AdminInvitePage'));
const AdminSecurityPage = lazy(() => import('@/pages/admin/AdminSecurityPage'));
const AdminEmailsPage = lazy(() => import('@/pages/admin/AdminEmailsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminPaymentsPage = lazy(() => import('@/pages/admin/AdminPaymentsPage'));
const AdminPayoutsPage = lazy(() => import('@/pages/admin/AdminPayoutsPage'));
const AdminReturnsPage = lazy(() => import('@/pages/admin/AdminReturnsPage'));
const AdminDeliveriesPage = lazy(() => import('@/pages/admin/AdminDeliveriesPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminStockPage = lazy(() => import('@/pages/admin/AdminStockPage'));
const AdminPromotionsPage = lazy(() => import('@/pages/admin/AdminPromotionsPage'));
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'));
const AdminTeamPage = lazy(() => import('@/pages/admin/AdminTeamPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminStatsPage = lazy(() => import('@/pages/admin/AdminStatsPage'));
const AdminCouriersPage = lazy(() => import('@/pages/admin/AdminCouriersPage'));
const AdminJournalPage = lazy(() => import('@/pages/admin/AdminJournalPage'));
const AdminEditorialPage = lazy(() => import('@/pages/admin/AdminEditorialPage'));
const AdminAssistantPage = lazy(() => import('@/pages/admin/AdminAssistantPage'));
const AdminAlertsPage = lazy(() => import('@/pages/admin/AdminAlertsPage'));
const AdminMarketplacePage = lazy(() => import('@/pages/admin/AdminMarketplacePage'));

/** Routes de l'application, partagées par le routeur du navigateur et les tests de parcours. */
export const routes: RouteObject[] = [
  // Facture imprimable : page autonome, sans l'en-tête ni le pied de page de la boutique
  {
    path: 'facture/:number',
    errorElement: <RouteError />,
    element: (
      <RequireAuth>
        <Suspense fallback={<PageLoader />}>
          <InvoicePage />
        </Suspense>
      </RequireAuth>
    ),
  },
  // Back-office : mise en page distincte de la boutique
  {
    path: 'admin/invitation/:token',
    errorElement: <RouteError />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminInvitePage />
      </Suspense>
    ),
  },
  {
    path: 'admin/connexion',
    errorElement: <RouteError />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: 'admin/mot-de-passe-oublie',
    errorElement: <RouteError />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: 'admin',
    errorElement: <RouteError />,
    element: (
      <RequireAdmin>
        <Suspense fallback={<PageLoader />}>
          <AdminLayout />
        </Suspense>
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'commandes', element: <AdminOrdersPage /> },
      { path: 'place-de-marche', element: <AdminMarketplacePage /> },
      { path: 'paiements', element: <AdminPaymentsPage /> },
      { path: 'reversements', element: <AdminPayoutsPage /> },
      { path: 'retours', element: <AdminReturnsPage /> },
      { path: 'livraisons', element: <AdminDeliveriesPage /> },
      { path: 'produits', element: <AdminProductsPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'stock', element: <AdminStockPage /> },
      { path: 'promotions', element: <AdminPromotionsPage /> },
      { path: 'clients', element: <AdminCustomersPage /> },
      { path: 'avis', element: <AdminReviewsPage /> },
      { path: 'contenus', element: <AdminContentPage /> },
      { path: 'equipe', element: <AdminTeamPage /> },
      { path: 'parametres', element: <AdminSettingsPage /> },
      { path: 'statistiques', element: <AdminStatsPage /> },
      { path: 'livreurs', element: <AdminCouriersPage /> },
      { path: 'journal', element: <AdminJournalPage /> },
      { path: 'editorial', element: <AdminEditorialPage /> },
      { path: 'assistant', element: <AdminAssistantPage /> },
      { path: 'alertes', element: <AdminAlertsPage /> },
      { path: 'securite', element: <AdminSecurityPage /> },
      { path: 'emails', element: <AdminEmailsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalogue', element: <CatalogPage /> },
      { path: 'produit/:slug', element: <ProductPage /> },
      { path: 'boutiques/:slug', element: <ShopPage /> },
      { path: 'boutiques', element: <ShopsPage /> },
      { path: 'devenir-vendeur', element: <BecomeSellerPage /> },
      {
        path: 'vendeur',
        element: (
          <RequireAuth>
            <SellerLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <SellerDashboardPage /> },
          { path: 'boutique', element: <SellerShopPage /> },
          { path: 'produits', element: <SellerProductsPage /> },
          { path: 'produits/:id', element: <SellerProductEditPage /> },
          { path: 'commandes', element: <SellerOrdersPage /> },
          { path: 'commandes/:id', element: <SellerOrderPage /> },
          { path: 'livraison', element: <SellerDeliveryPage /> },
        ],
      },
      { path: 'panier', element: <CartPage /> },
      { path: 'commande', element: <CheckoutPage /> },
      { path: 'commande/confirmation/:number', element: <OrderConfirmationPage /> },
      { path: 'suivi', element: <TrackOrderPage /> },
      { path: 'connexion', element: <LoginPage /> },
      { path: 'inscription', element: <RegisterPage /> },
      { path: 'mot-de-passe-oublie', element: <ForgotPasswordPage /> },
      { path: 'promotions', element: <PromotionsPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'legal/:page', element: <LegalPage /> },
      {
        path: 'compte',
        element: (
          <RequireAuth>
            <AccountLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AccountOverviewPage /> },
          { path: 'commandes', element: <AccountOrdersPage /> },
          { path: 'commandes/:number', element: <AccountOrderDetailPage /> },
          { path: 'profil', element: <AccountProfilePage /> },
          { path: 'adresses', element: <AccountAddressesPage /> },
          { path: 'favoris', element: <AccountFavoritesPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
