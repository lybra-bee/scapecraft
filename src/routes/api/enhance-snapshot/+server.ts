import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY не задан в переменных окружения' }, { status: 500 });
    }

    const { imageBase64 } = await request.json().catch(() => ({}));
    if (!imageBase64) {
      return json({ error: 'Изображение не передано' }, { status: 400 });
    }

    // Если тестовый запрос из терминала
    if (imageBase64 === 'test') {
      return json({ ok: true, message: 'API эндпоинт активен и готов к генерации' });
    }

    const promptText = 'Professional 4K magazine studio photograph of a luxury ADA nature aquarium aquascape tank, ultra-clear low-iron glass, lush green aquatic plants, natural driftwood and Seiryu stones, crystal clear water with delicate surface ripples, cinematic studio lighting';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
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
      console.error('Ошибка Google Imagen:', data);
      return json({ error: data.error?.message || 'Ошибка Imagen API' }, { status: res.status });
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      return json({ error: 'Картинка не найдена в ответе API' }, { status: 500 });
    }

    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err: any) {
    console.error('Ошибка в enhance-snapshot:', err);
    return json({ error: err.message || 'Ошибка выполнения' }, { status: 500 });
  }
};
