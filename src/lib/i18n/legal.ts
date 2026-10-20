import type { AppLocale } from './locale';

export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalPageCopy = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  title: string;
  updated?: string;
  sections: LegalSection[];
};

export type LegalCopy = {
  privacy: LegalPageCopy;
  terms: LegalPageCopy;
  imprint: LegalPageCopy;
  backHome: string;
};

export const legalCopy: Record<AppLocale, LegalCopy> = {
  en: {
    backHome: '← Back to TeXbrain',
    privacy: {
      metaTitle: 'Privacy Policy | TeXbrain',
      metaDescription:
        'TeXbrain privacy policy. Your files stay on your machine, nothing is uploaded to any server.',
      ogTitle: 'Privacy Policy | TeXbrain',
      title: 'Privacy Policy',
      updated: 'Last updated: October 20, 2026',
      sections: [
        {
          heading: 'Overview',
          body: 'This site is vanabel’s maintained fork of TeXbrain, a browser-based LaTeX editor originally created by Braian Plaku. Your documents are processed entirely on your device. We do not collect, store, or transmit your documents or personal data to any server.'
        },
        {
          heading: 'Data Storage',
          body: "TeXbrain uses your browser's local storage mechanisms (localStorage and IndexedDB) to cache TeX Live packages for faster compilation. This data never leaves your browser and can be cleared at any time through your browser settings."
        },
        {
          heading: 'Files',
          body: "When you open a project folder, TeXbrain accesses files through the browser's File System Access API. Files are read into memory for editing and compilation. No file data is uploaded to external servers."
        },
        {
          heading: 'Collaboration',
          body: "The real-time collaboration feature uses peer-to-peer WebRTC connections. Document content is transmitted directly between collaborators' browsers. No document data passes through our infrastructure."
        },
        {
          heading: 'Analytics',
          body: 'We do not use tracking scripts, analytics services, or advertising networks.'
        },
        {
          heading: 'Third-Party Services',
          body: "TeXbrain loads fonts from Google Fonts during page load. Google's privacy policy applies to that request. No other third-party services are used."
        },
        {
          heading: 'Cookies',
          body: 'TeXbrain does not use cookies. Theme and editor preferences are stored in localStorage.'
        },
        {
          heading: 'Changes',
          body: 'We may update this policy from time to time. Changes will be reflected on this page with an updated date.'
        },
        {
          heading: 'Contact',
          body: 'For questions about this policy, contact us via'
        }
      ]
    },
    terms: {
      metaTitle: 'Terms of Service | TeXbrain',
      metaDescription:
        'TeXbrain terms of service. What you can expect from us and what we ask of you.',
      ogTitle: 'Terms of Service | TeXbrain',
      title: 'Terms of Service',
      updated: 'Last updated: October 20, 2026',
      sections: [
        {
          heading: 'Acceptance',
          body: 'By using TeXbrain you agree to these terms. If you do not agree, please do not use the service.'
        },
        {
          heading: 'Description of Service',
          body: 'This site offers a free, browser-based LaTeX editor that compiles documents locally on your device. It is a fork of TeXbrain maintained by vanabel; the original project was created by Braian Plaku. The service is provided as-is without guarantees of availability or uptime.'
        },
        {
          heading: 'User Responsibilities',
          body: 'You are solely responsible for the content you create, edit, or share using TeXbrain. You agree not to use the service for any unlawful purpose.'
        },
        {
          heading: 'Intellectual Property',
          body: 'You retain full ownership of all documents and content you create with TeXbrain.'
        },
        {
          heading: 'Disclaimer of Warranties',
          body: 'TeXbrain is provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.'
        },
        {
          heading: 'Limitation of Liability',
          body: 'To the fullest extent permitted by law, TeXbrain and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or revenue, whether incurred directly or indirectly, arising from your use of the service.'
        },
        {
          heading: 'Data Loss',
          body: 'Since TeXbrain operates entirely in your browser, you are responsible for saving and backing up your work. We are not liable for any data loss resulting from browser crashes, cache clearing, or other local issues.'
        },
        {
          heading: 'Changes',
          body: 'We reserve the right to modify these terms at any time. Continued use of TeXbrain after changes constitutes acceptance of the updated terms.'
        },
        {
          heading: 'Contact',
          body: 'For questions about these terms, contact us via'
        }
      ]
    },
    imprint: {
      metaTitle: 'Imprint | TeXbrain',
      metaDescription:
        'Legal notice for this TeXbrain fork, maintained by vanabel. Original project by Braian Plaku.',
      ogTitle: 'Imprint | TeXbrain',
      title: 'Imprint',
      updated: 'Last updated: October 20, 2026',
      sections: [
        {
          heading: 'Overview',
          body: 'This site is a fork of TeXbrain maintained by vanabel. The original project was created by Braian Plaku.'
        },
        {
          heading: 'Maintainer',
          body: 'vanabel'
        },
        {
          heading: 'Original author',
          body: 'Braian Plaku'
        },
        {
          heading: 'Contact',
          body: 'GitHub: '
        },
        {
          heading: 'Liability for Content',
          body: 'The contents of this website have been created with the utmost care. However, we cannot guarantee the accuracy, completeness, or timeliness of the content. As a service provider, we are responsible for our own content on these pages under general law. However, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.'
        },
        {
          heading: 'Liability for Links',
          body: 'This website contains links to external third-party websites over whose content we have no influence. Therefore, we cannot accept any liability for this external content. The respective provider or operator of the pages is always responsible for the content of the linked pages.'
        }
      ]
    }
  },
  zh: {
    backHome: '← 返回 TeXbrain',
    privacy: {
      metaTitle: '隐私政策 | TeXbrain',
      metaDescription: 'TeXbrain 隐私政策。文件留在本机，不会上传到任何服务器。',
      ogTitle: '隐私政策 | TeXbrain',
      title: '隐私政策',
      updated: '最后更新：2026 年 10 月 20 日',
      sections: [
        {
          heading: '概述',
          body: '本站是 vanabel 维护的 TeXbrain 分支。TeXbrain 原由 Braian Plaku 创建，是一款基于浏览器的 LaTeX 编辑器。文档全部在你的设备上处理。我们不会收集、存储或将你的文档或个人数据传输到任何服务器。'
        },
        {
          heading: '数据存储',
          body: 'TeXbrain 使用浏览器本地存储（localStorage 与 IndexedDB）缓存 TeX Live 宏包以加快编译。这些数据不会离开浏览器，可随时在浏览器设置中清除。'
        },
        {
          heading: '文件',
          body: '打开项目文件夹时，TeXbrain 通过浏览器的 File System Access API 访问文件。文件读入内存用于编辑与编译，不会上传到外部服务器。'
        },
        {
          heading: '协作',
          body: '实时协作使用点对点 WebRTC 连接。文档内容直接在协作者浏览器之间传输，不会经过我们的基础设施。'
        },
        {
          heading: '分析统计',
          body: '我们不使用跟踪脚本、分析服务或广告网络。'
        },
        {
          heading: '第三方服务',
          body: '页面加载时 TeXbrain 会从 Google Fonts 拉取字体，该请求适用 Google 的隐私政策。除此之外不使用其他第三方服务。'
        },
        {
          heading: 'Cookie',
          body: 'TeXbrain 不使用 Cookie。主题与编辑器偏好保存在 localStorage 中。'
        },
        {
          heading: '变更',
          body: '我们可能不时更新本政策。变更将体现在本页，并更新日期。'
        },
        {
          heading: '联系',
          body: '对本政策有疑问，请通过'
        }
      ]
    },
    terms: {
      metaTitle: '服务条款 | TeXbrain',
      metaDescription: 'TeXbrain 服务条款。你可以期待什么，以及我们对你的要求。',
      ogTitle: '服务条款 | TeXbrain',
      title: '服务条款',
      updated: '最后更新：2026 年 10 月 20 日',
      sections: [
        {
          heading: '接受条款',
          body: '使用 TeXbrain 即表示你同意本条款。若不同意，请勿使用本服务。'
        },
        {
          heading: '服务说明',
          body: '本站提供免费的浏览器端 LaTeX 编辑器，在本地设备上编译文档。它是 vanabel 维护的 TeXbrain 分支，原项目由 Braian Plaku 创建。服务按现状提供，不保证可用性或在线时间。'
        },
        {
          heading: '用户责任',
          body: '你对使用 TeXbrain 创建、编辑或分享的内容负全部责任。你同意不将本服务用于任何非法目的。'
        },
        {
          heading: '知识产权',
          body: '你用 TeXbrain 创建的文档与内容归你所有。'
        },
        {
          heading: '免责声明',
          body: 'TeXbrain 按「现状」和「可用」提供，不作任何明示或暗示保证，包括但不限于适销性、特定用途适用性或不侵权的暗示保证。'
        },
        {
          heading: '责任限制',
          body: '在法律允许的最大范围内，TeXbrain 及其贡献者不对因使用本服务而产生的任何间接、附带、特殊、后果性或惩罚性损害，或任何数据、利润或收入损失承担责任，无论直接或间接。'
        },
        {
          heading: '数据丢失',
          body: '由于 TeXbrain 完全在浏览器中运行，你需自行保存与备份。因浏览器崩溃、清除缓存或其他本地问题导致的数据丢失，我们不承担责任。'
        },
        {
          heading: '变更',
          body: '我们保留随时修改本条款的权利。变更后继续使用 TeXbrain 即视为接受更新后的条款。'
        },
        {
          heading: '联系',
          body: '对本条款有疑问，请通过'
        }
      ]
    },
    imprint: {
      metaTitle: '法律信息 | TeXbrain',
      metaDescription: '本 TeXbrain 分支的法律声明。由 vanabel 维护，原项目作者为 Braian Plaku。',
      ogTitle: '法律信息 | TeXbrain',
      title: '法律信息',
      updated: '最后更新：2026 年 10 月 20 日',
      sections: [
        {
          heading: '概述',
          body: '本站是 vanabel 维护的 TeXbrain 分支，原项目由 Braian Plaku 创建。'
        },
        {
          heading: '本站维护者',
          body: 'vanabel'
        },
        {
          heading: '原作者',
          body: 'Braian Plaku'
        },
        {
          heading: '联系方式',
          body: 'GitHub：'
        },
        {
          heading: '内容责任',
          body: '本网站内容已尽最大注意编制。但我们无法保证内容的准确性、完整性或时效性。作为服务提供方，我们依法对本站自有内容负责；但无义务监控传输或存储的第三方信息，亦无义务调查可能表明违法活动的情形。'
        },
        {
          heading: '链接责任',
          body: '本网站包含指向外部第三方网站的链接，我们对其内容无影响力，因此不对该外部内容承担责任。链接页面的内容始终由相应提供方或运营方负责。'
        }
      ]
    }
  }
};
