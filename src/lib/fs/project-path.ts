/** 在项目根目录下按相对路径写入文本文件（自动创建中间目录）。 */
export async function writeTextAtProjectPath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<FileSystemFileHandle> {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error('writeTextAtProjectPath: empty path');

  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }

  const fh = await dir.getFileHandle(fileName, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
  return fh;
}

/** 从项目根读取相对路径文本（不存在则 undefined）。 */
export async function readTextAtProjectPath(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<string | undefined> {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return undefined;

  try {
    let dir = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    const fh = await dir.getFileHandle(fileName);
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return undefined;
  }
}
