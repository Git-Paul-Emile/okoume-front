/** Lien de discussion vers un numéro WhatsApp donné. */
export function whatsappLink(number: string, text?: string) {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Lien de partage WhatsApp sans destinataire imposé. */
export function whatsappShareLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
