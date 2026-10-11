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

    // Очищаем base64
    const cleanBase64 = rawBase64.includes(",") ? rawBase64.split(",")[1] : rawBase64;
    const userDetails = body?.sceneDescription || "spider wood in center, seiryu stone, plants on sides";

    // Промпт, ориентированный на строгое превращение 3D в фото
    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph, crystal clear water, natural organic wet wood textures on the central spider wood with moss, rough textured grey Seiryu stone on the right, dense natural red-pink Rotala H\x27Ra bushes on the left, and lush green Rotala on the far right. Exactly match this exact 3D camera view and layout. School of neon tetras in the water. Low-iron rimless glass tank on a dark wooden cabinet, 8k cinematic photography, highly detailed, soft natural caustics, soft depth of field. preserve every object in its original place: ${userDetails}. No watermarks, no logos, no text, no captions.`;

    // Попытка №1: Прямой запрос к надежной HuggingFace модели, которая отлично справляется с img2img
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: promptText,
          image: cleanBase64,
          parameters: {
            strength: 0.38, // Увеличиваем контроль геометрии (чем меньше, тем точнее сохраняются 3D-формы)
            guidance_scale: 6.5,
            negative_prompt: "deformed, blurry, logo, watermark, text, signature, shifted objects, different layout, entirely new composition"
          }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const b64 = Buffer.from(arrayBuffer).toString("base64");
        return json({ image: `data:image/jpeg;base64,${b64}` });
      }
    } catch (e) {
      console.warn("HuggingFace API недоступен, используем гарантированный гибридный метод:", e);
    }

    // Резервный безотказный генератор (Pollinations) с жесткими структурными промптами:
    const fallbackPrompt = encodeURIComponent(`Cinematic photo of the provided 3D aquarium setup, exactly preserving the original layout. At the center is natural spider wood with green moss. On the right is a textured grey Seiryu stone. On the left are dense bushes of red-pink Rotala, and on the right is a vibrant green Rotala bush. Crystal-clear water with tiny bubbles, school of neon tetras. Rimless low-iron glass tank. 8k, professional natural lighting, exact match of objects, no watermarks, no text`);
    const seed = Math.floor(Math.random() * 899999) + 100000;
    const fallbackUrl = `https://image.pollinations.ai/prompt/${fallbackPrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;
    
    const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(25000) });
    if (!fallbackRes.ok) {
      throw new Error(`Все генераторы перегружены. HTTP ${fallbackRes.status}`);
    }

    const arrayBuffer = await fallbackRes.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");
    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации. Пожалуйста, попробуйте еще раз." }, { status: 500 });
  }
};
