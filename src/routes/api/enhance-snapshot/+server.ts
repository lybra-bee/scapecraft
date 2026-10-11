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
    
    // Берем описание из сцены
    const userDetails = body?.sceneDescription || "natural driftwood in center, seiryu stone on right, red rotala on left, green rotala on right";
    
    // Текстовая детализация композиции для соблюдения форм в генераторе
    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph, filled with crystal clear water. High-end low-iron rimless glass tank, natural organic wet wood textures on the central spider wood with tiny green moss, rough textured grey Seiryu stone on the right, dense natural red-pink Rotala H\x27Ra bushes on the left, and lush green Rotala on the far right. Exactly match the 3d layout. schools of vivid neon tetra fish swimming. Cinematic 8k aquarium photography, highly detailed, soft natural caustics. Based on 3d mockup layout: ${userDetails}. No watermarks, no logos, no text, no captions.`;

    // 1. Попытка №1: Полноценный Image-to-Image запрос (img2img) через Hugging Face на мощной модели SD-XL с передачей оригинального изображения в теле запроса
    try {
      const hfToken = process.env.HF_ACCESS_TOKEN || ""; // Использование токена при наличии
      const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hfToken ? { "Authorization": `Bearer ${hfToken}` } : {})
        },
        body: JSON.stringify({
          inputs: promptText,
          image: cleanBase64, // Передаем картинку как референс (Image-to-Image)
          parameters: {
            strength: 0.52, // Сохраняем 3D-компоновку и добавляем реализм
            guidance_scale: 8.0,
            negative_prompt: "low quality, bad anatomy, worst quality, logo, watermark, text, signature, fish tank frame out of proportion, blurry, deformed, shifted objects, entirely different layout"
          }
        }),
        signal: AbortSignal.timeout(35000)
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const b64 = Buffer.from(arrayBuffer).toString("base64");
        return json({ image: `data:image/jpeg;base64,${b64}` });
      } else {
        const errText = await response.text();
        console.warn("HuggingFace Image-to-Image вернул ошибку, пробуем альтернативный шлюз:", errText);
      }
    } catch (e) {
      console.warn("Hugging Face API недоступен, переключаем на высокоточный AI-генератор:", e);
    }

    // 2. Попытка №2: Резервный надежный шлюз (Pollinations), в котором мы усиливаем промпт на соблюдение точной геометрии
    // Для этого детально описываем взаимное расположение объектов:
    const visualPositionPrompt = `A hyper-realistic nature aquarium photograph, Takayuki style. Crystal clear water with tiny CO2 microbubbles. ON THE LEFT: dense natural red-pink Rotala H\x27Ra bushes. IN THE CENTER: a large intricate natural spider wood with green moss. ON THE RIGHT: a rough textured grey Seiryu stone, and a dense bush of vibrant green Rotala on the far right. Background is a soft gradient. Schools of tiny neon tetra fish in the upper center. Low-iron rimless glass tank on a dark wooden cabinet, cinematic 8k, soft caustics, exact matching layout: ${userDetails}. No watermarks, no text, no logos.`;
    
    const seed = Math.floor(Math.random() * 899999) + 100000;
    const safePrompt = encodeURIComponent(visualPositionPrompt);
    const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
    if (!res.ok) {
      throw new Error(`Генератор перегружен. Статус: HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");
    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации фотореализма. Пожалуйста, попробуйте снова через пару секунд." }, { status: 500 });
  }
};
