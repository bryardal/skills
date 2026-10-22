# /teachme marketplace submissions

Status: Claude: not submitted · ChatGPT: not submitted

Do these after the repo is public and skills.siaccelerator.co/teachme is live. In Claude Code, say "guide me
through the marketplace submissions for /teachme" and it will walk you through each form one step at a time.
Both go through review with no fixed timeline. When a listing is approved, send its link to Claude Code and it
adds "Add to Claude" / "Add to ChatGPT" buttons to the page.

## Claude directory

Where: https://claude.ai/directory/manage (your Max account works)

1. **Submit new** → **Plugin bundle**.
2. GitHub repository: `https://github.com/bryardal/skills`
3. Plugin path: `plugins/teachme`
4. Listing details, if asked:
   - Name: `teachme`
   - Short description: Ask about any topic and get a hands-on lesson you can press, drag and play with.
   - Long description: Ask about any topic and get one hands-on lesson in a single web page. Learners press
     the real part to start each step and drag sliders to make things happen. They guess before the surprising
     step, tap parts to learn their names, try things in a sandbox and finish with a short quiz. /teachme
     researches the topic and writes a fact sheet, then a second agent checks every fact. Each lesson lists its
     sources and what it simplifies. Lessons work on phones and with screen readers, and they print as worksheets.
   - Category: Education (or the closest one offered)
   - Homepage: `https://skills.siaccelerator.co/teachme`
   - Support: your reply-to email address
   - Example prompts: "teach me why compound interest snowballs" · "how does a kettle know when to switch
     off?" · "how does a bill become a law?"
5. **Submit for review**. Automatic checks and a security scan run first; fix anything they flag, then a person
   reviews it. Once approved, you choose when to publish.

## ChatGPT Plugin Directory

Where: https://platform.openai.com/plugins

Before you start: your OpenAI organization needs individual identity verification (Settings → Organization →
General), and you need to be its owner.

1. **Create plugin** → **Skills only**.
2. Developer identity: your verified individual identity.
3. Upload: `dist/teachme/teachme-chatgpt-plugin.zip`. It isn't committed to GitHub; if it's missing, run
   `node scripts/package.mjs teachme` to rebuild it.
4. Listing fields:
   - Display name (max 30): `teachme`
   - Short description (max 30): `Hands-on lessons on any topic`
   - Long description (max 4000): use the Claude long description above, but replace "a second agent" with
     "a second check".
   - Category: Education
   - Developer name: Bry Ardal
   - Starter prompts (max 3, 128 characters each):
     - teach me why compound interest snowballs
     - how does a kettle know when to switch off?
     - teach me photosynthesis, for a 10-year-old
   - Logo: a square image, at least 48 x 48 (PNG or SVG). **Needed from you**: a square version of your logo.
   - Website: `https://skills.siaccelerator.co/teachme`
   - Support: your reply-to email · Privacy policy: `https://skills.siaccelerator.co/privacy`
5. Wait for the automated checks under **Metadata & Skills**. If anything is flagged, click **Copy issues**,
   paste them to me, and I'll fix the package.
6. **Submit for review**, accept the policy attestations. After approval, click **Publish plugin**.
