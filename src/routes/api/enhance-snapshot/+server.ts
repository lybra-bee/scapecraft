import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY не задан в переменных окружения' }, { status: 500 });
    }

    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return json({ error: 'Изображение не передано' }, { status: 400 });
    }

    const promptText = 'Professional 4K magazine photograph of a luxury ADA nature aquarium aquascape tank, ultra-clear low-iron glass with polished emerald green chamfer edges, illuminated ADA light screen gradient background, lush underwater plants, natural driftwood and textured Seiryu stones on dark aqua soil, crisp water surface ripples, warm modern living room lighting, architectural photography';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: promptText }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg'
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Ошибка Imagen API:', data);
      return json({ error: data.error?.message || 'Ошибка генерации Imagen' }, { status: res.status });
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      return json({ error: 'Изображение не найдено в ответе' }, { status: 500 });
    }

    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err: any) {
    console.error('Ошибка в enhance-snapshot:', err);
    return json({ error: err.message || 'Ошибка сервера' }, { status: 500 });
  }
};
