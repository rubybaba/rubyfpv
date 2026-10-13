import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePost, renderArticle } from '../scripts/content.mjs';
import { build, root } from '../scripts/build.mjs';

test('Chinese headings have unique, stable anchors and raw HTML cannot execute', () => {
  const result = renderArticle('## 同一个标题\n\n正文\n\n## 同一个标题\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))');
  assert.deepEqual(result.headings.map(h => h.id), ['同一个标题', '同一个标题-2']);
  assert.ok(result.html.includes('&lt;script&gt;'));
  assert.ok(!result.html.includes('href="javascript:'));
  assert.throws(() => renderArticle('# Duplicate main title'), /frontmatter/);
});

test('Frontmatter rejects invalid dates, traversal slugs and nonboolean drafts', () => {
  const source = "---\ntitle: Test\ndescription: Description\ndate: '2026-10-13'\ncategory: 测试\ndraft: true\n---\n## Test";
  assert.equal(parsePost(source, 'test.md').draft, true);
  assert.throws(() => parsePost(source.replace('2026-10-13', '2026-02-31'), 'test.md'), /invalid date/);
  assert.throws(() => parsePost(source, '../escape.md'), /slug/);
  assert.throws(() => parsePost(source.replace('draft: true', "draft: 'false'"), 'test.md'), /boolean/);
});

test('A preview has static article SEO, category routes and local assets; a production build excludes test material', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'rubyfpv-blog-test-'));
  try {
    const preview = join(scratch, 'preview');
    const production = join(scratch, 'production');
    await build({ includeDrafts: true, output: preview });
    await build({ output: production });
    const article = await readFile(join(preview, 'blog/visual-check/index.html'), 'utf8');
    assert.ok(article.includes('name="robots" content="noindex,nofollow"'));
    assert.ok(article.includes('application/ld+json'));
    assert.ok(article.includes('rel="canonical" href="https://rubyfpv.vercel.app/blog/visual-check/"'));
    assert.ok(article.includes('<pre><code class="language-json">'));
    assert.ok(article.includes('class="look-grid"'));
    assert.ok(article.includes('role="note"'));
    await access(join(preview, 'blog/category/视频创作/index.html'));
    await access(join(preview, 'blog/media/preview/cover.jpg'));
    for (const match of article.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
      const path = decodeURIComponent(match[1]);
      await access(join(preview, path, path.endsWith('/') ? 'index.html' : ''));
    }
    await assert.rejects(access(join(production, 'blog/visual-check/index.html')));
    await assert.rejects(access(join(production, 'blog/media/preview')));
    assert.ok(!(await readFile(join(production, 'sitemap.xml'), 'utf8')).includes('visual-check'));
    const originalHome = await readFile(join(root, 'index.html'), 'utf8');
    assert.equal(await readFile(join(preview, 'index.html'), 'utf8'), originalHome);
    assert.ok(!originalHome.includes('/blog/theme.css'));
    const magazine = await readFile(join(preview, 'blog/index.html'), 'utf8');
    assert.equal((magazine.match(/class="story-column"/g) || []).length, 5);
    assert.equal((magazine.match(/data-palette=/g) || []).length, 5);
    assert.ok(!magazine.includes("data-set-theme"));
    for (const [slug,palette] of Object.entries({"chasing-the-quiet":"sage","time-for-landscapes":"orange","small-camera":"brown","between-mountains":"yellow","notes-on-looking":"red"})) {
      const detail = await readFile(join(preview, `blog/stories/${slug}/index.html`), "utf8");
      assert.ok(detail.includes(`data-palette="${palette}"`));
    }
    const story = await readFile(join(preview, 'blog/stories/small-camera/index.html'), 'utf8');
    assert.ok(story.includes('<video controls playsinline'));
    assert.ok(story.includes('name="robots" content="noindex,nofollow"'));
    assert.ok(story.includes('application/ld+json'));
    for (const match of story.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
      const path = decodeURIComponent(match[1]);
      await access(join(preview, path, path.endsWith('/') ? 'index.html' : ''));
    }
    const liveMagazine = await readFile(join(production, 'blog/index.html'), 'utf8');
    assert.equal((liveMagazine.match(/class="story-column"/g) || []).length, 5);
    assert.ok(liveMagazine.includes('name="robots" content="index,follow"'));
    const liveStory = await readFile(join(production, 'blog/stories/small-camera/index.html'), 'utf8');
    assert.ok(liveStory.includes('data-palette="brown"'));
    assert.ok(liveStory.includes('name="robots" content="index,follow"'));
    assert.ok(liveStory.includes('rel="canonical" href="https://rubyfpv.vercel.app/blog/stories/small-camera/"'));
    assert.ok(liveStory.includes('property="og:image"'));
    assert.ok((await readFile(join(production, 'sitemap.xml'), 'utf8')).includes('/blog/stories/small-camera/'));
    const category = await readFile(join(production, 'blog/category/image-making/index.html'), 'utf8');
    assert.equal((category.match(/class="story-column"/g) || []).length, 1);
    assert.ok(category.includes('/blog/editorial.css'));
    await access(join(production, 'blog/media/editorial/mountains.jpg'));
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
