import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const hfToken = process.env.HF_ACCESS_TOKEN || process.env.HF_TOKEN;
    const body = await request.json().catch(() => ({}));
    let rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных изображения сцены" }, { status: 400 });
    }

    if (rawBase64 === "test") return json({ ok: true });

    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const userDetails = body?.sceneDescription || "spider wood in center, seiryu stone, rotala plants";

    // Промпт для фотореализма с сохранением компоновки
    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph. Crystal clear water with tiny CO2 microbubbles, ultra-realistic wet mossy driftwood in center, textured grey Seiryu stone on right, red and green Rotala bushes on sides. Low-iron rimless glass tank, 8k cinematic macro photography, exact match: ${userDetails}. No text, no watermark, no logos.`;

    // Попытка через новый Router HuggingFace (FLUX.1-schnell с официальным токеном)
    if (hfToken) {
      try {
        const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${hfToken}`,
            "Content-Type": "application/json"
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            inputs: promptText,
            parameters: { num_inference_steps: 4 }
          })
        });

        if (hfRes.ok) {
          const arrayBuf = await hfRes.arrayBuffer();
          const b64 = Buffer.from(arrayBuf).toString("base64");
          return json({ image: `data:image/jpeg;base64,${b64}`, method: "huggingface" });
        }
      } catch (e) {
        console.warn("HuggingFace Router недоступен или превысил лимит времени:", e);
      }
    }

    // Если удаленный сервер не ответил вовремя — сообщаем клиенту применить локальный Photorealism Canvas
    return json({ fallbackToClient: true, original: `data:image/jpeg;base64,${rawBase64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ fallbackToClient: true });
  }
};
