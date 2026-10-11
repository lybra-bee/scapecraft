import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_AI_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return json({ error: 'Ключ GEMINI_API_KEY не настроен' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || '';
    if (!rawBase64) {
      return json({ error: 'Нет данных изображения' }, { status: 400 });
    }

    if (rawBase64 === 'test') {
      return json({ ok: true });
    }

    if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }

    const promptText = 'Professional 4K magazine studio photograph of a luxury ADA nature aquarium aquascape tank, ultra-clear low-iron glass, Seiryu stones, driftwood, lush aquatic plants, crystal clear water, rimless tank, studio lighting';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        instances: [{ prompt: promptText }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg'
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return json({ error: err.error?.message || 'Ошибка генерации' }, { status: res.status });
    }

    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      return json({ error: 'Изображение не получено' }, { status: 500 });
    }

    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err: any) {
    return json({ error: err.message || 'Ошибка сервера' }, { status: 500 });
  }
};
