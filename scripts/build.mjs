import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());
const distDir = path.join(rootDir, 'dist');
const threeSource = path.join(rootDir, 'node_modules', 'three', 'build', 'three.module.js');
const threeDist = path.join(distDir, 'node_modules', 'three', 'build', 'three.module.js');
const requiredPaths = [
  'index.html',
  'src/core/app.js',
  'src/render3d/scene.js',
  'src/render3d/shard-mesh.js',
  'src/anim/mirror-crack.js',
  'src/anim/aggregate.js',
  'src/demo/mode.js',
  'assets/fallback/memory-01.svg',
];

async function exists(target) {
  try {
    await fs.access(path.join(rootDir, target));
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

for (const relativePath of requiredPaths) {
  if (!(await exists(relativePath))) {
    throw new Error(`Missing required build input: ${relativePath}`);
  }
}

await fs.rm(distDir, { recursive: true, force: true });
await copyDirectory(rootDir, distDir);
await fs.mkdir(path.dirname(threeDist), { recursive: true });
await fs.copyFile(threeSource, threeDist);
console.log(`Build artifact prepared at ${distDir}`);
