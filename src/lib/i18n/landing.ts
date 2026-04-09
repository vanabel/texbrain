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
    features: { title: string; body: string }[];
    footerPrivacy: string;
    footerTerms: string;
    footerImprint: string;
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
      'Local file system access'
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
        title: 'Compiles in your browser',
        body: 'A full pdfTeX engine compiled to WebAssembly. Your .tex files turn into PDFs right here, no server involved.'
      },
      {
        title: 'Live PDF preview',
        body: 'The PDF updates while you type. Zoom, scroll, click links. Multiple pages render side by side.'
      },
      {
        title: 'Git built in',
        body: 'Clone repos, make branches, commit, and push to GitHub without leaving the editor. Version control that just works.'
      },
      {
        title: 'Your files stay local',
        body: 'Open project folders straight from your file system. Nothing gets uploaded anywhere unless you push it yourself.'
      },
      {
        title: 'Collaborate live',
        body: 'Share a join code and edit the same project together. Peer-to-peer; no account on either side.'
      },
      {
        title: 'Works offline',
        body: 'Once loaded, the whole thing runs locally. You can keep writing on a plane or anywhere else without internet.'
      }
    ],
    footerPrivacy: 'Privacy',
    footerTerms: 'Terms',
    footerImprint: 'Imprint'
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
      '本地文件系统访问'
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
        title: '在浏览器中编译',
        body: '完整的 pdfTeX 引擎以 WebAssembly 运行。你的 .tex 在此直接变为 PDF，不经服务器处理。'
      },
      {
        title: '实时 PDF 预览',
        body: '输入时 PDF 随之更新。可缩放、滚动、点击链接，多页并排显示。'
      },
      {
        title: '内置 Git',
        body: '克隆仓库、建分支、提交并推送到 GitHub，无需离开编辑器，版本控制顺手完成。'
      },
      {
        title: '文件留在本地',
        body: '直接从本机文件系统打开项目文件夹。除非你自行推送，否则内容不会上传到别处。'
      },
      {
        title: '实时协作',
        body: '把加入码发给对方，即可共同编辑同一工程。点对点连接，双方都不需要注册账号。'
      },
      {
        title: '离线可用',
        body: '页面加载后整体在本地运行。在飞机上或没有网络时也可以继续写作。'
      }
    ],
    footerPrivacy: '隐私',
    footerTerms: '条款',
    footerImprint: '法律信息'
  }
};
