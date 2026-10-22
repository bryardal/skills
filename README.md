# Skills by Bry Ardal

Free skills for Claude and ChatGPT from **Superintelligence Accelerator**.
Browse them at **[skills.siaccelerator.co](https://skills.siaccelerator.co)**.

## Install every skill in Claude Code

```
/plugin marketplace add bryardal/skills
```

Or install one skill directly: `/plugin install teachme --marketplace bryardal/skills`. New skills show up when you run
`/plugin marketplace update siaccelerator`.

## Skills

| Skill | What you get |
| --- | --- |
| [/teachme](https://skills.siaccelerator.co/teachme) | Ask about any topic and get a hands-on lesson you can press, drag and play with. |

Each skill's page has install steps for the Claude app, Claude Code, ChatGPT and Codex.

## What's in this repo

- `plugins/<skill>/`: each skill as a Claude plugin, plus a `chatgpt/` folder with neutral wording for ChatGPT.
- `pages/<skill>.json`: the content of each skill's page.
- `site/`: the website, built by `node scripts/build.mjs` and served by Vercel.
- `api/`: the signup functions behind the site's email form.
- `scripts/package.mjs <skill>`: builds every download for a skill.

Each skill keeps its own licence in its folder.
