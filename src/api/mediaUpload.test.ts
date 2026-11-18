import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PHOTO_BYTES, photoError, uploadPhoto } from './mediaUpload';

const signed = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/okoume/image/upload',
  fields: { api_key: 'cle', timestamp: '1700000000', signature: 'sig', asset_folder: 'okoume/test/returns' },
  expiresAt: '2026-11-11T10:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('envoi de photos chez l’hébergeur', () => {
  it('refuse un format ou un poids non accepté avant tout envoi', () => {
    expect(photoError(new File(['x'], 'doc.pdf', { type: 'application/pdf' }))).toContain('JPEG');
    const heavy = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'lourde.jpg', { type: 'image/jpeg' });
    expect(photoError(heavy)).toContain('8 Mo');
    expect(photoError(new File(['x'], 'ok.webp', { type: 'image/webp' }))).toBeNull();
  });

  it('joint les champs signés au fichier et renvoie l’adresse publique', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/okoume/image/upload/r.webp' })),
    );
    const url = await uploadPhoto(signed, new File(['x'], 'r.webp', { type: 'image/webp' }));
    expect(url).toBe('https://res.cloudinary.com/okoume/image/upload/r.webp');
    const [target, init] = fetchMock.mock.calls[0]!;
    expect(target).toBe(signed.uploadUrl);
    const form = init.body as FormData;
    expect(form.get('signature')).toBe('sig');
    expect(form.get('asset_folder')).toBe('okoume/test/returns');
    expect(form.get('file')).toBeInstanceOf(File);
  });

  it('signale un refus de l’hébergeur', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 400 }));
    await expect(uploadPhoto(signed, new File(['x'], 'r.png', { type: 'image/png' }))).rejects.toMatchObject({
      status: 400,
    });
  });
});
