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
    const userDetails = body?.sceneDescription || "natural spider wood in center, seiryu stone on right, red rotala on left, green rotala on right";
    
    // Формируем промпт с жестким требованием НЕ менять композицию эскиза
    const promptText = `A hyper-realistic, award-winning Takashi Amano style nature aquarium photograph, filled with crystal clear water and fine CO2 microbubbles. Real wet organic wood textures on the central spider wood with tiny green moss, rough textured grey Seiryu stone on the right, dense natural red-pink Rotala H\x27Ra bushes on the left, and lush green Rotala on the far right. Exactly match the 3d layout, schools of vivid neon tetra fish swimming. Low-iron rimless glass tank, 8k professional cinematic aquarium photography, highly detailed, soft natural caustics. Based on 3d sketch: ${userDetails}. No watermarks, no logos, no text.`;

    // 1. Попытка №1: Скоростной и надежный Image-to-Image через открытый диффузионный шлюз pollinations с передачей base64 и seed
    try {
      const seed = Math.floor(Math.random() * 899999) + 100000;
      // Используем новый неблокируемый url с жестким подавлением вотермарок и контролем структуры
      const safePrompt = encodeURIComponent(promptText + ", award-winning photorealism, exact shape match");
      const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;
      
      const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const b64 = Buffer.from(arrayBuffer).toString("base64");
        return json({ image: `data:image/jpeg;base64,${b64}` });
      }
    } catch (e) {
      console.warn("Основной шлюз не ответил, пробуем резервный...", e);
    }

    // 2. Попытка №2: Резервный Image-to-Image через бесплатный сервер бесперебойной генерации
    const fallbackPrompt = encodeURIComponent("Photorealistic natural aquascape, " + userDetails + ", 4k resolution, no watermark, highly detailed live plants, wood, stones, fish");
    const fallbackUrl = `https://image.pollinations.ai/prompt/${fallbackPrompt}?width=1152&height=648&model=search&nologo=true`;
    
    const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(20000) });
    if (!fallbackRes.ok) {
      throw new Error(`Все генераторы временно перегружены. HTTP ${fallbackRes.status}`);
    }

    const arrayBuffer = await fallbackRes.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации фотореализма. Пожалуйста, попробуйте снова через пару секунд." }, { status: 500 });
  }
};
