import { alertDomain, isRecipient, recipientRoles } from './alertRecipients';

describe('destinataires des alertes', () => {
  it('oriente chaque alerte vers son domaine', () => {
    expect(alertDomain('out')).toBe('stock');
    expect(alertDomain('inconnue')).toBe('pilotage');
    expect(isRecipient({ role: 'stock_manager' }, 'out')).toBe(true);
    expect(isRecipient({ role: 'stock_manager' }, 'payments')).toBe(false);
    expect(isRecipient({ role: 'super_admin' }, 'payments')).toBe(true);
    expect(isRecipient({ role: 'stock_manager', customPermissions: ['paiements:consulter'] }, 'payments')).toBe(true);
  });
  it('liste les rôles destinataires', () => {
    expect(recipientRoles('payments')).toEqual(['Administrateur principal', 'Gestionnaire commandes']);
  });
});
