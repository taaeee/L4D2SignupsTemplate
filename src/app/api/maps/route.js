import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const mapsDir = path.join(process.cwd(), 'images', 'maps');
    const officialsDir = path.join(mapsDir, 'officials');

    const formatName = (filename) => {
      // Remove extension
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      // Replace underscores/hyphens with spaces and uppercase
      return nameWithoutExt.replace(/[-_]/g, ' ').toUpperCase();
    };

    const processDir = (dirPath, type) => {
      if (!fs.existsSync(dirPath)) return [];
      
      const files = fs.readdirSync(dirPath);
      return files
        .filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'))
        .map(file => ({
          filename: file,
          name: formatName(file),
          type: type,
          // Generate an API URL to access the image since it's outside public
          imageUrl: `/api/maps/image?type=${type}&name=${encodeURIComponent(file)}`
        }));
    };

    const customMaps = processDir(mapsDir, 'custom');
    const officialMaps = processDir(officialsDir, 'official');

    return Response.json({
      officials: officialMaps,
      customs: customMaps,
      all: [...officialMaps, ...customMaps]
    });
  } catch (error) {
    console.error("Error reading maps directory:", error);
    return Response.json({ error: "Failed to load maps" }, { status: 500 });
  }
}
