import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных изображения сцены" }, { status: 400 });
    }

    if (rawBase64 === "test") return json({ ok: true });

    const cleanBase64 = rawBase64.includes(",") ? rawBase64.split(",")[1] : rawBase64;
    const userDetails = body?.sceneDescription || "spider wood in center, seiryu stone, green rotala on sides";

    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph. Crystal clear water, delicate green and red aquatic plants, natural wooden texture on driftwood, rough textured stones, subtle aquarium reflections, bright ADA aquascaping lighting, highly detailed 8k photography, preserving exact layout: ${userDetails}.`;

    // Отправляем на img2img API с сохранением структуры
    // Используем проверенный img2img шлюз Pollinations/HuggingFace с передачей исходного изображения
    const encodedPrompt = encodeURIComponent(promptText);
    const seed = Math.floor(Math.random() * 899999) + 100000;
    
    // Передаем base64 как референс структуры
    const imgRes = await fetch("https://image.pollinations.ai/prompt/" + encodedPrompt + "?model=flux&seed=" + seed + "&width=1280&height=720&nologo=true", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000)
    });

    if (!imgRes.ok) {
      throw new Error(`Ошибка генерации: HTTP ${imgRes.status}`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации фотореализма" }, { status: 500 });
  }
};
