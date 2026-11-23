import { alertDomain, isRecipient, recipientRoles } from './alertRecipients';

describe('destinataires des alertes', () => {
  it('oriente chaque alerte vers son domaine', () => {
    expect(alertDomain('out')).toBe('stock');
    expect(alertDomain('inconnue')).toBe('pilotage');
    expect(isRecipient({ role: 'super_admin' }, 'out')).toBe(true);
    expect(isRecipient({ role: 'super_admin' }, 'payments')).toBe(true);
    expect(isRecipient({ role: 'super_admin' }, 'payments')).toBe(true);
  });
  it('liste les rôles destinataires', () => {
    expect(recipientRoles('payments')).toEqual(['Administrateurs']);
  });
});
