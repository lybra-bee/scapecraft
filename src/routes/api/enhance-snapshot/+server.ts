import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

export const POST: RequestHandler = async () => {
  try {
    // Путь к сохраненному фотореалистичному кадру
    const imgPath = path.resolve(process.cwd(), 'static/renders/aquascape_studio_4k.jpg');
    
    if (fs.existsSync(imgPath)) {
      const imgBuffer = fs.readFileSync(imgPath);
      const b64 = imgBuffer.toString('base64');
      return json({ image: `data:image/jpeg;base64,${b64}` });
    }

    return json({ error: 'Файл снимка не найден' }, { status: 404 });
  } catch (err: any) {
    return json({ error: err.message || 'Ошибка отдачи' }, { status: 500 });
  }
};
