import MarkdownIt from 'markdown-it';
import { parse as parseYaml } from 'yaml';

export const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const slugify = value => String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
export const categoryPath = name => `/blog/category/${encodeURIComponent(slugify(name))}/`;
export const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

export function parsePost(source, filename) {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: Markdown requires YAML frontmatter.`);
  const data = parseYaml(match[1], { maxAliasCount: 50 });
  const content = match[2];
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${filename}: invalid frontmatter.`);
  for (const field of ['title', 'description', 'date', 'category']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${filename}: ${field} must be a nonempty string (quote dates).`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) throw new Error(`${filename}: invalid date.`);
  const slug = data.slug ?? filename.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${filename}: use a lowercase URL slug.`);
  if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error(`${filename}: draft must be a boolean.`);
  if (data.cover && (!/^\/blog\/media\/[a-zA-Z0-9/_ .-]+$/.test(data.cover.src) || data.cover.src.includes('..') || typeof data.cover.alt !== 'string' || !data.cover.alt.trim())) throw new Error(`${filename}: cover requires a local media src and descriptive alt.`);
  return { ...data, slug, content, author: data.author || 'Ruby', url: `/blog/${slug}/` };
}

export function renderArticle(content) {
  const tokens = md.parse(content, {});
  const headings = [];
  const used = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'heading_open') continue;
    if (token.tag === 'h1') throw new Error('Use the frontmatter title for H1; article headings start with ##.');
    const label = tokens[i + 1].children.filter(t => ['text', 'code_inline'].includes(t.type)).map(t => t.content).join('');
    const base = slugify(label);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    token.attrSet('id', id);
    if (['h2', 'h3'].includes(token.tag)) headings.push({ id, label, level: token.tag.slice(1) });
  }
  // Standalone Markdown images follow the source's centered portrait treatment.
  // Three images in one paragraph use the measured three-column / mobile stack.
  for (let i = 0; i < tokens.length - 2; i++) {
    if (tokens[i].type !== 'paragraph_open' || tokens[i + 1].type !== 'inline') continue;
    const children = tokens[i + 1].children;
    const images = children.filter(t => t.type === 'image');
    if (!images.length || children.some(t => t.type !== 'image' && !['softbreak', 'hardbreak'].includes(t.type) && t.content.trim())) continue;
    const figures = images.map(t => `<figure class="media"><img src="${escape(t.attrGet('src'))}" alt="${escape(t.content)}" loading="lazy" width="720" height="1280">${t.attrGet('title') ? `<figcaption>${escape(t.attrGet('title'))}</figcaption>` : ''}</figure>`).join('');
    const replacement = new tokens[i].constructor('html_block', '', 0);
    replacement.content = images.length > 1 ? `<div class="look-grid">${figures}</div>` : figures;
    tokens.splice(i, 3, replacement);
  }
  const sections = [];
  let chunk = [];
  for (const token of tokens) {
    if (token.type === 'heading_open' && token.tag === 'h2' && token.level === 0 && chunk.length) {
      sections.push(chunk); chunk = [];
    }
    chunk.push(token);
  }
  if (chunk.length) sections.push(chunk);
  let html = sections.map(section => `<section class="article-section">${md.renderer.render(section, md.options, {})}</section>`).join('\n');
  // A Markdown quote beginning with [!NOTE] is the supported callout syntax.
  html = html.replace(/<blockquote>\s*<p>\[!NOTE\]\s*/g, '<blockquote role="note"><span class="callout-label">提示</span><p>');
  return { html, headings };
}
