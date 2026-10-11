import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const apiKey = env.GEMINI_API_KEY || env.GEMINI_AI_KEY || env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY не задан в Environment Variables Vercel' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || '';

    if (!rawBase64) {
      return json({ error: 'Изображение не передано' }, { status: 400 });
    }

    // Тестовый пинг
    if (rawBase64 === 'test') {
      return json({ ok: true, message: 'API эндпоинт готов' });
    }

    // Очищаем base64 от префикса data:image/...;base64,
    if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }

    const promptText = 'Professional 4K magazine studio photograph of a luxury ADA nature aquarium aquascape tank, ultra-clear low-iron glass with polished emerald chamfer edges, illuminated ADA light screen gradient background, lush green underwater plants, natural driftwood, Seiryu stones on dark aqua soil, crisp water surface ripples, warm modern living room lighting, architectural photography';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        instances: [{ prompt: promptText }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg'
        }
      })
    });

    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok) {
      console.error('Ошибка Imagen API:', data);
      return json({ error: data.error?.message || 'Ошибка Imagen API' }, { status: res.status });
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      return json({ error: 'Картинка не найдена в ответе модели' }, { status: 500 });
    }

    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err: any) {
    console.error('Ошибка в enhance-snapshot:', err);
    return json({ error: err.message || 'Ошибка сервера' }, { status: 500 });
  }
};
 
