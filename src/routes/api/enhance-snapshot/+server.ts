import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const hfToken = process.env.HF_ACCESS_TOKEN || process.env.HF_TOKEN;
    if (!hfToken) {
      return json({ error: "Переменная HF_ACCESS_TOKEN не настроена на Vercel" }, { status: 500 });
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

    const userDetails = body?.sceneDescription || "aquascape with spider wood and stones";

    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph. Crystal clear optical water filled with tiny CO2 microbubbles, ultra-realistic wet organic textures on the driftwood, porous rough Seiryu stone, fresh vibrant Rotala aquatic plants, vivid neon tetra fish swimming. Exact match to the 3d layout: ${userDetails}. 8k professional studio lighting, low-iron rimless glass tank, sharp focus, no watermarks, no logos, no text.`;

    const negativePrompt = "blurry, distorted, bad proportions, watermark, logo, text, cartoon, low quality, artifacts, extra tank borders, shifted composition";

    // Прямой Image-to-Image запрос через роутер Hugging Face с вашим токеном
    const response = await fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-refiner-1.0", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        inputs: rawBase64,
        parameters: {
          prompt: promptText,
          negative_prompt: negativePrompt,
          strength: 0.5,
          guidance_scale: 7.5
        }
      })
    });

    if (!response.ok) {
      // Резервная модель на случай недоступности первой
      const altResponse = await fetch("https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          inputs: rawBase64,
          parameters: {
            prompt: "Make it an award-winning Takashi Amano nature aquarium studio photograph, real water, real plants, real stones",
            image_guidance_scale: 1.6
          }
        })
      });

      if (!altResponse.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Ошибка HuggingFace: HTTP ${response.status} ${errText}`);
      }

      const buf = await altResponse.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return json({ image: `data:image/jpeg;base64,${b64}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации фотореализма" }, { status: 500 });
  }
};
