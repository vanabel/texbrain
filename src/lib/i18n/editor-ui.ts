import type { AppLocale } from './locale';

/** Replace `{key}` placeholders in a template string. */
export function expandEditorTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export type EditorUi = {
  // Command palette
  cmdNewProject: string;
  cmdOpenFolder: string;
  cmdOpenFile: string;
  cmdSaveCompile: string;
  cmdSaveAs: string;
  cmdCompile: string;
  cmdToggleSidebar: string;
  cmdTogglePreview: string;
  cmdInsertSnippet: string;
  cmdShowPreview: string;
  cmdShowLog: string;
  cmdToggleGit: string;
  cmdToggleCollab: string;
  palettePlaceholder: string;
  paletteNoResults: string;

  // Top bar
  openFolder: string;
  openFile: string;
  save: string;
  compile: string;
  compiling: string;
  engine: string;
  compileMode: string;
  optActiveTab: string;
  optEntryPoint: string;
  entryLabel: string;
  targetLabel: string;
  /** When entry path equals compile target, single label (no duplicate path). */
  statusEntryTargetMerged: string;
  entryTooltip: string;
  targetTooltip: string;
  git: string;
  collab: string;
  collabTooltip: string;
  github: string;
  ttOpenFileShortcut: string;
  ttSaveShortcut: string;
  ttCompileShortcut: string;
  ttGitShortcut: string;
  ttEngine: string;
  ttCompileMode: string;

  unsavedTooltip: string;
  savedTooltip: string;

  // Toolbar
  ttSidebar: string;
  ttBold: string;
  ttItalic: string;
  ttUnderline: string;
  ttSnippets: string;
  snippetsLabel: string;
  ttCommandPalette: string;
  ttPreview: string;

  // Preview pane
  tabPreview: string;
  tabErrors: string;
  tabWarnings: string;
  tabLog: string;
  savePdf: string;
  ttSavePdf: string;
  downloadBbl: string;
  ttDownloadBbl: string;
  noErrors: string;
  noWarnings: string;
  noLogYet: string;
  linePrefix: string;

  // Welcome / clone
  welcomeTitle: string;
  welcomeDesc: string;
  newProject: string;
  welcomeOpenFolder: string;
  cloneRepository: string;
  builtInBibtex: string;
  ttBuiltInBibtex: string;
  cloneTitle: string;
  cloneDesc: string;
  labelRepoUrl: string;
  clonePresetExamples: string;
  labelProjectName: string;
  cloneExamplesOnly: string;
  cloning: string;
  chooseLocationClone: string;
  back: string;
  cloneHint: string;
  promptFolderName: string;

  // Toasts & errors
  toastExportNoFile: string;
  toastExportNoProject: string;
  toastExported: string;
  toastExportFailed: string;
  toastCollabStarted: string;
  toastCollabJoined: string;
  toastCloneCors: string;
  toastCloneFailed: string;

  // Status bar
  statusCompiling: string;
  statusReady: string;
  statusError: string;
  statusIdle: string;
  statusChars: string;
  statusWords: string;
  statusUtf8: string;
  statusLatex: string;
  statusCredit: string;
  /** Use {line} and {col} */
  statusLineCol: string;

  // Collaboration panel
  collabPanelTitle: string;
  collabClose: string;
  yourName: string;
  namePlaceholder: string;
  connected: string;
  connecting: string;
  shareCode: string;
  copyShareCode: string;
  shareHintEncrypt: string;
  password: string;
  passwordShareHint: string;
  collaborators: string;
  waitingPeers: string;
  leaveSession: string;
  startSession: string;
  createPasswordLabel: string;
  createPasswordOpt: string;
  createPwPlaceholder: string;
  starting: string;
  startCollab: string;
  startHintEncrypt: string;
  or: string;
  joinSession: string;
  labelShareCode: string;
  pasteCodePlaceholder: string;
  joinPasswordLabel: string;
  joinPasswordOpt: string;
  roomPwPlaceholder: string;
  joining: string;
  joinBtn: string;
  toastNameFirst: string;
  toastPasteCode: string;
  toastInvalidCode: string;
  toastCreateFailed: string;
  toastJoinFailed: string;
  toastLeftSession: string;
  toastCodeCopied: string;
  unknownError: string;
};

export const editorUi: Record<AppLocale, EditorUi> = {
  en: {
    cmdNewProject: 'New Project',
    cmdOpenFolder: 'Open Folder',
    cmdOpenFile: 'Open File',
    cmdSaveCompile: 'Save + Compile',
    cmdSaveAs: 'Save As...',
    cmdCompile: 'Compile',
    cmdToggleSidebar: 'Toggle Sidebar',
    cmdTogglePreview: 'Toggle Preview',
    cmdInsertSnippet: 'Insert Snippet',
    cmdShowPreview: 'Show Preview',
    cmdShowLog: 'Show Log',
    cmdToggleGit: 'Toggle Git Panel',
    cmdToggleCollab: 'Toggle Collaboration Panel',
    palettePlaceholder: 'Type a command...',
    paletteNoResults: 'No matching commands',

    openFolder: 'Open Folder',
    openFile: 'Open File',
    save: 'Save',
    compile: 'Compile',
    compiling: 'Compiling...',
    engine: 'Engine',
    compileMode: 'Compile',
    optActiveTab: 'Active Tab',
    optEntryPoint: 'Entry Point',
    entryLabel: 'Entry:',
    targetLabel: 'Target:',
    statusEntryTargetMerged: 'Entry / target:',
    entryTooltip: 'Project entry file used by Entry Point mode, and as fallback for Active Tab mode.',
    targetTooltip: 'Last resolved compile target',
    git: 'Git',
    collab: 'Collab',
    collabTooltip: 'Collaboration — start or join a session; copy share code when hosting',
    github: 'GitHub',
    ttOpenFileShortcut: 'Open File (Ctrl+O)',
    ttSaveShortcut: 'Save (Ctrl+S)',
    ttCompileShortcut: 'Compile (Ctrl+Enter)',
    ttGitShortcut: 'Git (Ctrl+G)',
    ttEngine: 'Compilation engine',
    ttCompileMode: 'Main file selection mode',

    unsavedTooltip: 'Unsaved changes',
    savedTooltip: 'Saved',

    ttSidebar: 'Toggle Sidebar (Ctrl+B)',
    ttBold: 'Bold',
    ttItalic: 'Italic',
    ttUnderline: 'Underline',
    ttSnippets: 'Insert Snippet (Ctrl+/)',
    snippetsLabel: 'Snippets',
    ttCommandPalette: 'Command Palette (Ctrl+K)',
    ttPreview: 'Toggle Preview (Ctrl+P)',

    tabPreview: 'Preview',
    tabErrors: 'Errors',
    tabWarnings: 'Warnings',
    tabLog: 'Log',
    savePdf: 'Save PDF',
    ttSavePdf: 'Save PDF',
    downloadBbl: 'Download BBL',
    ttDownloadBbl: 'Download BBL',
    noErrors: 'No errors',
    noWarnings: 'No warnings',
    noLogYet: 'No compilation log yet',
    linePrefix: 'line',

    welcomeTitle: 'Welcome to TeXbrain',
    welcomeDesc: 'Open a project folder or create a new one to get started',
    newProject: 'New Project',
    welcomeOpenFolder: 'Open Folder',
    cloneRepository: 'Clone Repository',
    builtInBibtex: 'Built-in BibTeX example',
    ttBuiltInBibtex:
      'Same-origin zip bundled at build time — works on any static host without GitHub or CORS',
    cloneTitle: 'Clone Repository',
    cloneDesc: 'Clone a Git repository and open it as a project',
    labelRepoUrl: 'Repository URL',
    clonePresetExamples: 'Use official TeXbrain repo (BibTeX EN/ZH example)',
    labelProjectName: 'Project Name',
    cloneExamplesOnly: 'Only download examples/ (GitHub zip, smaller — no git history)',
    cloning: 'Cloning...',
    chooseLocationClone: 'Choose Location & Clone',
    back: 'Back',
    cloneHint:
      "You'll pick a folder where the project will be saved. Full git clone uses the CORS proxy in Git > Remote. examples/-only uses the same proxy to download GitHub's zip archive.",
    promptFolderName: 'Project folder name:',

    toastExportNoFile: 'Export: no active file',
    toastExportNoProject: 'Export: no project handle',
    toastExported: 'Exported {name}',
    toastExportFailed: 'Export failed: {msg}',
    toastCollabStarted: 'Collaboration session started!',
    toastCollabJoined: 'Joined collaboration session!',
    toastCloneCors:
      'Network/CORS blocked. On localhost use pnpm dev or pnpm preview (zip uses a built-in proxy). On a static host, set Git → Remote CORS proxy to https://cors.isomorphic-git.org or use full git clone.',
    toastCloneFailed: 'Clone failed: {msg}',

    statusCompiling: 'Compiling',
    statusReady: 'Ready',
    statusError: 'Error',
    statusIdle: 'Idle',
    statusChars: 'chars',
    statusWords: 'words',
    statusUtf8: 'UTF-8',
    statusLatex: 'LaTeX',
    statusCredit: 'made with',
    statusLineCol: 'Ln {line}, Col {col}',

    collabPanelTitle: 'Collaboration',
    collabClose: 'Close',
    yourName: 'Your Name',
    namePlaceholder: 'Enter your name',
    connected: 'Connected',
    connecting: 'Connecting...',
    shareCode: 'Share Code',
    copyShareCode: 'Copy share code',
    shareHintEncrypt:
      'End-to-end encrypted. This code contains the encryption key, only share it with people you trust.',
    password: 'Password',
    passwordShareHint: 'Collaborators also need this password. Share it separately from the code for extra security.',
    collaborators: 'Collaborators',
    waitingPeers: 'Waiting for collaborators to join...',
    leaveSession: 'Leave Session',
    startSession: 'Start a Session',
    createPasswordLabel: 'Password',
    createPasswordOpt: '(optional, extra security)',
    createPwPlaceholder: 'Require a password to join',
    starting: 'Starting...',
    startCollab: 'Start Collaboration',
    startHintEncrypt:
      'All sessions are end-to-end encrypted. Setting a password adds a second factor. Collaborators will need both the share code and the password.',
    or: 'or',
    joinSession: 'Join a Session',
    labelShareCode: 'Share Code',
    pasteCodePlaceholder: 'Paste the share code',
    joinPasswordLabel: 'Password',
    joinPasswordOpt: '(if required)',
    roomPwPlaceholder: 'Room password',
    joining: 'Joining...',
    joinBtn: 'Join Session',
    toastNameFirst: 'Please enter your name first',
    toastPasteCode: 'Please paste a share code',
    toastInvalidCode: 'Invalid share code format',
    toastCreateFailed: 'Failed to create room: {msg}',
    toastJoinFailed: 'Failed to join room: {msg}',
    toastLeftSession: 'Left collaboration session',
    toastCodeCopied: 'Share code copied!',
    unknownError: 'Unknown error'
  },
  zh: {
    cmdNewProject: '新建工程',
    cmdOpenFolder: '打开文件夹',
    cmdOpenFile: '打开文件',
    cmdSaveCompile: '保存并编译',
    cmdSaveAs: '另存为…',
    cmdCompile: '编译',
    cmdToggleSidebar: '切换侧栏',
    cmdTogglePreview: '切换预览',
    cmdInsertSnippet: '插入片段',
    cmdShowPreview: '显示 PDF 预览',
    cmdShowLog: '显示编译日志',
    cmdToggleGit: '切换 Git 面板',
    cmdToggleCollab: '切换协作面板',
    palettePlaceholder: '输入命令…',
    paletteNoResults: '没有匹配的命令',

    openFolder: '打开文件夹',
    openFile: '打开文件',
    save: '保存',
    compile: '编译',
    compiling: '编译中…',
    engine: '引擎',
    compileMode: '编译',
    optActiveTab: '当前标签',
    optEntryPoint: '入口文件',
    entryLabel: '入口：',
    targetLabel: '目标：',
    statusEntryTargetMerged: '入口/目标：',
    entryTooltip: '在「入口文件」模式下使用的工程主文件；在「当前标签」模式下也可作为回退。',
    targetTooltip: '最近一次解析得到的编译目标',
    git: 'Git',
    collab: '协作',
    collabTooltip: '协作：创建或加入会话；主持时可复制分享码',
    github: 'GitHub',
    ttOpenFileShortcut: '打开文件 (Ctrl+O)',
    ttSaveShortcut: '保存 (Ctrl+S)',
    ttCompileShortcut: '编译 (Ctrl+Enter)',
    ttGitShortcut: 'Git (Ctrl+G)',
    ttEngine: '编译引擎',
    ttCompileMode: '主文件选择方式',

    unsavedTooltip: '未保存的更改',
    savedTooltip: '已保存',

    ttSidebar: '切换侧栏 (Ctrl+B)',
    ttBold: '粗体',
    ttItalic: '斜体',
    ttUnderline: '下划线',
    ttSnippets: '插入片段 (Ctrl+/)',
    snippetsLabel: '片段',
    ttCommandPalette: '命令面板 (Ctrl+K)',
    ttPreview: '切换预览 (Ctrl+P)',

    tabPreview: '预览',
    tabErrors: '错误',
    tabWarnings: '警告',
    tabLog: '日志',
    savePdf: '保存 PDF',
    ttSavePdf: '保存 PDF',
    downloadBbl: '下载 BBL',
    ttDownloadBbl: '下载 BBL',
    noErrors: '无错误',
    noWarnings: '无警告',
    noLogYet: '尚无编译日志',
    linePrefix: '行',

    welcomeTitle: '欢迎使用 TeXbrain',
    welcomeDesc: '打开工程文件夹或新建工程以开始',
    newProject: '新建工程',
    welcomeOpenFolder: '打开文件夹',
    cloneRepository: '克隆仓库',
    builtInBibtex: '内置 BibTeX 示例',
    ttBuiltInBibtex: '构建时打包的同源 zip，任意静态站可用，无需 GitHub 或 CORS',
    cloneTitle: '克隆仓库',
    cloneDesc: '克隆 Git 仓库并作为工程打开',
    labelRepoUrl: '仓库地址',
    clonePresetExamples: '使用官方 TeXbrain 仓库（中英 BibTeX 示例）',
    labelProjectName: '工程名称',
    cloneExamplesOnly: '仅下载 examples/（GitHub zip，体积更小，无 git 历史）',
    cloning: '克隆中…',
    chooseLocationClone: '选择位置并克隆',
    back: '返回',
    cloneHint:
      '请选择保存工程的文件夹。完整 git 克隆使用 Git → 远程 中的 CORS 代理；仅 examples/ 时通过同一代理下载 GitHub zip。',
    promptFolderName: '工程文件夹名称：',

    toastExportNoFile: '导出失败：没有活动文件',
    toastExportNoProject: '导出失败：没有工程句柄',
    toastExported: '已导出 {name}',
    toastExportFailed: '导出失败：{msg}',
    toastCollabStarted: '协作已开始！',
    toastCollabJoined: '已加入协作会话！',
    toastCloneCors:
      '网络/CORS 被拦截。本地请使用 pnpm dev 或 pnpm preview（zip 走内置代理）。静态部署请在 Git → 远程 设置 CORS 代理为 https://cors.isomorphic-git.org 或使用完整 git 克隆。',
    toastCloneFailed: '克隆失败：{msg}',

    statusCompiling: '编译中',
    statusReady: '就绪',
    statusError: '错误',
    statusIdle: '空闲',
    statusChars: '字符',
    statusWords: '词',
    statusUtf8: 'UTF-8',
    statusLatex: 'LaTeX',
    statusCredit: '用',
    statusLineCol: '第 {line} 行，第 {col} 列',

    collabPanelTitle: '协作',
    collabClose: '关闭',
    yourName: '显示名称',
    namePlaceholder: '输入你的名字',
    connected: '已连接',
    connecting: '连接中…',
    shareCode: '分享码',
    copyShareCode: '复制分享码',
    shareHintEncrypt: '端到端加密。分享码内含密钥，请只发给信任的人。',
    password: '密码',
    passwordShareHint: '协作者也需要此密码。建议与分享码分开告知以提高安全性。',
    collaborators: '协作者',
    waitingPeers: '等待其他人加入…',
    leaveSession: '离开会话',
    startSession: '开始会话',
    createPasswordLabel: '密码',
    createPasswordOpt: '（可选，额外安全）',
    createPwPlaceholder: '要求加入者输入密码',
    starting: '正在开始…',
    startCollab: '开始协作',
    startHintEncrypt:
      '所有会话均为端到端加密。设置密码相当于第二因素，协作者需要同时掌握分享码与密码。',
    or: '或',
    joinSession: '加入会话',
    labelShareCode: '分享码',
    pasteCodePlaceholder: '粘贴分享码',
    joinPasswordLabel: '密码',
    joinPasswordOpt: '（若需要）',
    roomPwPlaceholder: '房间密码',
    joining: '加入中…',
    joinBtn: '加入会话',
    toastNameFirst: '请先填写显示名称',
    toastPasteCode: '请粘贴分享码',
    toastInvalidCode: '分享码格式无效',
    toastCreateFailed: '创建房间失败：{msg}',
    toastJoinFailed: '加入房间失败：{msg}',
    toastLeftSession: '已离开协作会话',
    toastCodeCopied: '已复制分享码！',
    unknownError: '未知错误'
  }
};
