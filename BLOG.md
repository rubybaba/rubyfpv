# 当前文章系统

正式文章使用已确认的 Editorial Magazine 样式，编辑 `content/editorial/*.md`，详见 `EDITORIAL.md`。`draft: false` 发布，`draft: true` 仅本地预览。运行 `npm run build` 生成 Vercel 发布目录 `dist/`。

以下保留早期粉色参考版本的操作记录；`content/posts/visual-check.md` 仍为草稿，不进入正式网站。

# RubyFPV Blog

独立静态文章模块。首页保留原文件和功能，只增加 `/blog/` 导航链接。

## 本地开发

需要 Node.js 22 或更新版本。

```bash
npm ci --ignore-scripts
npm run dev
```

访问 `http://127.0.0.1:4173/blog/`。本地服务仅绑定本机，包含草稿，页面标记 `noindex`，文件变化后重新构建，刷新浏览器查看。

## 写文章

在 `content/posts/` 新增一个 `.md` 文件，使用以下字段。日期须加引号。文件名即 URL，也可设置小写英文 `slug`。重复标题会获得不同的目录锚点。

```yaml
---
title: '我的第一篇文章'
description: '用于文章摘要、搜索结果和分享卡片。'
date: '2026-10-13'
category: '视频创作'
author: 'Ruby'
draft: true
cover:
  src: '/blog/media/my-cover.jpg'
  alt: '封面中的具体内容'
  caption: '可选图片说明'
---
```

正文从 `##` 开始；`##` 和 `###` 自动进入顶部折叠目录。支持 Markdown 引用、列表、表格、代码块和链接；原始 HTML 不执行。标题内 `*强调*` 显示为主题粉色。

图片保存在 `content/assets/`，文章路径使用 `/blog/media/文件名`。独立图片采用参考页的居中 340px / 9:16 排列；同一段落放多张 Markdown 图片会生成桌面三列、768px 以下单列的图片组。Markdown 图片的 title 可用作说明：

```markdown
![图片内容](/blog/media/photo.jpg "图片说明")

> [!NOTE]
> 这是一段提示信息。
```

## 构建与 SEO

`npm run build` 生成 `dist/`，排除 `draft: true` 和所有 `content/preview-assets/` 内容。`npm run build:preview` 包含草稿，供本地审阅。`npm test` 检查目录、输入校验、SEO、分类路由、草稿排除和首页隔离。

文章内容、分类页面、canonical、Open Graph、BlogPosting JSON-LD、sitemap.xml 与 robots.txt 都在构建时生成，不依赖浏览器 JavaScript。站点地址默认沿用仓库公开地址 `https://rubyfpv.vercel.app`，可通过 `SITE_URL` 覆盖。

仓库内新增的 `vercel.json` 声明构建命令 `npm run build`、输出目录 `dist`。正式发布前，在得到视觉确认后，将实际文章设为 `draft: false` 并使用自己的配图。测试稿引用预览素材时，构建器会阻止将其设为公开文章。本次工作没有修改远程托管配置，没有提交、推送或部署。

## 样式与素材

`blog/theme.css` 只由 Blog 页面加载。主题变量集中在文件顶部，参考尺寸与颜色分开管理。字体按参考页面实际 Google Fonts 文件本地保存，许可证位于 `blog/fonts/*-OFL.txt`。

测试文章里的图片来自唯一视觉参考 `https://guides.tenfoldmarketing.com/video-edit`，仅供本地版式核对；保存在 `content/preview-assets/`，不进入正式构建。请勿把测试稿直接设为公开文章；发布前替换为自己的配图。

中文使用系统字体回退：苹方 SC → Noto Sans CJK SC → 微软雅黑。不同系统的中文字体字形与实际字重可能不同。
