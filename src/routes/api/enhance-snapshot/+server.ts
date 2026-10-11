import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const BACKEND_URL = "https://clean-facts-beg.loca.lt";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных изображения сцены" }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
        "User-Agent": "ScapecraftClient/1.0"
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        imageBase64: rawBase64,
        sceneDescription: body?.sceneDescription || "spider wood in center, seiryu stone on right, rotala plants"
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Colab error:", res.status, errText);
      return json({ error: `Ошибка GPU бэкенда (${res.status}): ${errText.slice(0, 160)}` }, { status: res.status });
    }

    const data = await res.json();
    if (!data.image) {
      return json({ error: "Бэкенд не вернул изображение" }, { status: 500 });
    }

    return json({ image: data.image });
  } catch (err: any) {
    console.error("Generation error:", err);
    return json({ error: err.message || "Ошибка соединения с GPU сервером" }, { status: 500 });
  }
};
