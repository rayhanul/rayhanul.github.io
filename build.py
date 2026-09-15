#!/usr/bin/env python3
"""Regenerate index.html from template.html + content/*.md.

Edit the .md files under content/, then run:  python3 build.py

Markdown convention used in content/*.md
-----------------------------------------
Each entry in a list-style section (education, teaching, awards, experience,
research, publications, projects, news) looks like:

    ## Title text, or [Title text](url) for a link
    key: value          (optional meta lines: date, icon, color, accent, tag, side)
    Plain meta line(s)  (e.g. institution, advisor/GPA — rendered above the body)

    Body paragraph(s) and/or a bullet list ("- item").

Recognized meta keys (all optional):
    date    - shown at top-right of the entry (or as the <time> value for news)
    accent  - hex color (#1a5490) or name: blue/green/maroon/red/gold/teal;
              controls the entry's left-border/background color. Defaults to
              an auto-cycling palette if omitted.
    icon    - Font Awesome icon name, no "fa-" prefix (research/news sections)
    color   - Bulma text-color suffix, e.g. success/info/warning/primary
    tag     - badge text shown top-right (projects section)
    side    - "left" or "right" (research section only; auto-alternates if omitted)

Wrap any entry (or anything else) in <!-- ... --> to keep it in the source
without publishing it — the same convention already used in index.html.

about.md is the exception: no "## " headings, just plain paragraphs.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"

DEFAULT_PALETTE = ["#1a5490", "#2d6a4f", "#881c1c", "#b8860b"]
NAMED_COLORS = {
    "blue": "#1a5490", "green": "#2d6a4f", "maroon": "#881c1c", "red": "#881c1c",
    "gold": "#b8860b", "teal": "#1a7caa",
}


def resolve_color(value):
    if not value:
        return None
    value = value.strip()
    if value.startswith("#"):
        return value
    return NAMED_COLORS.get(value.lower(), value)


def tint(hex_color, amount=0.94):
    hex_color = hex_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    r = round(r + (255 - r) * amount)
    g = round(g + (255 - g) * amount)
    b = round(b + (255 - b) * amount)
    return f"#{r:02x}{g:02x}{b:02x}"


def escape(text):
    return html.escape(text, quote=False)


def inline_md(text):
    text = escape(text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                   r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", text)
    return text


def strip_comments(text):
    return re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)


def render_body(lines):
    parts = []
    para = []
    items = []

    def flush_para():
        if para:
            raw = " ".join(para).strip()
            m = re.match(r"^\*(?!\*)(.+)\*$", raw)
            if m:
                parts.append(f'<p class="is-size-7 has-text-grey">{inline_md(m.group(1))}</p>')
            else:
                parts.append(f"<p>{inline_md(raw)}</p>")
            para.clear()

    def flush_items():
        if items:
            parts.append("<ul>\n" + "\n".join(f"<li>{inline_md(i)}</li>" for i in items) + "\n</ul>")
            items.clear()

    for raw_line in lines:
        line = raw_line.rstrip()
        if not line.strip():
            flush_para()
            flush_items()
            continue
        if line.strip().startswith("- "):
            flush_para()
            items.append(line.strip()[2:])
        else:
            flush_items()
            para.append(line.strip())
    flush_para()
    flush_items()
    return "\n".join(parts)


def parse_entries(text):
    text = strip_comments(text)
    blocks = re.split(r"(?m)^## ", text.strip())
    blocks = [b for b in blocks if b.strip()]
    entries = []
    for block in blocks:
        lines = block.split("\n")
        heading = lines[0].strip()
        rest = lines[1:]

        m = re.match(r"^\[(.+)\]\((.+)\)$", heading)
        title, url = (m.group(1), m.group(2)) if m else (heading, None)

        i = 0
        meta = {}
        meta_lines = []
        while i < len(rest) and rest[i].strip() != "":
            line = rest[i].strip()
            mm = re.match(r"^(date|icon|color|accent|tag|side):\s*(.+)$", line)
            if mm:
                meta[mm.group(1)] = mm.group(2)
            else:
                meta_lines.append(line)
            i += 1
        while i < len(rest) and rest[i].strip() == "":
            i += 1
        body_lines = rest[i:]

        entries.append({
            "title": title, "url": url, "meta": meta,
            "meta_lines": meta_lines, "body": render_body(body_lines),
        })
    return entries


def render_about():
    text = strip_comments((CONTENT / "about.md").read_text())
    return render_body(text.split("\n"))


def render_box_section(entries, default_accent=None):
    parts = []
    for idx, e in enumerate(entries):
        accent = resolve_color(e["meta"].get("accent")) or default_accent or DEFAULT_PALETTE[idx % len(DEFAULT_PALETTE)]
        bg = tint(accent)
        title_html = inline_md(e["title"])
        if e["url"]:
            title_html = f'<a href="{e["url"]}" target="_blank" rel="noopener noreferrer">{title_html}</a>'
        date_html = ""
        if e["meta"].get("date"):
            date_html = f'<span class="is-size-7 has-text-grey">{escape(e["meta"]["date"])}</span>'
        meta_html = ""
        for i, line in enumerate(e["meta_lines"]):
            cls = "is-size-6 mb-1" if i == 0 else "is-size-7 has-text-grey mb-0"
            meta_html += f'                                            <p class="{cls}">{inline_md(line)}</p>\n'
        parts.append(f'''                                        <div class="box" style="border-left: 4px solid {accent}; background: {bg}; box-shadow: none;">
                                            <div class="is-flex is-justify-content-space-between is-align-items-baseline mb-2" style="flex-wrap: wrap; gap: 0.5rem;">
                                                <strong>{title_html}</strong>
                                                {date_html}
                                            </div>
{meta_html}                                        </div>''')
    return "\n\n".join(parts)


def render_experience(entries):
    parts = []
    for e in entries:
        date_html = ""
        if e["meta"].get("date"):
            date_html = f'<span class="is-size-7 has-text-grey">{escape(e["meta"]["date"])}</span>'
        meta_html = ""
        if e["meta_lines"]:
            meta_html = f'                                            <p class="is-size-7 has-text-grey mb-2">{inline_md(e["meta_lines"][0])}</p>\n'
        parts.append(f'''                                        <div class="exp-entry">
                                            <div class="is-flex is-justify-content-space-between is-align-items-baseline mb-2" style="flex-wrap: wrap; gap: 0.5rem;">
                                                <strong>{inline_md(e["title"])}</strong>
                                                {date_html}
                                            </div>
{meta_html}                                            {e["body"]}
                                        </div>''')
    return "\n\n".join(parts)


def render_research(entries):
    parts = []
    for idx, e in enumerate(entries):
        icon = e["meta"].get("icon", "flask")
        color = e["meta"].get("color", "success")
        side = e["meta"].get("side") or ("left" if idx % 2 == 0 else "right")
        cls = "topic-entry-left" if side == "left" else "topic-entry-right"
        parts.append(f'''                                            <div class="mb-3 {cls}">
                                                <div class="box" style="background: transparent; box-shadow: none; border: none; padding: 1rem 1.25rem;">
                                                    <h3 class="title is-5 mb-2 short-underline" style="padding-bottom: 0.4rem;">
                                                        <i class="fas fa-{icon} mr-2 text-{color}"></i>{inline_md(e["title"])}
                                                    </h3>
                                                    {e["body"]}
                                                </div>
                                            </div>''')
    return "\n\n".join(parts)


def render_publications(entries):
    parts = []
    for e in entries:
        title_html = inline_md(e["title"])
        if e["url"]:
            title_html = f'<a class="topic-paper-title" href="{e["url"]}" target="_blank" rel="noopener noreferrer">{title_html}</a>'
        else:
            title_html = f'<span class="topic-paper-title">{title_html}</span>'
        authors = e["meta_lines"][0] if len(e["meta_lines"]) > 0 else ""
        venue = e["meta_lines"][1] if len(e["meta_lines"]) > 1 else ""
        parts.append(f'''                                            <article class="topic-paper">
                                                {title_html}
                                                <p class="topic-paper-authors">{inline_md(authors)}</p>
                                                <p class="topic-paper-venue">{inline_md(venue)}</p>
                                            </article>''')
    inner = "\n".join(parts)
    return f'                                        <div class="topic-paper-list" style="border-top: 1px solid var(--border-color);">\n{inner}\n                                        </div>'


def render_projects(entries):
    parts = []
    for e in entries:
        accent = resolve_color(e["meta"].get("accent")) or "#48c774"
        bg = tint(accent)
        tag_html = ""
        if e["meta"].get("tag"):
            tag_html = f'<span class="tag is-success is-light">{escape(e["meta"]["tag"])}</span>'
        meta_html = ""
        if e["meta_lines"]:
            meta_html = f'                                            <p class="is-size-7 has-text-grey mb-2">{inline_md(e["meta_lines"][0])}</p>\n'
        body = e["body"]
        if body.startswith("<p>"):
            body = '<p class="is-size-6 mb-0">' + body[len("<p>"):]
        parts.append(f'''                                        <div class="box" style="border-left: 4px solid {accent}; background: {bg}; box-shadow: none; margin-bottom: 1rem;">
                                            <div class="is-flex is-justify-content-space-between is-align-items-baseline mb-2" style="flex-wrap: wrap; gap: 0.5rem;">
                                                <strong>{inline_md(e["title"])}</strong>
                                                {tag_html}
                                            </div>
{meta_html}                                            {body}
                                        </div>''')
    return "\n\n".join(parts)


def render_news(entries):
    items = []
    for e in entries:
        date = e["meta"].get("date", "")
        icon = e["meta"].get("icon", "circle")
        color = e["meta"].get("color", "primary")
        body_text = re.sub(r"^<p[^>]*>(.*)</p>$", r"\1", e["body"].strip(), flags=re.DOTALL)
        items.append(f'''                                            <li>
                                                <i class="fas fa-{icon} text-{color}"></i>
                                                <div class="news-content">
                                                    <time datetime="{escape(date)}"><strong>{inline_md(e["title"])}</strong></time>
                                                    {body_text}
                                                </div>
                                            </li>''')
    return "\n".join(items)


def load(name):
    return (CONTENT / f"{name}.md").read_text()


def main():
    template = (ROOT / "template.html").read_text()

    replacements = {
        "{{ABOUT}}": render_about(),
        "{{EDUCATION}}": render_box_section(parse_entries(load("education"))),
        "{{RESEARCH}}": render_research(parse_entries(load("research"))),
        "{{PUBLICATIONS}}": render_publications(parse_entries(load("publications"))),
        "{{EXPERIENCE}}": render_experience(parse_entries(load("experience"))),
        "{{TEACHING}}": render_box_section(parse_entries(load("teaching"))),
        "{{AWARDS}}": render_box_section(parse_entries(load("awards"))),
        "{{PROJECTS}}": render_projects(parse_entries(load("projects"))),
        "{{NEWS}}": render_news(parse_entries(load("news"))),
    }

    out = template
    for placeholder, html_snippet in replacements.items():
        if placeholder not in out:
            raise SystemExit(f"template.html is missing placeholder {placeholder}")
        out = out.replace(placeholder, html_snippet)

    (ROOT / "index.html").write_text(out)
    print("Wrote index.html")


if __name__ == "__main__":
    main()
