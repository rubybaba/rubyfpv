import { readFile, readdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { parsePost, renderArticle, escape as e, md, categoryPath } from './content.mjs';

const palettes = ['sage','orange','brown','yellow','red'];
function toolbar(article=false) {
 return `<header class="preview-bar"><a class="masthead" href="${article?'/blog/':'/'}">RUBYFPV<span class="edition">/ EDITORIAL</span></a>${article?'<a href="/blog/">← 全部文章</a>':'<nav class="browse-controls" aria-label="横向浏览文章"><button type="button" data-previous aria-label="上一篇文章">←</button><span data-position>1 / 5</span><button type="button" data-next aria-label="下一篇文章">→</button></nav>'}</header>`;
}
function page(title,description,body,{article=false,post,origin,preview=false,path='/blog/'}={}) {
 const canonical=origin+path;
 const schema=post?`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.description,datePublished:post.date,dateModified:post.updated||post.date,author:{'@type':'Person',name:post.author},inLanguage:post.lang||'zh-CN',articleSection:post.category,mainEntityOfPage:canonical,image:origin+post.cover.src}).replace(/</g,'\\u003c')}</script>`:'';
 return `<!doctype html><html lang="zh-CN" data-style="reference-match"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${preview||post?.draft?'noindex,nofollow':'index,follow'}"><link rel="canonical" href="${e(canonical)}"><title>${e(title)} · RubyFPV Editorial</title><meta name="description" content="${e(description)}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:type" content="${article?'article':'website'}"><meta name="twitter:card" content="${post?'summary_large_image':'summary'}">${post?`<meta property="og:image" content="${e(origin+post.cover.src)}"><meta property="og:image:alt" content="${e(post.cover.alt)}">`:''}<link rel="stylesheet" href="/blog/editorial.css"><link rel="preload" href="/blog/fonts/stix-two-text-regular.woff2" as="font" type="font/woff2" crossorigin><script src="/blog/editorial.js" defer></script>${schema}</head><body class="${article?'reading-page':'magazine-page'}" ${post?`data-palette="${post.palette}"`:""}><a class="skip" href="#main">跳到正文</a>${toolbar(article)}${body}</body></html>`;
}
function figure(post) {
 return `<figure><img src="${e(post.cover.src)}" alt="${e(post.cover.alt)}" width="1200" height="800"><figcaption>${md.renderInline(post.credit)}</figcaption></figure>`;
}
export async function buildEditorial({root,save,staging,origin,includeDrafts=false}) {
 const files=(await readdir(join(root,'content/editorial'))).filter(f=>f.endsWith('.md')).sort();
 const all=await Promise.all(files.map(async f=>parsePost(await readFile(join(root,'content/editorial',f),'utf8'),f)));
 if(new Set(all.map(p=>p.slug)).size!==all.length) throw new Error('Duplicate editorial slug');
 const posts=all.filter(post=>includeDrafts||!post.draft);
 const categories=[...new Set(posts.map(p=>p.category))];
 if(new Set(categories.map(categoryPath)).size!==categories.length) throw new Error('Duplicate editorial category URL');
 for (const post of posts) if (!palettes.includes(post.palette)) throw new Error(`Invalid article palette: ${post.slug}`);
 await cp(join(root,'content/editorial-media'),join(staging,'blog/media/editorial'),{recursive:true});
 const columns=selected=>selected.map((post,i)=>`<article class="story-column" data-palette="${post.palette}" tabindex="0" aria-label="文章 ${i+1}：${e(post.title)}"><header class="story-header"><h2 class="story-heading" lang="${post.lang||'en'}"><a href="/blog/stories/${post.slug}/">${e(post.displayTitle||post.title)}</a></h2><p class="story-meta"><a href="${categoryPath(post.category)}">${e(post.category)}</a>, ${post.date.slice(0,4)}</p></header><div class="story-body">${post.imageFirst?figure(post):''}<p lang="${post.lang||'en'}">${e(post.description)}</p>${!post.imageFirst?figure(post):''}<p lang="zh-CN">${e(post.excerpt)}</p><h3>Field notes</h3><p lang="zh-CN">${e(post.note)}</p><blockquote>${e(post.quote)}</blockquote><a class="story-end" href="/blog/stories/${post.slug}/">阅读全文 / READ STORY →</a></div></article>`).join('');
 for(const category of [null,...categories]) {
  const path=category?categoryPath(category):'/blog/';
  const title=category||'影像、旅途与日常';
  const selected=category?posts.filter(p=>p.category===category):posts;
  const body=`<h1 class="sr-only">RubyFPV Editorial — ${e(title)}</h1><main id="main" class="magazine" aria-label="文章长列；列内上下滚动，左右键切换文章">${columns(selected)||'<p>文章正在准备中。</p>'}</main>`;
  await save(`${decodeURIComponent(path.slice(1))}index.html`,page(title,'关于观看与创作的笔记，每篇有自己的颜色。',body,{origin,preview:includeDrafts,path}));
 }
 for (const [i,post] of posts.entries()) {
  const {html,headings}=renderArticle(post.content);
  const video=post.video?`<figure><video controls playsinline preload="metadata" poster="${e(post.cover.src)}" aria-label="配图动态播放测试"><source src="/blog/media/editorial/motion-test.mp4" type="video/mp4"></video><figcaption>动态媒体测试 · 山景配图的 4 秒缓慢移动，无音轨。</figcaption></figure>`:'';
  const next=posts[(i+1)%posts.length];
  const body=`<main id="main"><header class="reading-top"><p class="story-meta">${e(post.category)} / ${post.date.slice(0,4)} / RUBYFPV</p><h1>${e(post.title)}</h1><p class="reading-deck">${e(post.description)}</p></header><div class="reading-layout"><article class="reading-copy">${html}</article><aside class="reading-media" aria-label="图片与文章目录">${figure(post)}${video}<details open><summary>CONTENTS / 文章目录</summary><ol>${headings.map(h=>`<li><a href="#${encodeURIComponent(h.id)}">${e(h.label)}</a></li>`).join('')}</ol></details></aside></div></main><footer class="reading-footer"><span>NEXT STORY</span><a href="/blog/stories/${next.slug}/">${e(next.displayTitle||next.title)} →</a></footer>`;
  await save(`blog/stories/${post.slug}/index.html`,page(post.title,post.description,body,{article:true,post,origin,preview:includeDrafts,path:`/blog/stories/${post.slug}/`}));
 }
 const published=posts.filter(p=>!p.draft);
 return [...published.map(p=>`/blog/stories/${p.slug}/`),...[...new Set(published.map(p=>p.category))].map(categoryPath)];
}
