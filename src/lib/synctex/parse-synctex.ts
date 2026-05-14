/*
 * MIT License — SyncTeX line parser derived from LaTeX Workshop / synctex-js
 * (Thomas Durieux, James-Yu/LaTeX-Workshop). Paths in blockNumberLine use
 * Input: paths from the .synctex file (not basenames only).
 */

export type Block = {
  type: string;
  parent: Block | Page;
  fileNumber: number;
  file: InputFile;
  line: number;
  left: number;
  bottom: number;
  width: number | undefined;
  height: number;
  depth?: number;
  blocks?: Block[];
  elements?: Block[];
  page: number;
};

function isBlock(b: Block | Page): b is Block {
  return (b as Block).parent !== undefined;
}

type InputFile = {
  path: string;
};

type InputFiles = { [fileNumber: string]: InputFile };

export type Page = {
  page: number;
  blocks: Block[];
  type: string;
};

type Pages = { [pageNum: string]: Page };

export type BlockNumberLine = {
  [inputFileFullPath: string]: {
    [inputLineNum: number]: { [pageNum: number]: Block[] };
  };
};

export type PdfSyncObject = {
  offset: { x: number; y: number };
  version: string;
  files: InputFiles;
  pages: Pages;
  blockNumberLine: BlockNumberLine;
  hBlocks: Block[];
  numberPages: number;
};

export function parseSyncTex(pdfsyncBody: string): PdfSyncObject | undefined {
  const unit = 65781.76;
  let numberPages = 0;
  let currentPage: Page | undefined;
  let currentElement: Block | Page | undefined;

  const blockNumberLine = Object.create(null) as BlockNumberLine;
  const hBlocks: Block[] = [];

  const files = Object.create(null) as InputFiles;
  const pages = Object.create(null) as Pages;
  const pdfsyncObject: PdfSyncObject = {
    offset: { x: 0, y: 0 },
    version: '',
    files: Object.create(null) as InputFiles,
    pages: Object.create(null) as Pages,
    blockNumberLine,
    hBlocks: [],
    numberPages: 0
  };

  if (pdfsyncBody === undefined) {
    return pdfsyncObject;
  }
  const lineArray = pdfsyncBody.split('\n');

  const v0 = lineArray[0]?.trim() || '';
  pdfsyncObject.version = v0.replace(/^SyncTeX Version:\s*/i, '').trim();

  const inputPattern = /Input:([0-9]+):(.+)/;
  const offsetPattern = /(X|Y) Offset:([0-9]+)/;
  const openPagePattern = /\{([0-9]+)$/;
  const closePagePattern = /\}([0-9]+)$/;
  const verticalBlockPattern =
    /\[([0-9]+),([0-9]+):(-?[0-9]+),(-?[0-9]+):(-?[0-9]+),(-?[0-9]+),(-?[0-9]+)/;
  const closeverticalBlockPattern = /\]$/;
  const horizontalBlockPattern =
    /\(([0-9]+),([0-9]+):(-?[0-9]+),(-?[0-9]+):(-?[0-9]+),(-?[0-9]+),(-?[0-9]+)/;
  const closehorizontalBlockPattern = /\)$/;
  const elementBlockPattern = /(.)([0-9]+),([0-9]+):(-?[0-9]+),(-?[0-9]+)(:?(-?[0-9]+))?/;

  for (let i = 1; i < lineArray.length; i++) {
    const line = lineArray[i];

    let match = line.match(inputPattern);
    if (match) {
      files[match[1]] = { path: match[2] };
      continue;
    }

    match = line.match(offsetPattern);
    if (match) {
      if (match[1].toLowerCase() === 'x') {
        pdfsyncObject.offset.x = parseInt(match[2], 10) / unit;
      } else if (match[1].toLowerCase() === 'y') {
        pdfsyncObject.offset.y = parseInt(match[2], 10) / unit;
      } else {
        return undefined;
      }
      continue;
    }

    match = line.match(openPagePattern);
    if (match) {
      currentPage = {
        page: parseInt(match[1], 10),
        blocks: [],
        type: 'page'
      };
      if (currentPage.page > numberPages) {
        numberPages = currentPage.page;
      }
      currentElement = currentPage;
      continue;
    }

    match = line.match(closePagePattern);
    if (match && currentPage !== undefined) {
      pages[match[1]] = currentPage;
      currentPage = undefined;
      continue;
    }

    match = line.match(verticalBlockPattern);
    if (match) {
      if (currentPage === undefined || currentElement === undefined) {
        continue;
      }
      const s1 = [Number(match[3]) / unit, Number(match[4]) / unit];
      const s2 = [Number(match[5]) / unit, Number(match[6]) / unit];
      const block: Block = {
        type: 'vertical',
        parent: currentElement,
        fileNumber: parseInt(match[1], 10),
        file: files[match[1]],
        line: parseInt(match[2], 10),
        left: s1[0],
        bottom: s1[1],
        width: s2[0],
        height: s2[1],
        depth: parseInt(match[7], 10),
        blocks: [],
        elements: [],
        page: currentPage.page
      };
      currentElement = block;
      continue;
    }

    match = line.match(closeverticalBlockPattern);
    if (match) {
      if (
        currentElement !== undefined &&
        isBlock(currentElement) &&
        isBlock(currentElement.parent) &&
        currentElement.parent.blocks !== undefined
      ) {
        currentElement.parent.blocks.push(currentElement);
        currentElement = currentElement.parent;
      }
      continue;
    }

    match = line.match(horizontalBlockPattern);
    if (match) {
      if (currentPage === undefined || currentElement === undefined) {
        continue;
      }
      const s1 = [Number(match[3]) / unit, Number(match[4]) / unit];
      const s2 = [Number(match[5]) / unit, Number(match[6]) / unit];
      const block: Block = {
        type: 'horizontal',
        parent: currentElement,
        fileNumber: parseInt(match[1], 10),
        file: files[match[1]],
        line: parseInt(match[2], 10),
        left: s1[0],
        bottom: s1[1],
        width: s2[0],
        height: s2[1],
        blocks: [],
        elements: [],
        page: currentPage.page
      };
      hBlocks.push(block);
      currentElement = block;
      continue;
    }

    match = line.match(closehorizontalBlockPattern);
    if (match) {
      if (
        currentElement !== undefined &&
        isBlock(currentElement) &&
        isBlock(currentElement.parent) &&
        currentElement.parent.blocks !== undefined
      ) {
        currentElement.parent.blocks.push(currentElement);
        currentElement = currentElement.parent;
      }
      continue;
    }

    match = line.match(elementBlockPattern);
    if (match) {
      if (currentPage === undefined || currentElement === undefined || !isBlock(currentElement)) {
        continue;
      }
      const type = match[1];
      const fileNumber = parseInt(match[2], 10);
      const lineNumber = parseInt(match[3], 10);
      const left = Number(match[4]) / unit;
      const bottom = Number(match[5]) / unit;
      const width = match[7] ? Number(match[7]) / unit : undefined;

      const elem: Block = {
        type,
        parent: currentElement,
        fileNumber,
        file: files[fileNumber],
        line: lineNumber,
        left,
        bottom,
        height: currentElement.height,
        width,
        page: currentPage.page
      };
      if (elem.file === undefined) {
        continue;
      }
      if (blockNumberLine[elem.file.path] === undefined) {
        blockNumberLine[elem.file.path] = Object.create(null) as {
          [inputLineNum: number]: { [pageNum: number]: Block[] };
        };
      }
      if (blockNumberLine[elem.file.path][lineNumber] === undefined) {
        blockNumberLine[elem.file.path][lineNumber] = Object.create(null) as {
          [pageNum: number]: Block[];
        };
      }
      if (blockNumberLine[elem.file.path][lineNumber][elem.page] === undefined) {
        blockNumberLine[elem.file.path][lineNumber][elem.page] = [];
      }
      blockNumberLine[elem.file.path][lineNumber][elem.page].push(elem);
      if (currentElement.elements !== undefined) {
        currentElement.elements.push(elem);
      }
      continue;
    }
  }
  pdfsyncObject.files = files;
  pdfsyncObject.pages = pages;
  pdfsyncObject.blockNumberLine = blockNumberLine;
  pdfsyncObject.hBlocks = hBlocks;
  pdfsyncObject.numberPages = numberPages;
  return pdfsyncObject;
}
