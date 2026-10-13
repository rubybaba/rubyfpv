import { mkdir, readFile, readdir, writeFile, cp, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escape as e, categoryPath, parsePost, renderArticle, md, slugify } from './content.mjs';
import { buildEditorial } from './editorial.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = (process.env.SITE_URL || 'https://rubyfpv.vercel.app').replace(/\/$/, '');
if (!/^https?:\/\//.test(origin)) throw new Error('SITE_URL must be an absolute HTTP(S) URL.');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const dateLabel = date => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

function navigation(headings = []) {
  return `<a class="skip" href="#main">跳到正文</a><nav class="blog-nav" aria-label="主导航"><a class="brand" href="/" aria-label="RubyFPV 首页">RUBYFPV</a><div class="nav-actions"><a href="/blog/">Blog</a>${headings.length ? `<details class="toc"><summary>目录</summary><div class="toc-panel" role="navigation" aria-label="文章目录"><ol>${headings.map(h => `<li class="level-${h.level}"><a href="#${encodeURIComponent(h.id)}">${e(h.label)}</a></li>`).join('')}</ol></div></details>` : ''}</div></nav>`;
}

function layout({ title, description, path, body, headings, schema, cover, draft = false, preview = false, articleDate }) {
  const canonical = `${origin}${path}`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)} · RubyFPV</title><meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(canonical)}"><meta name="robots" content="${draft || preview ? 'noindex,nofollow' : 'index,follow'}">
<meta property="og:type" content="${articleDate ? 'article' : 'website'}"><meta property="og:site_name" content="RubyFPV"><meta property="og:locale" content="zh_CN"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}">
<meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}">${cover ? `<meta property="og:image" content="${e(origin + cover.src)}"><meta property="og:image:alt" content="${e(cover.alt)}">` : ''}${articleDate ? `<meta property="article:published_time" content="${e(articleDate)}"><meta property="article:author" content="Ruby">` : ''}
<link rel="stylesheet" href="/blog/theme.css"><link rel="preload" href="/blog/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossorigin><script src="/blog/blog.js" defer></script>${schema ? `<script type="application/ld+json">${json(schema)}</script>` : ''}</head>
<body class="blog">${navigation(headings)}${body}<footer class="blog-footer">Built by <a href="/">RubyFPV</a> · 创作、探索与分享</footer></body></html>`;
}

function media(cover) {
  return cover ? `<figure class="media"><img src="${e(cover.src)}" alt="${e(cover.alt)}" width="720" height="1280" fetchpriority="high">${cover.caption ? `<figcaption>${e(cover.caption)}</figcaption>` : ''}</figure>` : '';
}

export async function build({ includeDrafts = false, output = join(root, 'dist') } = {}) {
  const files = (await readdir(join(root, 'content/posts'))).filter(file => file.endsWith('.md'));
  const all = await Promise.all(files.map(async file => parsePost(await readFile(join(root, 'content/posts', file), 'utf8'), file)));
  const slugs = new Set();
  for (const post of all) {
    if (slugs.has(post.slug) || ['category', 'fonts', 'media'].includes(post.slug)) throw new Error(`Duplicate or reserved slug: ${post.slug}`);
    if (!post.draft && (post.cover?.src.startsWith('/blog/media/preview/') || post.content.includes('/blog/media/preview/'))) throw new Error(`${post.slug}: replace local reference images before publishing.`);
    slugs.add(post.slug);
  }
  const posts = all.filter(post => includeDrafts || !post.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const categories = [...new Set(posts.map(post => post.category))];
  if (new Set(categories.map(slugify)).size !== categories.length) throw new Error('Category names produce duplicate URL slugs.');
  // Build in a staging directory; failed content validation never empties the live preview.
  const staging = `${output}.building`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  const save = async (path, content) => {
    const file = join(staging, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  await cp(join(root, 'index.html'), join(staging, 'index.html'));
  await cp(join(root, 'blog'), join(staging, 'blog'), { recursive: true });
  await cp(join(root, 'content/assets'), join(staging, 'blog/media'), { recursive: true });
  if (includeDrafts) await cp(join(root, 'content/preview-assets'), join(staging, 'blog/media/preview'), { recursive: true });

  for (const post of posts) {
    const { html, headings } = renderArticle(post.content);
    const schema = {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title.replace(/\*/g, ''),
      description: post.description, datePublished: post.date, dateModified: post.updated || post.date,
      author: { '@type': 'Person', name: post.author }, mainEntityOfPage: origin + post.url,
      inLanguage: 'zh-CN', articleSection: post.category,
      ...(post.cover ? { image: origin + post.cover.src } : {})
    };
    const body = `<main id="main"><header class="hero"><p class="meta"><time datetime="${post.date}">${dateLabel(post.date)}</time> · <a href="${categoryPath(post.category)}">${e(post.category)}</a>${post.draft ? ' · 本地预览' : ''}</p><h1>${md.renderInline(post.title)}</h1><p class="lead">${e(post.description)}</p>${media(post.cover)}</header><article class="article" aria-label="${e(post.title)}">${html}<aside class="related" aria-label="更多文章"><h2>继续阅读</h2><a class="resource-link" href="${categoryPath(post.category)}"><strong>${e(post.category)}</strong><span>查看同类文章</span> →</a><a class="resource-link" href="/blog/"><strong>全部文章</strong><span>RubyFPV Blog</span> →</a></aside><div class="community-cta"><p class="eyebrow">THE NEXT STEP</p><h2>把想法变成作品。<br>继续探索 RubyFPV。</h2><p>记录创作中的方法、工具和实践。下一次灵感，从这里开始。</p><a class="community-cta-btn" href="/">探索 RubyFPV <span aria-hidden="true">→</span></a></div></article></main>`;
    await save(`${post.url.slice(1)}index.html`, layout({ title: post.title.replace(/\*/g, ''), description: post.description, path: post.url, body, headings, schema, cover: post.cover, draft: post.draft, preview: includeDrafts, articleDate: post.date }));
  }

  for (const category of [null, ...categories]) {
    const path = category ? categoryPath(category) : '/blog/';
    const selected = category ? posts.filter(post => post.category === category) : posts;
    const title = category || '创作、工具与实践';
    const description = category ? `关于${category}的文章与实践记录。` : '从一个想法到一件作品。记录影像创作、AI 工具和自动化工作流中的具体方法。';
    const body = `<main id="main"><header class="hero"><p class="meta">RUBYFPV · BLOG</p><h1>${e(title)}</h1><p class="lead">${e(description)}</p></header><div class="blog-index"><nav class="categories" aria-label="文章分类"><a href="/blog/" ${!category ? 'aria-current="page"' : ''}>全部文章</a>${categories.map(c => `<a href="${categoryPath(c)}" ${c === category ? 'aria-current="page"' : ''}>${e(c)}</a>`).join('')}</nav>${selected.length ? selected.map(post => `<article class="post-card"><p class="meta"><time datetime="${post.date}">${dateLabel(post.date)}</time> · ${e(post.category)}${post.draft ? ' · 本地预览' : ''}</p><h2><a href="${post.url}">${md.renderInline(post.title)}</a></h2><p>${e(post.description)}</p><a href="${post.url}" aria-label="阅读：${e(post.title.replace(/\*/g, ''))}">${media(post.cover)}</a><a href="${post.url}">阅读全文 →</a></article>`).join('') : '<p>文章正在准备中，欢迎稍后回来。</p>'}</div></main>`;
    await save(`${decodeURIComponent(path.slice(1))}index.html`, layout({ title, description, path, body, preview: includeDrafts }));
  }
  const editorialUrls = await buildEditorial({ root, save, staging, origin, includeDrafts });
  const publicPosts = posts.filter(post => !post.draft);
  const publicCategories = [...new Set(publicPosts.map(post => post.category))];
  const urls = [...new Set(['/', '/blog/', ...publicPosts.map(post => post.url), ...publicCategories.map(categoryPath), ...editorialUrls])];
  await save('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${e(origin + path)}</loc></url>`).join('')}</urlset>`);
  await save('robots.txt', `User-agent: *\n${includeDrafts ? 'Disallow: /' : 'Allow: /'}\nSitemap: ${origin}/sitemap.xml\n`);
  await save('404.html', layout({ title: '页面未找到', description: '你访问的文章不存在。', path: '/404.html', draft: true, body: '<main id="main" class="hero"><p class="meta">404</p><h1>这篇文章还没出现。</h1><p class="lead"><a href="/blog/">返回 Blog →</a></p></main>' }));
  await rm(output, { recursive: true, force: true });
  const { rename } = await import('node:fs/promises');
  await rename(staging, output);
  console.log(`Built blog and editorial pages (${includeDrafts ? 'local preview; drafts included, noindex' : 'production; drafts excluded'}) → ${output}`);
  return { posts, output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build({ includeDrafts: process.argv.includes('--drafts') });
