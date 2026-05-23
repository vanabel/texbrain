# 字体文件（不随 Git 提交）

将 OTF 放入本目录后，TeXbrain / BusyTeX 编译时从磁盘读取（`readDirRecursive` 会收集 `.otf`）。

## 1. 西文（BusyTeX 必做）

`elegantbook` 需要 **TeXGyreTermesX**（在 TeX Live 的 `newtx` 目录，不是 `tex-gyre` 里的旧 termes）和 **texgyreheros**（在 `tex-gyre` 目录）。

在 `Elegantbook-cn/` 下执行：

```bash
chmod +x ./setup-fonts.sh
NEWTX_SRC=/usr/share/texmf/fonts/opentype/public/newtx \
TEXGYRE_SRC=/usr/share/texmf/fonts/opentype/public/tex-gyre \
./setup-fonts.sh --latin
```

复制完成后本目录应包含至少：

- `TeXGyreTermesX-Regular.otf`、`TeXGyreTermesX-Bold.otf`、`TeXGyreTermesX-Slanted.otf`
- `TeXGyreTermesX-BoldSlanted.otf`（若系统没有，脚本会用 Bold 复制一份）
- `texgyreheros-regular.otf`、`texgyreheros-bold.otf`、`texgyreheros-italic.otf`、`texgyreheros-bolditalic.otf`

`elegantbook.cls` 检测到 `./fonts/TeXGyreTermesX-Regular.otf` 后自动从本目录加载；完整 TeX Live 本地编译则仍走系统字体。

## 2. 中文 Adobe（可选）

- `AdobeSongStd-Light.otf`
- `AdobeHeitiStd-Regular.otf`
- `AdobeKaitiStd-Regular.otf`
- `AdobeFangsongStd-Regular.otf`

```bash
FONTS_SRC=/path/to/your/adobe ./setup-fonts.sh --adobe
# 或一次复制全部：
./setup-fonts.sh --all
```

## 注意

- **不要**使用旧文件名 `tex-gyre-termes.regular.otf`；类文件用的是 **TeXGyreTermesX**（`newtx` 包）。
- 若你的主文件是 `main.tex` 且自带 `elegantbook.cls`，请同样准备 `fonts/` 并使用已更新的 `elegantbook.cls`（或从本目录复制）。
