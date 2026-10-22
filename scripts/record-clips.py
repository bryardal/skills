# Records looping clips of interactive HTML outputs for skill pages (tuned for /teachme-style lessons:
# it presses Start, drags sliders, answers guesses and clicks the next-step button). Adapt the selectors per skill.
# Record short looping clips of teachme lessons running.
# usage: python3 clips.py BASE_URL OUT_DIR name[:ratio[:ui]] ...
#   ratio: wide (4:3) | square | hero (16:10)   ui: 1 keeps the lesson's own panel visible
import asyncio, os, subprocess, sys, shutil, tempfile
from playwright.async_api import async_playwright
from PIL import Image, ImageOps, ImageChops

HIDE = "button,nav,header.top,.cap,#stats,.zoombar,details.about{visibility:hidden!important}"
W, H = 1400, 1000
RATIOS = {"wide": (4/3, 960, 720), "square": (1, 720, 720), "hero": (16/10, 1440, 900)}

def bbox(png, pad=48):
    g = ImageOps.invert(Image.open(png).convert("L")).point(lambda v: 255 if v > 18 else 0)
    return g.getbbox()

def frame(bb, ratio, pad=56):
    x0, y0, x1, y1 = bb[0]-pad, bb[1]-pad, bb[2]+pad, bb[3]+pad
    w, h = x1-x0, y1-y0
    if w/h < ratio: nw = h*ratio; x0 -= (nw-w)/2; w = nw
    else: nh = w/ratio; y0 -= (nh-h)/2; h = nh
    x0, y0 = max(0, min(x0, W-w)), max(0, min(y0, H-h))
    w, h = min(w, W), min(h, H)
    return int(x0)//2*2, int(y0)//2*2, int(w)//2*2, int(h)//2*2

async def record(p, base, name, ratio, ui, out):
    tmp = tempfile.mkdtemp()
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport={"width": W, "height": H}, record_video_dir=tmp, record_video_size={"width": W, "height": H})
    pg = await ctx.new_page()
    await pg.goto(f"{base}/{name}.html"); await pg.wait_for_timeout(1800)
    if not ui: await pg.add_style_tag(content=HIDE)
    t0 = await pg.evaluate("performance.now()")
    shots = []
    await pg.evaluate("[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Start')?.click()")
    for i in range(7):
        await pg.wait_for_timeout(1400)
        # a step that asks you to drag: move its slider from start to end, like a person would
        await pg.evaluate("""(async()=>{const r=document.querySelector('.cap input[type=range]'); if(!r) return;
          const a=+r.min||0,z=+r.max||100; for(let k=0;k<=40;k++){r.value=a+(z-a)*k/40; r.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(s=>setTimeout(s,70));}
          r.dispatchEvent(new Event('change',{bubbles:true}));})()""")
        # a guess step: pick an answer so the lesson reveals what happens
        await pg.evaluate("(()=>{const o=[...document.querySelectorAll('.cap .choice')]; if(o.length) o[o.length-1].click()})()")
        await pg.wait_for_timeout(900)
        s = f"{tmp}/s{i}.png"
        if not ui: await pg.screenshot(path=s); shots.append(s)
        # press the lesson's main button (the last one in the step card footer) to move on
        await pg.evaluate("(()=>{const f=document.querySelector('.pfoot'); const bs=f?[...f.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden&&b.id!=='back'):[]; bs.length&&bs[bs.length-1].click()})()")
    await pg.wait_for_timeout(1500)
    video = await pg.video.path()
    await ctx.close(); await b.close()
    r, ow, oh = RATIOS[ratio]
    if ui:  # whole lesson, top-aligned
        x0, y0, w, h = 0, 0, W, min(H, int(W / r)) // 2 * 2
    else:
        boxes = [bbox(s) for s in shots]
        bb = (min(x[0] for x in boxes), min(x[1] for x in boxes), max(x[2] for x in boxes), max(x[3] for x in boxes))
        x0, y0, w, h = frame(bb, r)
    start = 1.6 + 0.3  # skip page load
    vf = f"crop={w}:{h}:{x0}:{y0},scale={ow}:{oh}:flags=lanczos,format=yuv420p"
    mp4 = f"{out}/{name}-{ratio}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(start), "-i", video, "-t", "20",
                    "-vf", vf, "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", "-an", mp4], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "3.2", "-i", mp4, "-frames:v", "1", "-q:v", "3", f"{out}/{name}-{ratio}.jpg"], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(name, ratio, f"{os.path.getsize(mp4)//1024} KB")

async def main(base, out, *specs):
    async with async_playwright() as p:
        for s in specs:
            parts = s.split(":"); name = parts[0]; ratio = parts[1] if len(parts) > 1 else "wide"; ui = len(parts) > 2 and parts[2] == "1"
            await record(p, base, name, ratio, ui, out)

asyncio.run(main(*sys.argv[1:]))
