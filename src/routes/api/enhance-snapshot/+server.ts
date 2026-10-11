import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_AI_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return json({ error: "Ключ GEMINI_API_KEY не настроен в переменных окружения Vercel" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || "";
    if (!rawBase64) {
      return json({ error: "Нет данных изображения" }, { status: 400 });
    }

    if (rawBase64 === "test") {
      return json({ ok: true });
    }

    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const userDetails = body?.sceneDescription || "Seiryu stones, driftwood, aquatic plants, clear water";
    const promptText = `A hyper-realistic, award-winning Takashi Amano style nature aquarium photograph. Crystal-clear optical low-iron glass tank filled with pure water. True-to-life wet textures, natural wood grain on spider wood, textured porous Seiryu stones with white mineral veins, vibrant delicate leaves of Rotala H\x27Ra and Rotala Green, schools of vivid neon tetra fish swimming, subtle water caustics, soft depth of field, 8k professional studio aquarium photography. Scene details: ${userDetails}.`;

    // 1. Попытка через официальный imagen-3.0-generate-001
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;

    let res = await fetch(imagenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        instances: [{ prompt: promptText }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputMimeType: "image/jpeg"
        }
      })
    });

    // 2. Если imagen-3.0-generate-001 недоступен по данному ключу, пробуем базовый imagen-3.0
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.warn("imagen-3.0-generate-001 failed, trying fallback:", errJson?.error?.message);

      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3:predict?key=${apiKey}`;
      res = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          instances: [{ prompt: promptText }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            outputMimeType: "image/jpeg"
          }
        })
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || "Ошибка генерации нейросетью";
      return json({ error: msg }, { status: res.status });
    }

    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      return json({ error: "Изображение не получено в ответе API" }, { status: 500 });
    }

    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err: any) {
    console.error("Enhance snapshot error:", err);
    return json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
};
