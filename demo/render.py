"""Render a silent, captioned presentation of actual Chrome app states.
Run: python -m pip install Pillow imageio-ffmpeg
     python demo/render.py
No generated imagery, fabricated UI, narration, or music is used.
"""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'rendered'
OUT.mkdir(exist_ok=True)
W, H, FPS = 1440, 1200, 24
timeline = json.loads((ROOT/'timeline.json').read_text(encoding='utf8'))
fonts = [Path('C:/Windows/Fonts/segoeui.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
font_path = next((p for p in fonts if p.exists()), None)
font = ImageFont.truetype(str(font_path), 25) if font_path else ImageFont.load_default(size=25)
concat = ['ffconcat version 1.0']
cues = ['WEBVTT', '', 'NOTE Timed commentary for a silent UI presentation; no speech transcript.', '']
manifest = []
cursor = 0
def stamp(seconds):
    return f'{seconds//3600:02d}:{seconds//60%60:02d}:{seconds%60:02d}.000'
for index, cue in enumerate(timeline):
    source = ROOT/'frames'/cue['asset']
    image = Image.open(source).convert('RGB')
    canvas = Image.new('RGB', (W,H), '#f6f7f3')
    scale = min(1, W/image.width, 1090/image.height)
    image = image.resize((round(image.width*scale), round(image.height*scale)), Image.Resampling.LANCZOS)
    canvas.paste(image, ((W-image.width)//2, (1090-image.height)//2))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0,1090,W,H),fill='#183c31')
    text=cue['text']
    words=text.split(); lines=[]; current=''
    for word in words:
        candidate=(current+' '+word).strip()
        if draw.textlength(candidate,font=font)>W-160:
            lines.append(current);current=word
        else:current=candidate
    if current: lines.append(current)
    assert len(lines)<=2
    for j,line in enumerate(lines):
        width=draw.textlength(line,font=font)
        draw.text(((W-width)/2,1120+j*33-(len(lines)-1)*15),line,font=font,fill='#f4f1db')
    target=OUT/f'scene-{index+1:02d}.png'
    canvas.save(target)
    concat += [f"file '{target.name}'",f"duration {cue['duration']}"]
    cues += [f'{stamp(cursor)} --> {stamp(cursor+cue["duration"])}',text,'']
    manifest.append({'asset':cue['asset'],'source_dimensions':Image.open(source).size,'sequence_start':cursor,'sequence_end':cursor+cue['duration'],'fit':'contain, uniform scale <= 1','audio_owner':'intentional silence','provenance':'Actual Chrome app screenshot captured through CUA'})
    cursor+=cue['duration']
concat.append(f"file 'scene-{len(timeline):02d}.png'")
(OUT/'sequence.ffconcat').write_text('\n'.join(concat),encoding='utf8')
(ROOT/'commentary.vtt').write_text('\n'.join(cues),encoding='utf8')
(ROOT/'manifest.json').write_text(json.dumps({'width':W,'height':H,'fps':FPS,'duration_seconds':cursor,'audio':'none; intentional silent presentation','assets':manifest},indent=2),encoding='utf8')
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
destination=ROOT/'sourcetrail-demo.mp4'
subprocess.run([ffmpeg,'-y','-v','error','-f','concat','-safe','0','-i',str(OUT/'sequence.ffconcat'),'-vf',f'fps={FPS}','-frames:v',str(cursor*FPS),'-an','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(destination)],check=True)
subprocess.run([ffmpeg,'-v','error','-i',str(destination),'-f','null','-'],check=True)
# Inspect decoded exported frames, not only pre-encode sources.
sheet=Image.new('RGB',(960,800),'white')
cursor=0
for i,cue in enumerate(timeline):
    still=OUT/f'qa-{i+1:02d}.png'
    subprocess.run([ffmpeg,'-y','-v','error','-ss',str(cursor+cue['duration']/2),'-i',str(destination),'-frames:v','1',str(still)],check=True)
    thumbnail=Image.open(still).convert('RGB').resize((320,266))
    sheet.paste(thumbnail,((i%3)*320,(i//3)*266))
    cursor+=cue['duration']
sheet.save(OUT/'contact-sheet.jpg')
print(f'Rendered {cursor}s silent presentation: {destination}')
