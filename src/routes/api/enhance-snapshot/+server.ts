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

    if (rawBase64 === "test") return json({ ok: true });

    // Очищаем base64
    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const userDetails = body?.sceneDescription || "natural driftwood, stones, aquarium plants";

    // Промпт для ИИ-редактирования изображения на основе 3D-сцены
    const promptText = `Преврати это 3D-изображение аквариума в высокодетализированную, реалистичную фотографию природного акваскейпа в стиле Такаши Амано.
    - Полностью сохрани исходную композицию, расположение и формы всех объектов: коряги в центре, камня Сейрю справа, красных растений слева и зеленых справа.
    - Сделай воду абсолютно прозрачной, наполненной миллиардами микропузырьков CO2.
    - Добавь естественные, живые текстуры: мокрую кору и мох на ветках, пористую и слоистую структуру камня Сейрю с белыми прожилками, сочные, детальные листья водных растений Rotala.
    - Добавь стайку неоновых тетр, плывущих в воде.
    - Установи яркое, профессиональное аквариумное LED-освещение с естественными бликами, тенями и каустикой на грунте.
    - Все детали должны выглядеть как настоящая съёмка на макрообъектив в 8K.
    Исключи любые водяные знаки, текст, логотипы, рамки или искажения объектов.`;

    // Запрос к мультимодальной Gemini API с генерацией изображения (Image-to-Image)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: rawBase64
                }
              },
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          candidateCount: 1
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Резервная попытка на случай, если gemini-2.5-flash-image не включена в тарифе, используем gemini-3.1-flash-image
      console.warn("Попытка 1 не удалась, пробуем gemini-3.1-flash-image...");
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;
      const resFallback = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: rawBase64 } },
                { text: promptText }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
            candidateCount: 1
          }
        })
      });

      if (!resFallback.ok) {
        const errFallback = await resFallback.json().catch(() => ({}));
        return json({ error: errFallback.error?.message || "Ошибка генерации Gemini" }, { status: resFallback.status });
      }
      
      const dataFallback = await resFallback.json();
      const b64Fallback = dataFallback.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64Fallback) {
        return json({ error: "Изображение не получено в ответе API" }, { status: 500 });
      }
      return json({ image: `data:image/jpeg;base64,${b64Fallback}` });
    }

    const data = await res.json();
    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      return json({ error: "Изображение не получено в ответе API" }, { status: 500 });
    }

    return json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err: any) {
    console.error("Enhance snapshot error:", err);
    return json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
};
