import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const hfToken = process.env.HF_ACCESS_TOKEN || process.env.HF_TOKEN;
    if (!hfToken) {
      return json({ error: "Переменная HF_ACCESS_TOKEN не задана на Vercel" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных изображения сцены" }, { status: 400 });
    }

    if (rawBase64 === "test") return json({ ok: true });

    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    // Превращаем base64 в бинарный Buffer (так Hugging Face принимает картинки без обрыва соединения)
    const imageBuffer = Buffer.from(rawBase64, "base64");

    const promptText = "hyper-realistic Takashi Amano nature aquarium studio photograph, crystal clear water, natural textures on driftwood, moss, textured seiryu stone, fresh live plants, rimless tank, 8k professional aquascaping photo";

    // 1. Отправляем в стабильный serverless img2img (Pix2Pix / SD-Inference)
    // Hugging Face принимает бинарные данные картинки прямо в теле запроса
    const apiUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix";

    let response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/octet-stream",
        "x-wait-for-model": "true"
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(60000)
    });

    // Если модель pix2pix требует параметров или не ответила, используем проверенный router stability
    if (!response.ok) {
      const altUrl = "https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5";
      response = await fetch(altUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/octet-stream",
          "x-wait-for-model": "true"
        },
        body: imageBuffer,
        signal: AbortSignal.timeout(60000)
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("HF Error response:", response.status, errText);
      return json({ error: `Hugging Face ответил ошибкой (${response.status}): ${errText.slice(0, 150)}` }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString("base64");

    return json({ image: `data:image/jpeg;base64,${resultBase64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка соединения с сервисом" }, { status: 500 });
  }
};
