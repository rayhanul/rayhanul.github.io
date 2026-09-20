/*
 * Builds the whole page in the browser from content/*.md, so editing a .md file
 * is all it takes to change the site (no build step).
 *
 * The section renderers are a direct port of the old build.py, so the entry
 * conventions in content/README.md are unchanged.
 */
(function () {
  'use strict';

  const DEFAULT_PALETTE = ['#1a5490', '#2d6a4f', '#881c1c', '#b8860b'];
  const NAMED_COLORS = { blue: '#1a5490', green: '#2d6a4f', maroon: '#881c1c', red: '#881c1c', gold: '#b8860b', teal: '#1a7caa' };

  // ---------- small helpers (ported from build.py) ----------
  const escape = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const attr = (t) => escape(t).replace(/"/g, '&quot;');
  const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '');

  const resolveColor = (v) => {
    if (!v) return null;
    v = v.trim();
    if (v.startsWith('#')) return v;
    return NAMED_COLORS[v.toLowerCase()] || v;
  };

  // Python's round() is half-to-even; match it so tints are identical to build.py.
  const roundHalfEven = (x) => {
    const f = Math.floor(x);
    const d = x - f;
    if (d === 0.5) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  };

  const tint = (hex, amount = 0.94) => {
    hex = hex.replace(/^#/, '');
    return '#' + [0, 2, 4].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16);
      return roundHalfEven(c + (255 - c) * amount).toString(16).padStart(2, '0');
    }).join('');
  };

  const inlineMd = (text) => {
    text = escape(text);
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*(?!\*)(.*?[^*])\*(?!\*)/g, '$1<em>$2</em>');
    return text;
  };

  function renderBody(lines) {
    const parts = [];
    let para = [];
    let items = [];
    const flushPara = () => {
      if (!para.length) return;
      const raw = para.join(' ').trim();
      const m = raw.match(/^\*(?!\*)(.+)\*$/);
      parts.push(m ? `<p class="is-size-7 has-text-grey">${inlineMd(m[1])}</p>` : `<p>${inlineMd(raw)}</p>`);
      para = [];
    };
    const flushItems = () => {
      if (!items.length) return;
      parts.push('<ul>\n' + items.map((i) => `<li>${inlineMd(i)}</li>`).join('\n') + '\n</ul>');
      items = [];
    };
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+$/, '');
      if (!line.trim()) { flushPara(); flushItems(); continue; }
      if (line.trim().startsWith('- ')) { flushPara(); items.push(line.trim().slice(2)); }
      else { flushItems(); para.push(line.trim()); }
    }
    flushPara();
    flushItems();
    return parts.join('\n');
  }

  const META_RE = /^(date|icon|color|accent|tag|side|category|logo|details):\s*(.+)$/;

  function parseEntries(text) {
    text = stripComments(text);
    return text.trim().split(/^## /m).filter((b) => b.trim()).map((block) => {
      const lines = block.split('\n');
      const heading = lines[0].trim();
      const rest = lines.slice(1);
      const m = heading.match(/^\[(.+)\]\((.+)\)$/);
      const title = m ? m[1] : heading;
      const url = m ? m[2] : null;
      let i = 0;
      const meta = {};
      const metaLines = [];
      while (i < rest.length && rest[i].trim() !== '') {
        const line = rest[i].trim();
        const mm = line.match(META_RE);
        if (mm) meta[mm[1]] = mm[2]; else metaLines.push(line);
        i++;
      }
      while (i < rest.length && rest[i].trim() === '') i++;
      return { title, url, meta, metaLines, body: renderBody(rest.slice(i)) };
    });
  }

  // ---------- section layouts (ported from build.py) ----------
  const rowCls = 'is-flex is-justify-content-space-between is-align-items-baseline mb-1';
  const rowStyle = 'flex-wrap: wrap; gap: 0.25rem 0.5rem;';

  function renderBoxes(entries) {
    return entries.map((e, idx) => {
      const accent = resolveColor(e.meta.accent) || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
      let titleHtml = inlineMd(e.title);
      if (e.url) titleHtml = `<a href="${e.url}" target="_blank" rel="noopener noreferrer">${titleHtml}</a>`;
      const dateHtml = e.meta.date ? `<span class="is-size-7 has-text-grey">${escape(e.meta.date)}</span>` : '';
      const metaHtml = e.metaLines.map((line, i) =>
        `<p class="${i === 0 ? 'is-size-6 mb-0' : 'is-size-7 has-text-grey mb-0'}">${inlineMd(line)}</p>`).join('\n');
      const headerAndMeta = `<div class="${rowCls}" style="${rowStyle}"><strong>${titleHtml}</strong>${dateHtml}</div>\n${metaHtml}`;
      const inner = e.meta.logo
        ? `<div class="is-flex" style="gap: 0.85rem; align-items: flex-start;"><img class="edu-logo" src="${escape(e.meta.logo)}" alt="" /><div style="flex: 1; min-width: 0;">${headerAndMeta}</div></div>`
        : headerAndMeta;
      return `<div class="box" style="border-left: 4px solid ${accent}; background: ${tint(accent)}; box-shadow: none;">${inner}</div>`;
    }).join('\n\n');
  }

  function renderTimeline(entries) {
    return entries.map((e) => {
      const dateHtml = e.meta.date ? `<span class="is-size-7 has-text-grey">${escape(e.meta.date)}</span>` : '';
      const metaHtml = e.metaLines.length ? `<p class="is-size-7 has-text-grey mb-1">${inlineMd(e.metaLines[0])}</p>` : '';
      return `<div class="exp-entry"><div class="${rowCls}" style="${rowStyle}"><strong>${inlineMd(e.title)}</strong>${dateHtml}</div>\n${metaHtml}${e.body}</div>`;
    }).join('\n\n');
  }

  function renderCards(entries) {
    const cards = entries.map((e, idx) => {
      const icon = e.meta.icon || 'flask';
      const color = e.meta.color || 'success';
      const side = e.meta.side || (idx % 2 === 0 ? 'left' : 'right');
      const cls = side === 'left' ? 'topic-entry-left' : 'topic-entry-right';
      return `<div class="mb-2 ${cls}"><div class="box" style="background: transparent; box-shadow: none; border: none; padding: 0.75rem 0.2rem;">` +
        `<h3 class="title is-5 mb-1 short-underline" style="padding-bottom: 0.3rem;"><i class="fas fa-${icon} mr-2 text-${color}"></i>${inlineMd(e.title)}</h3>\n` +
        `${e.body}</div></div>`;
    }).join('\n\n');
    return `<div class="content">\n${cards}\n</div>`;
  }

  function renderPapers(entries) {
    const parts = [];
    let lastCategory = null;
    for (const e of entries) {
      const category = e.meta.category;
      if (category && category !== lastCategory) {
        parts.push(`<h4>${escape(category)}</h4>`);
        lastCategory = category;
      }
      let titleHtml = inlineMd(e.title);
      titleHtml = e.url
        ? `<a class="topic-paper-title" href="${e.url}" target="_blank" rel="noopener noreferrer">${titleHtml}</a>`
        : `<span class="topic-paper-title">${titleHtml}</span>`;
      const authors = e.metaLines[0] || '';
      const venue = e.metaLines[1] || '';
      parts.push(`<article class="topic-paper">${titleHtml}<p class="topic-paper-authors">${inlineMd(authors)}</p><p class="topic-paper-venue">${inlineMd(venue)}</p></article>`);
    }
    return `<div class="topic-paper-list" style="border-top: 1px solid var(--border-color);">\n${parts.join('\n')}\n</div>`;
  }

  function renderProjects(entries) {
    return entries.map((e) => {
      const accent = resolveColor(e.meta.accent) || '#48c774';
      const tagHtml = e.meta.tag ? `<span class="tag is-success is-light">${escape(e.meta.tag)}</span>` : '';
      const metaHtml = e.metaLines.length ? `<p class="is-size-7 has-text-grey mb-1">${inlineMd(e.metaLines[0])}</p>` : '';
      let body = e.body;
      if (body.startsWith('<p>')) body = '<p class="is-size-6 mb-0">' + body.slice(3);
      return `<div class="box" style="border-left: 4px solid ${accent}; background: ${tint(accent)}; box-shadow: none;">` +
        `<div class="${rowCls}" style="${rowStyle}"><strong>${inlineMd(e.title)}</strong>${tagHtml}</div>\n${metaHtml}${body}</div>`;
    }).join('\n\n');
  }

  function renderNews(entries) {
    return entries.map((e) => {
      const icon = e.meta.icon || 'circle';
      const color = e.meta.color || 'primary';
      const bodyText = e.body.trim().replace(/^<p[^>]*>([\s\S]*)<\/p>$/, '$1');
      const detailsId = /^[\w-]+$/.test(e.meta.details || '') ? e.meta.details : '';
      const cue = detailsId
        ? ` <a class="news-details-cue" href="details.html?id=${detailsId}" target="_blank" rel="noopener noreferrer">Details <i class="fas fa-arrow-right"></i></a>`
        : '';
      return `<li><i class="fas fa-${icon} text-${color}"></i><div class="news-content">` +
        `<time datetime="${escape(e.meta.date || '')}"><strong>${inlineMd(e.title)}</strong></time>\n${bodyText}${cue}</div></li>`;
    }).join('\n');
  }

  const LAYOUTS = {
    text: (t) => renderBody(stripComments(t).split('\n')),
    boxes: (t) => renderBoxes(parseEntries(t)),
    timeline: (t) => renderTimeline(parseEntries(t)),
    cards: (t) => renderCards(parseEntries(t)),
    papers: (t) => renderPapers(parseEntries(t)),
    projects: (t) => renderProjects(parseEntries(t)),
  };

  // ---------- profile.md / sections.md ----------
  const iconClass = (spec) => {
    spec = (spec || '').trim();
    const m = spec.match(/^(brands|regular|solid)\/(.+)$/);
    if (m) return `${m[1] === 'brands' ? 'fa-brands' : m[1] === 'regular' ? 'far' : 'fas'} fa-${m[2]}`;
    return `fas fa-${spec}`;
  };

  const listItems = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).split('|').map((s) => s.trim()));

  function parseProfile(text) {
    const out = { fields: {}, contact: [], links: [] };
    let mode = 'fields';
    for (const raw of stripComments(text).split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('## ')) { mode = line.slice(3).trim().toLowerCase(); continue; }
      if (mode === 'fields') {
        const m = line.match(/^([a-z_]+):\s*(.*)$/);
        if (m) out.fields[m[1]] = m[2];
      } else if (line.startsWith('- ') && out[mode]) {
        out[mode].push(line.slice(2).split('|').map((s) => s.trim()));
      }
    }
    return out;
  }

  const get = async (path) => {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return (await r.text()).replace(/\r\n/g, '\n');
  };

  // ---------- page pieces ----------
  function renderHeader(p) {
    const f = p.fields;
    const photo = f.photo
      ? `<div class="column is-3"><div class="profile-image-container"><img class="profile-image" src="${attr(f.photo)}" alt="${attr(f.photo_alt || f.name || '')}" /></div></div>`
      : '';
    const contact = p.contact.map(([icon, text, flag]) => {
      const value = flag === 'copy'
        ? `<span class="copyable-email">${escape(text)}</span>\n<span class="copy-status is-hidden">Copied!</span>`
        : `<span>${escape(text)}</span>`;
      return `<div class="mb-1"><i class="${iconClass(icon)} mr-2"></i>\n${value}</div>`;
    }).join('\n');
    const links = p.links.map(([icon, label, url, color]) =>
      `<a href="${attr(url)}" class="button is-${attr(color || 'link')} is-light" target="_blank" rel="noopener noreferrer"><i class="${iconClass(icon)} mr-1"></i> ${escape(label)}</a>`).join('\n');
    return `${photo}
<div class="column">
  <h1 class="title is-2 has-text-centered-mobile mb-2">${escape(f.name || '')}</h1>
  <p class="subtitle has-text-centered-mobile is-6 is-size-7-mobile mt-1 mb-2">${inlineMd(f.subtitle || '')}</p>
  <div class="content contact-info mb-2">${contact}</div>
  <div class="buttons">${links}</div>
</div>`;
  }

  function renderNav(sections) {
    const items = sections.map((s) =>
      `<a href="#${attr(s.id)}" class="nav-item"><i class="${iconClass(s.icon)}"></i><span>${escape(s.label)}</span></a>`).join('\n');
    return `<nav class="section-nav" id="section-nav"><div class="nav-container">${items}</div></nav>`;
  }

  function renderSection(s, index) {
    const body = (LAYOUTS[s.layout] || LAYOUTS.text)(s.text);
    return `<section id="${attr(s.id)}" class="section-content">` +
      `<h2 class="title is-4 mb-2"><i class="${iconClass(s.icon)} mr-2"></i>${escape(s.heading)}</h2>\n${body}</section>`;
  }

  const banner = (text) => `<div class="looking-for-work-banner"><i class="fas fa-circle-dot"></i>` +
    `<div>${renderBody(stripComments(text).split('\n')).trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1')}</div></div>`;

  function renderNewsPanel(title, text) {
    return `<div class="recent-news sidebar-panel"><h2 class="title is-4">${escape(title)}</h2>` +
      `<div class="content"><ul id="news-feed">\n${renderNews(parseEntries(text))}\n</ul></div></div>`;
  }

  // Show the first `limit` news items; each click on the button reveals `step` more,
  // and once everything is showing the button collapses back to `limit`.
  function setupNewsToggle(root, limit, step, moreText, lessText) {
    const items = Array.from(root.querySelectorAll('#news-feed > li'));
    if (!(limit > 0) || items.length <= limit) return;
    if (!(step > 0)) step = 5;
    let shown = limit;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'button is-light is-small is-fullwidth news-toggle';
    btn.setAttribute('aria-controls', 'news-feed');
    const paint = () => {
      items.forEach((li, i) => { li.hidden = i >= shown; });
      const remaining = items.length - shown;
      btn.setAttribute('aria-expanded', String(remaining === 0));
      btn.innerHTML = remaining > 0
        ? `<i class="fas fa-chevron-down mr-2"></i><span>${escape(moreText)} (${remaining})</span>`
        : `<i class="fas fa-chevron-up mr-2"></i><span>${escape(lessText)}</span>`;
    };
    btn.addEventListener('click', () => {
      if (shown < items.length) {
        shown = Math.min(items.length, shown + step);
      } else {
        shown = limit;
        root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      paint();
    });
    paint();
    root.querySelector('.content').appendChild(btn);
  }

  // ---------- details pages (details.html?id=<name> renders content/details/<name>.md) ----------
  // Slightly richer markdown than the section files: # headings, - or * bullets, `code`.
  const inlineRich = (text) => text.split(/`([^`]+)`/).map((seg, i) => (i % 2 ? `<code>${escape(seg)}</code>` : inlineMd(seg))).join('');

  function renderMarkdown(text) {
    let title = '';
    const out = [];
    let para = [];
    let items = [];
    const flushPara = () => {
      if (!para.length) return;
      const raw = para.join(' ').trim();
      const m = raw.match(/^\*(?!\*)(.+)\*$/);
      out.push(m ? `<p class="is-size-7 has-text-grey">${inlineRich(m[1])}</p>` : `<p>${inlineRich(raw)}</p>`);
      para = [];
    };
    const flushItems = () => {
      if (!items.length) return;
      out.push('<ul>' + items.map((i) => `<li>${inlineRich(i)}</li>`).join('') + '</ul>');
      items = [];
    };
    for (const raw of stripComments(text).split('\n')) {
      const line = raw.replace(/\s+$/, '');
      const h = line.match(/^#{1,6}\s+(.*)$/);
      if (!line.trim()) { flushPara(); flushItems(); }
      else if (h) {
        flushPara(); flushItems();
        if (!title && !out.length) title = h[1]; else out.push(`<h4 class="title is-6">${inlineRich(h[1])}</h4>`);
      } else if (/^[-*]\s+/.test(line)) { flushPara(); items.push(line.replace(/^[-*]\s+/, '')); }
      else { flushItems(); para.push(line.trim()); }
    }
    flushPara();
    flushItems();
    return { title, html: out.join('\n') };
  }

  // ---------- behaviour ----------
  function wireBehaviour() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('.copyable-email');
      if (!el) return;
      const status = el.nextElementSibling;
      navigator.clipboard.writeText(el.textContent.trim()).then(() => {
        if (status && status.classList.contains('copy-status')) {
          status.classList.remove('is-hidden');
          setTimeout(() => status.classList.add('is-hidden'), 2000);
        }
      }).catch((err) => console.error('Failed to copy text: ', err));
    });

    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('section[id]');

    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(item.getAttribute('href').substring(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navItems.forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
      });
    });

    function updateActiveNav() {
      let current = '';
      const pos = window.scrollY + 100;
      sections.forEach((s) => {
        if (pos >= s.offsetTop && pos < s.offsetTop + s.offsetHeight) current = s.getAttribute('id');
      });
      navItems.forEach((item) => {
        item.classList.toggle('active', item.getAttribute('href').substring(1) === current);
      });
    }
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();

    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  async function main() {
    const [profileText, sectionsText] = await Promise.all([get('content/profile.md'), get('content/sections.md')]);
    const profile = parseProfile(profileText);
    const f = profile.fields;

    const defs = listItems(stripComments(sectionsText)).map(([id, label, icon, layout, heading]) =>
      ({ id, label, icon, layout: layout || 'text', heading: heading || label }));

    const [texts, lfw, news] = await Promise.all([
      Promise.all(defs.map((s) => get(`content/${s.id}.md`).catch((err) => { console.warn(err.message); return null; }))),
      get('content/looking_for_work.md').catch(() => ''),
      get('content/news.md').catch(() => ''),
    ]);
    const sections = defs.map((s, i) => ({ ...s, text: texts[i] })).filter((s) => s.text !== null);

    if (f.title) document.title = f.title;
    document.getElementById('site-header').innerHTML = renderHeader(profile);
    document.getElementById('site-nav').innerHTML = renderNav(sections);

    const html = sections.map(renderSection);
    if (lfw.trim() && html.length) html.splice(1, 0, banner(lfw));
    document.getElementById('site-content').innerHTML = html.join('\n\n');

    const newsRoot = document.getElementById('site-news');
    newsRoot.innerHTML = news.trim() ? renderNewsPanel(f.news_title || 'Recent News', news) : '';
    setupNewsToggle(newsRoot, parseInt(f.news_visible || '5', 10), parseInt(f.news_step || '5', 10), f.news_more || 'More news', f.news_less || 'Show less');
    document.getElementById('site-footer').innerHTML = inlineMd(f.footer || '');

    wireBehaviour();
  }

  async function mainDetails() {
    const root = document.getElementById('site-details');
    const id = new URLSearchParams(location.search).get('id') || '';
    const profile = parseProfile(await get('content/profile.md').catch(() => ''));
    const f = profile.fields;
    document.getElementById('site-back-label').textContent = f.name || 'Home';
    document.getElementById('site-footer').innerHTML = inlineMd(f.footer || '');
    try {
      if (!/^[\w-]+$/.test(id)) throw new Error('bad id');
      const doc = renderMarkdown(await get(`content/details/${id}.md`));
      document.title = doc.title ? `${doc.title}${f.name ? ' | ' + f.name : ''}` : (f.name || document.title);
      root.innerHTML = `<h1 class="title is-3">${escape(doc.title)}</h1>\n${doc.html}`;
      root.querySelectorAll('a[href]').forEach((a) => {
        if (!a.getAttribute('href').startsWith('#')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      });
    } catch (err) {
      if (err instanceof TypeError) throw err; // network/file:// failure, not a missing page
      console.warn(err);
      document.title = 'Not found' + (f.name ? ' | ' + f.name : '');
      root.innerHTML = '<h1 class="title is-3">Page not found</h1><p>There is no page for this link. <a href="index.html">Go to the home page</a>.</p>';
    }
  }

  (document.getElementById('site-details') ? mainDetails() : main()).catch((err) => {
    console.error(err);
    (document.getElementById('site-content') || document.getElementById('site-details')).innerHTML =
      '<div class="notification is-warning">Could not load the site content (' + escape(err.message) + '). ' +
      'This page is built from the files in <code>content/</code>, so it has to be served over HTTP ' +
      '(GitHub Pages, or <code>python3 -m http.server</code> locally) &mdash; opening index.html straight from disk will not work.</div>';
  });
})();
