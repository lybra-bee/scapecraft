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

    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const userDetails = body?.sceneDescription || "spider wood in center, seiryu stone on right, red and green rotala plants";

    // Строгий промпт Takashi Amano с точным описанием позиций из вашей сцены
    const promptText = `Award-winning Takashi Amano style nature aquarium studio photograph. Crystal clear water, fine CO2 microbubbles, realistic wet wood textures on the central spider wood, porous textured Seiryu stone on the right, lush red Rotala bushes on the left and bright green Rotala on the right, small school of neon tetra fish swimming. Low-iron rimless glass tank, cinematic 8k macro photography, soft natural caustics. Composition layout: ${userDetails}. Studio ADA aquarium photo, highly detailed nature aquascape, no logos, no watermarks, no text, clean borders.`;

    const encodedPrompt = encodeURIComponent(promptText);
    const seed = Math.floor(Math.random() * 899999) + 100000;

    // Запрашиваем через скоростной FLUX без наложения логотипов (&nologo=true)
    const renderUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true&enhance=false`;

    const imgRes = await fetch(renderUrl, {
      signal: AbortSignal.timeout(35000)
    });

    if (!imgRes.ok) {
      throw new Error(`Ошибка генератора: HTTP ${imgRes.status}`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    return json({ image: `data:image/jpeg;base64,${b64}` });

  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Ошибка генерации фотореализма" }, { status: 500 });
  }
};
