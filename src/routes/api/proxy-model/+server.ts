import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const modelUrl = url.searchParams.get('url');
  if (!modelUrl) {
    return new Response('URL не указан', { status: 400 });
  }

  try {
    const res = await fetch(modelUrl);
    if (!res.ok) {
      return new Response('Не удалось получить файл от Tripo3D', { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err: any) {
    return new Response(err.message || 'Ошибка загрузки модели', { status: 500 });
  }
};
