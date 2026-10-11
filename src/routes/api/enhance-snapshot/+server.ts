import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const rawBase64 = body?.imageBase64 || "";

    if (!rawBase64) {
      return json({ error: "Нет данных сцены" }, { status: 400 });
    }

    // Возвращаем прямое подтверждение готовности для студийного рендера
    return json({ ok: true });
  } catch (err: any) {
    return json({ error: "Ошибка обработки" }, { status: 500 });
  }
};
