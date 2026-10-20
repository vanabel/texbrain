import type { AppLocale } from './locale';

/** @deprecated Use AppLocale from `$lib/i18n/locale` */
export type LandingLocale = AppLocale;

export const landingCopy: Record<
  AppLocale,
  {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    twitterTitle: string;
    twitterDescription: string;
    jsonLdDescription: string;
    jsonLdFeatureList: string[];
    navOpenEditor: string;
    langSwitchLabel: string;
    heroLine1: string;
    heroAccent: string;
    heroDesc: string;
    heroCta: string;
    pills: string[];
    demoFilename: string;
    demoPreviewLabel: string;
    demoTexTitle: string;
    demoTexAuthor: string;
    demoTexSection: string;
    demoTexHello: string;
    featuresHeading: string;
    features: { title: string; body: string; points?: string[] }[];
    footerPrivacy: string;
    footerTerms: string;
    footerImprint: string;
    /** Label before the short git SHA in the footer (e.g. “Build”). */
    footerBuildLabel: string;
    /** `title` on the commit link. */
    footerBuildLinkTitle: string;
  }
> = {
  en: {
    metaTitle: 'TeXbrain | LaTeX Editor in Your Browser',
    metaDescription:
      'Write and compile LaTeX to PDF entirely in your browser. No sign-up, no installs, no server. Local files, live preview, built-in git, and real-time collaboration.',
    ogTitle: 'TeXbrain | LaTeX Editor in Your Browser',
    ogDescription:
      'Write and compile LaTeX to PDF entirely in your browser. No sign-up, no installs, no server.',
    twitterTitle: 'TeXbrain | LaTeX Editor in Your Browser',
    twitterDescription:
      'Write and compile LaTeX to PDF entirely in your browser. No sign-up, no installs, no server.',
    jsonLdDescription:
      'Online LaTeX editor that compiles to PDF entirely in your browser. No accounts, no installs, no servers.',
    jsonLdFeatureList: [
      'Browser-based LaTeX compilation',
      'Live PDF preview',
      'Built-in git integration',
      'Real-time collaboration',
      'Works offline',
      'Local file system access',
      'Math and environment completion, snippet jumps, and optional Vim mode'
    ],
    navOpenEditor: 'Open Editor',
    langSwitchLabel: 'Language',
    heroLine1: 'Write LaTeX',
    heroAccent: 'without the baggage.',
    heroDesc:
      'A LaTeX editor that compiles to PDF entirely in your browser. No accounts, no installs, no servers.',
    heroCta: 'Open Editor',
    pills: ['local files', 'live preview', 'collaboration', 'built-in git', 'works offline'],
    demoFilename: 'article.tex',
    demoPreviewLabel: 'preview',
    demoTexTitle: 'My First Document',
    demoTexAuthor: 'Braian Plaku',
    demoTexSection: 'Introduction',
    demoTexHello: 'Hello, world! This is ',
    featuresHeading: 'What you get',
    features: [
      {
        title: 'Completions as you type',
        body: 'The cursor is already inside the formula.',
        points: [
          '`\\[` `\\(` `$$` `\\begin` close around the cursor',
          '`Ctrl+J` next field, `Ctrl+K` previous field',
          '`\\cites` completes keys; commands follow mathpaper',
          'Backtick maps in math; Vim mode from the toolbar'
        ]
      },
      {
        title: 'Compiles in your browser',
        body: 'pdfTeX turns .tex into PDF on this machine.'
      },
      {
        title: 'Live PDF preview',
        body: 'See the PDF as you write. Zoom, page, and follow links.'
      },
      {
        title: 'Git built in',
        body: 'Clone, branch, commit, and push without leaving the tab.'
      },
      {
        title: 'Your files stay local',
        body: 'Open a folder on disk. Nothing is uploaded unless you push.'
      },
      {
        title: 'Collaborate live',
        body: 'A join code is enough. No account on either side.'
      },
      {
        title: 'Works offline',
        body: 'After the page loads, writing continues without a network.'
      }
    ],
    footerPrivacy: 'Privacy',
    footerTerms: 'Terms',
    footerImprint: 'Imprint',
    footerBuildLabel: 'Build',
    footerBuildLinkTitle: 'This commit on GitHub'
  },
  zh: {
    metaTitle: 'TeXbrain | 浏览器里的 LaTeX 编辑器',
    metaDescription:
      '在浏览器中编写 LaTeX 并编译为 PDF。无需注册、无需安装、无需自有服务器。本地文件、实时预览、内置 Git、实时协作。',
    ogTitle: 'TeXbrain | 浏览器里的 LaTeX 编辑器',
    ogDescription: '在浏览器中编写 LaTeX 并编译为 PDF。无需注册、无需安装、无需自有服务器。',
    twitterTitle: 'TeXbrain | 浏览器里的 LaTeX 编辑器',
    twitterDescription: '在浏览器中编写 LaTeX 并编译为 PDF。无需注册、无需安装、无需自有服务器。',
    jsonLdDescription:
      '在浏览器中将 LaTeX 编译为 PDF 的在线编辑器。无需账号、无需安装、无需服务器。',
    jsonLdFeatureList: [
      '浏览器内 LaTeX 编译',
      '实时 PDF 预览',
      '内置 Git',
      '实时协作',
      '离线可用',
      '本地文件系统访问',
      '数学与环境补全、片段跳转和可选 Vim 模式'
    ],
    navOpenEditor: '打开编辑器',
    langSwitchLabel: '语言',
    heroLine1: '在浏览器里写 LaTeX',
    heroAccent: '轻装上阵。',
    heroDesc: '一款在浏览器中将 LaTeX 编译为 PDF 的编辑器。无需账号、无需安装、无需自有服务器。',
    heroCta: '打开编辑器',
    pills: ['本地文件', '实时预览', '协作', '内置 Git', '离线可用'],
    demoFilename: 'article.tex',
    demoPreviewLabel: '预览',
    demoTexTitle: '我的第一篇文档',
    demoTexAuthor: 'Braian Plaku',
    demoTexSection: '引言',
    demoTexHello: '你好，世界！这里是 ',
    featuresHeading: '你能获得什么',
    features: [
      {
        title: '边写边补全',
        body: '公式写到一半，光标已经在里面。',
        points: [
          '`\\[` `\\(` `$$` `\\begin` 成对展开，光标留在中间',
          '`Ctrl+J` 下一字段，`Ctrl+K` 上一字段',
          '`\\cites` 补文献键；常用命令按 mathpaper',
          '数学区反引号映射；工具栏可开 Vim 模式'
        ]
      },
      {
        title: '在浏览器中编译',
        body: 'pdfTeX 在本机把 .tex 编成 PDF。'
      },
      {
        title: '实时 PDF 预览',
        body: '边写边看。可缩放、翻页、点链接。'
      },
      {
        title: '内置 Git',
        body: '克隆、分支、提交、推送，不离开这一页。'
      },
      {
        title: '文件留在本地',
        body: '打开本机文件夹。不推送，就不上传。'
      },
      {
        title: '实时协作',
        body: '用加入码同编，不用注册。'
      },
      {
        title: '离线可用',
        body: '加载之后，断网也能写。'
      }
    ],
    footerPrivacy: '隐私',
    footerTerms: '条款',
    footerImprint: '法律信息',
    footerBuildLabel: '构建',
    footerBuildLinkTitle: '在 GitHub 上查看该提交'
  }
};
