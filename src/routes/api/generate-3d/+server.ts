import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);
const TRIPO_KEY = 'tsk_hXcSguJmTEySLdVPajbdAOVh6GSCjwktHTm9h0YQLow';

export const POST: RequestHandler = async ({ request }) => {
  let tmpPath = '';
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return json({ error: 'Файл не найден' }, { status: 400 });
    }

    console.log(`[Tripo3D] Файл получен: ${imageFile.name} (${imageFile.size} байт)`);

    const ext = imageFile.name.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
    tmpPath = path.join(os.tmpdir(), `tripo_${Date.now()}${ext}`);
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await fs.writeFile(tmpPath, buffer);

    let publicImageUrl = '';

    console.log('[Tripo3D] Загрузка через быстрый CDN...');
    try {
      const { stdout: lbOut } = await execFileAsync('curl', [
        '-s',
        '--max-time', '10',
        '-F', 'reqtype=fileupload',
        '-F', 'time=1h',
        '-F', `fileToUpload=@${tmpPath}`,
        'https://litterbox.catbox.moe/resources/internals/api.php'
      ]);
      if (lbOut && lbOut.trim().startsWith('http')) {
        publicImageUrl = lbOut.trim();
      }
    } catch {
      console.log('[Tripo3D] Ошибка первичного CDN');
    }

    if (!publicImageUrl) {
      return json({ error: 'Ошибка передачи изображения на CDN' }, { status: 504 });
    }

    console.log(`[Tripo3D] Прямой URL: ${publicImageUrl}`);

    const payload = JSON.stringify({
      type: 'image_to_model',
      file: {
        type: ext === '.png' ? 'png' : 'jpg',
        url: publicImageUrl
      },
      enable_image_autofix: true,
      texture: true,
      pbr: true
    });

    const { stdout: taskStdout } = await execFileAsync('curl', [
      '-s',
      '-X', 'POST',
      'https://api.tripo3d.ai/v2/openapi/task',
      '-H', `Authorization: Bearer ${TRIPO_KEY}`,
      '-H', 'Content-Type: application/json',
      '-d', payload
    ]);

    const taskData = JSON.parse(taskStdout || '{}');
    console.log('[Tripo3D] Ответ API:', JSON.stringify(taskData));

    if (taskData.code !== 0 || !taskData.data?.task_id) {
      return json({ error: taskData.message || 'Ошибка создания задачи Tripo3D' }, { status: 500 });
    }

    return json({ taskId: taskData.data.task_id });
  } catch (err: any) {
    console.error('[Tripo3D] Ошибка POST:', err);
    return json({ error: err.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  } finally {
    if (tmpPath) {
      fs.unlink(tmpPath).catch(() => {});
    }
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const taskId = url.searchParams.get('taskId');
    if (!taskId) {
      return json({ error: 'taskId отсутствует' }, { status: 400 });
    }

    const { stdout } = await execFileAsync('curl', [
      '-s',
      '-X', 'GET',
      `https://api.tripo3d.ai/v2/openapi/task/${taskId}`,
      '-H', `Authorization: Bearer ${TRIPO_KEY}`
    ]);

    const data = JSON.parse(stdout || '{}');
    const task = data.data;

    if (!task) {
      return json({ error: data.message || 'Задача не найдена' }, { status: 404 });
    }

    let localModelPath = null;

    if (task.status === 'success') {
      const remoteModelUrl = task.output?.pbr_model || task.output?.model || task.result?.pbr_model?.url;
      if (remoteModelUrl) {
        localModelPath = remoteModelUrl;
      }
    }

    return json({
      status: task.status,
      progress: task.progress || 0,
      modelUrl: localModelPath,
      errorCode: task.error_code || null
    });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};
