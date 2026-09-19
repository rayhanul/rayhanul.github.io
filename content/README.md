# How the site is built

`index.html` is an empty shell. `assets/js/site.js` reads the files in this folder when the page loads and builds everything you see, so **saving a `.md` file is all it takes** — refresh the page, no build step. (`build.py` and `template.html` are the old static build and are no longer used.)

| File | Controls |
| --- | --- |
| `profile.md` | name, photo, subtitle, contact lines, header buttons, news title, how many news items show first (`news_visible`) and how many more each "More news" click reveals (`news_step`), footer |
| `sections.md` | which sections show, their order, menu label, icon, layout and heading |
| `looking_for_work.md` | the green status banner under the first section (empty file = no banner) |
| `news.md` | the Recent News sidebar |
| `about.md`, `research.md`, `publications.md`, `experience.md`, `education.md`, `teaching.md`, `awards.md`, `projects.md`, `skills.md` | one file per section, named by its id in `sections.md` |

Wrap anything in `<!-- ... -->` to keep it in the file without showing it (works in every file, including `sections.md`).

## Entries

Every section except `about`/`skills`/`looking_for_work` is a list of entries:

    ## Title text, or [Title text](url) to make it a link
    key: value              (optional meta lines)
    Plain line(s)           (institution, advisor, ... shown above the body)

    Body paragraph(s) and/or bullets ("- item").

Meta keys: `date`, `accent` (hex or blue/green/maroon/red/gold/teal), `icon` (Font Awesome name without `fa-`), `color` (Bulma suffix: success/info/warning/primary), `tag` (badge, projects), `side` (left/right, research), `category` (group heading, publications), `logo` (image path, education).

Inline: `**bold**`, `*italic*`, `[text](url)`.

## News with a details page

Add `details: some-name` to a news entry and put the full write-up in `content/details/some-name.md`. The news item shows only its short text plus a **Details →** link that opens `details.html?id=some-name` in a new tab. That address is a normal page link, so you can share it: `https://rayhanul.github.io/details.html?id=some-name`.

In the details file the first `#` heading becomes the page title, and you can use `#` headings, `-` or `*` bullets, `` `code` ``, `**bold**`, `*italic*` and `[links](url)`. A paragraph that is entirely `*italic*` shows as a small grey note.

## sections.md layouts

`text` (plain paragraphs/bullets), `boxes` (education, teaching, awards), `cards` (research), `papers` (publications), `timeline` (experience), `projects`.

## profile.md

`key: value` lines at the top, then `## Contact` and `## Links` lists:

    - envelope | someone@example.com | copy        (icon | text | copy = click-to-copy)
    - brands/github | GitHub | https://... | dark  (icon | label | url | Bulma color)

Icons: `envelope` (solid), `brands/github`, `regular/file-alt`.
