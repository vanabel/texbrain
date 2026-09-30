# TeXbrain 未来功能路线图（草案）

> 这是一个长期路线图，不是短期承诺清单。  
> 欢迎一起参与设计、实现和测试。

## 为什么需要这份路线图

TeXbrain 已经覆盖了「浏览器内写作 + 编译 + Git」主流程，但要继续向专业写作工具演进，还有不少工程工作要做（编辑器体验、编译生态、协作、可维护性、跨浏览器兼容等）。

这份文档用于：

- 对齐未来方向，降低重复讨论成本
- 拆分成可迭代任务，方便社区协作
- 明确哪些是中短期目标，哪些是长期探索

## 从 [LatexCoder](https://github.com/EvoEvolver/LatexCoder) 可吸收什么（2026-09）

LatexCoder 是**自托管**协作工作区（Yjs + SQLite + 真实 Git + Tectonic/latexmk + Agent 文件 API）。TeXbrain 是**纯浏览器**（WASM TeX、isomorphic-git、可选 WebRTC）。**不要**搬服务端栈；只吸收适合静态客户端的 UX / 算法。

| 维度 | TeXbrain 现状 | LatexCoder 强项 | 是否吸收 |
| --- | --- | --- | --- |
| 部署 | 静态 SPA，无账号 | Node 服务、鉴权、SSH Git | 否（定位冲突） |
| 编译 | SwiftLaTeX / BusyTeX WASM | 服务端 Tectonic / latexmk | 否（保持 WASM；可选后续 companion） |
| 协作 | WebRTC Yjs 房间 | 服务端 Yjs + 能力链接 + 自动 checkpoint | 部分（仅 UX） |
| Agent | 无 | 整文件编辑 + SHA256 冲突检测 + 明文手册 | 仅可选 companion |
| 日志 / 诊断 | 结构化 Log + 首致命错误跳转；静态 lint | 结构化 Log、首个致命错误、跳转源码 | **已完成（A1/A4）** |
| 过期 PDF | 保留上次成功 + stale 标记 | 保留上次成功 PDF + stale 标记 | **已完成（A2）** |
| 跳转引用 | Cmd/Ctrl+单击跟随 + 侧栏 | Cmd/Ctrl+单击 `\cite`/`\ref`/`\input` 等 | **已完成（A3）** |
| 静态检查 | 重复 label / 未定义 cite·ref + CM lint | 未定义 cite/ref、重复 `\label` | **已完成（A4）** |
| 文献补全 | 标题/作者 + Labels 页 | 补全展示标题/作者 | **已完成（A5）** |
| 工程搜索 | Ctrl/⌘+Shift+F + 写回磁盘 | 多文件搜索 + 替换预览 | **已完成（A6）** |
| 审阅 | 协作 UI 评论 | 审阅写成 LaTeX 宏（进 Git） | 探索（A7） |
| TreeWriter / TLDR | 仅大纲 | 论文级摘要 + 叶子就地编辑 | 稍后 |
| Markdown | 无 | 编辑 + 消毒 GFM 预览 | 稍后 |

### 吸收待办（客户端可落地）

**A1（P0）：** 结构化 **Log** 面板——置顶首个致命错误；分组 error/warning；单击跳到文件+行（强化现有 `parseLog`）。✅ Log 标签内「诊断」列表 +「原始日志」

**A2（P0）：** **过期 PDF**——编辑中保留上次成功预览；成功编译前标 stale；失败构建不得冒充最新 PDF。✅

**A3（P1）：** **Cmd/Ctrl+单击跟随** `\cite` / `\citep` / `\citet` / `\ref` / `\autoref` / `\cref` / `\eqref` / `\input` / `\include` / `\includegraphics` / `\url`（参考 LatexCoder `referenceLinks`）。✅

**A4（P1）：** 编译前 **静态诊断**——重复 label、未定义 ref/cite（参考 `latexDiagnostics`）；进 Log + 编辑器标记。✅ Warnings/Log + CodeMirror lint 下划线/gutter

**A5（P1）：** 更丰富的 **文献补全**（`.bib` 标题/作者）与 **References** 中的 `\label`/`\ref` 浏览。✅

**A6（P2）：** 工程级 **搜索 / 替换预览**（内存实现即可，无需 ripgrep/沙箱）。✅ 打开文件夹工程时应用后写回磁盘

**A7（探索）：** 评论/建议写成 **LaTeX 宏**，让 Git 与未来 Agent 看到同一审阅状态（比纯 UI 状态更契合「源码即真相」）。

**明确不从 LatexCoder 搬的：** 管理后台、SSH Git、服务端编译队列、Agent HTTP 协议、能力分享会话、bubblewrap 搜索——除非以后单独做*可选*自托管 companion（另一产品面）。

## 当前优先级（2026）

### 近期已交付（编辑器）

- 标签页侧栏：**文件**、**大纲**（章节树 + `\input` / `\include`）、**引用**（文献键 + 带编号公式）
- 文献/公式：单击跳转、Ctrl/⌘+单击插入；工程级 `\cite{…}` / `\eqref{…}` 补全
- 同批改进：BusyTeX 交叉引用（二次 XeLaTeX）、SyncTeX / PDF 预览稳定性
- **A1–A6（吸收自 LatexCoder）：** 结构化 Log（首致命错误 + 单击跳源）、过期 PDF 标记、Cmd/Ctrl+单击跟随 cite/ref/input/include/includegraphics/url、静态诊断（重复 label / 未定义 cite·ref）、更丰富的文献补全 + References 中的 `\label`/`\ref`、工程搜索/替换预览（Ctrl/⌘+Shift+F）

仍待做：跨文件重命名/重构；TreeWriter / 宏审阅（A7）。

### P0：稳定性与可预期行为

- 多主文件项目下的编译目标一致性（Active Tab / Entry Point）
- PDF 预览与导出一致性（尤其是 CJK 字体、注释层、文本层）
- BusyTeX / SwiftLaTeX 路径的日志可观测性（便于定位问题）
- 更清晰的错误分类（LaTeX error、字体问题、路径问题、引用问题）

### P1：LaTeX 工作流增强

- BibTeX / biblatex / biber 的能力边界与提示优化
- 大型项目的增量编译与缓存策略
- 模板与脚手架增强（学位论文、期刊模板、中文写作）
- `\input` / `\include` 与 label 的安全跨文件重命名/重构

### P2：编辑体验增强

- Vim 模式（先做基础，再逐步接近 vimtex 体验）
- 更强的命令面板与快捷键可配置
- 在已交付 **大纲** 之外的结构导航（符号、TreeWriter 式论文视图）
- 代码片段、自动补全的可扩展机制
- 若协作需要 Git 可见评论：宏审阅（A7）

## 中长期探索

## 1) Vim / vimtex-like 体验（中大型）

目标不是“直接运行 Neovim 插件”，而是逐步实现等价工作流：

- 阶段 1：基础 Vim 键位与模式切换
- 阶段 2：LaTeX 专项动作（环境操作、引用跳转、对象文本）
- 阶段 3：quickfix / 跳转 / 视图联动等更完整体验

预估：需要持续迭代，通常按月推进。

## 2) 协作编辑（大型）

- 房间权限模型（只读/可写）
- 冲突可视化与恢复机制
- 协作状态与编译结果同步策略
- 性能与资源占用控制

## 3) 插件化能力（大型）

- 命令、片段、模板的扩展接口
- 可控的插件沙箱与安全模型
- 版本兼容策略

## 4) 更丰富的部署形态（中大型）

- 纯静态部署最佳实践（CDN、缓存、资源预热）
- 桌面壳（可选）与本地文件体验增强
- 企业/学校内网场景适配

## 里程碑建议（滚动）

- M1（约 1-2 月）：稳定性与编译目标问题收敛，日志可观测性增强
- M2（约 2-3 月）：编辑器工作流增强（剩余标签/引用工具、模板）
- M3（约 3-6 月）：Vim 第一阶段 + 协作能力增强
- M4（长期）：插件化与更完整生态

> 时间仅为粗略区间，实际取决于参与者数量与可投入时间。

## 如何协作（欢迎 PR）

欢迎以下形式的贡献：

- **问题报告**：最小复现、日志片段、浏览器与系统信息
- **功能建议**：说明场景、期望行为、替代方案
- **代码贡献**：先提 Issue/Discussion 对齐范围，再提交 PR
- **文档与测试**：补充示例工程、回归用例、失败场景说明

建议在提案中包含：

- 问题背景与目标
- 非目标（明确不做什么）
- 兼容性影响
- 回退方案（若上线后出现问题）

## 开放讨论主题

- Vim 模式的范围边界：先做哪些、后做哪些
- 中文/多语言写作的默认体验（字体与模板策略）
- BusyTeX 资源策略（体积、加载、缓存、可维护性）
- 预览与编译一致性的验证基线（示例文档集合）

---

如果你愿意参与，请直接提 Issue 或 PR。  
长期项目最需要的是：持续、小步、可验证的改进。
