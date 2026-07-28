import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const name = searchParams.get('name');

  if (!name || !type) {
    return new Response('Missing parameters', { status: 400 });
  }

  // Prevent directory traversal attacks
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return new Response('Invalid filename', { status: 400 });
  }

  try {
    const basePath = path.join(process.cwd(), 'images', 'maps');
    const targetDir = type === 'official' ? path.join(basePath, 'officials') : basePath;
    const filePath = path.join(targetDir, name);

    if (!fs.existsSync(filePath)) {
      return new Response('Image not found', { status: 404 });
    }

    const imageBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    let contentType = 'image/jpeg';
    if (name.toLowerCase().endsWith('.png')) contentType = 'image/png';
    else if (name.toLowerCase().endsWith('.webp')) contentType = 'image/webp';

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error("Error reading map image:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
