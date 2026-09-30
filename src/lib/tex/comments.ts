/** Keep offsets intact while blanking unescaped TeX comments. */
export function withoutComments(source: string): string {
  const characters = source.split('');
  for (let index = 0; index < source.length; index++) {
    const url =
      source[index] === '\\' ? /^\\url\s*\{[^{}]*\}/.exec(source.slice(index)) : null;
    if (url) {
      index += url[0].length - 1;
      continue;
    }
    if (source[index] !== '%') continue;
    let slashes = 0;
    for (let before = index - 1; before >= 0 && source[before] === '\\'; before--) slashes++;
    if (slashes % 2) continue;
    while (index < source.length && source[index] !== '\n') characters[index++] = ' ';
  }
  return characters.join('');
}

export function lineAtOffset(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}
