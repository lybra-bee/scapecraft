import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных изображения сцены" }, { status: 400 });
    }

    if (rawBase64 === "test") {
      return json({ ok: true });
    }

    const userDetails = body?.sceneDescription || "Seiryu stone, Spider wood, Rotala plants, neon tetras";

    // Формируем фотореалистичный промпт аквариума Takashi Amano
    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph. Crystal clear water, fine CO2 microbubbles, realistic wet wood textures, porous Seiryu stones with white veins, lush Rotala H\x27Ra and Rotala Green, neon tetra fish swimming. Low-iron rimless glass tank, cinematic 8k macro photography, soft natural caustics. Composition: ${userDetails}.`;

    const encodedPrompt = encodeURIComponent(promptText);
    const seed = Math.floor(Math.random() * 899999) + 100000;
    
    // Используем скоростной FLUX движок высокого разрешения
    const fluxUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;

    const imgRes = await fetch(fluxUrl, {
      signal: AbortSignal.timeout(40000)
    });

    if (!imgRes.ok) {
      throw new Error(`Ошибка генератора изображений: HTTP ${imgRes.status}`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации фотореализма" }, { status: 500 });
  }
};
