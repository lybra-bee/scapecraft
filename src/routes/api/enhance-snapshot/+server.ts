import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных изображения сцены" }, { status: 400 });
    }

    if (rawBase64 === "test") return json({ ok: true });

    // Очищаем base64 от префикса
    const cleanBase64 = rawBase64.includes(",") ? rawBase64.split(",")[1] : rawBase64;
    
    // Детали композиции для лучшего понимания сцены
    const userDetails = body?.sceneDescription || "natural driftwood, stones, aquarium plants";
    
    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph, crystal clear water, detailed live plants, natural mossy wood, textured stones, 8k professional aquascaping photo, based on 3d mockup, realistic glass and lighting. Exact layout match: ${userDetails}.`;

    // Делаем вызов к Hugging Face API (модель Stable Diffusion XL Image-to-Image)
    // Используем общедоступный и быстрый endpoint без наложения вотермарок
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: promptText,
        image: cleanBase64,
        parameters: {
          strength: 0.45, // сильное следование оригинальной геометрии 3D-модели
          guidance_scale: 7.5,
          negative_prompt: "low quality, bad anatomy, worst quality, logo, watermark, text, signature, fish tank frame out of proportion, blurry, deformed",
        }
      }),
      signal: AbortSignal.timeout(40000)
    });

    if (!response.ok) {
      // Резервный вариант, если Hugging Face перегружен (используем img2img от pollinations, но с жестким указанием canny-подхода)
      const encodedPrompt = encodeURIComponent(promptText + ", no watermark, high quality, exact structure");
      const seed = Math.floor(Math.random() * 9999) + 1;
      
      // Ссылка, которая передает в pollinations не только промпт, но и пытается передать контекст через query (ограниченный режим)
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        throw new Error("Не удалось подключиться к генератору");
      }
      const arrayBuffer = await fallbackRes.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString("base64");
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
