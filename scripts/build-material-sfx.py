"""Build the CC0 material atlas using Python's standard library and FFmpeg.

python scripts/build-material-sfx.py --materials /path/to/materials --ffmpeg /path/to/ffmpeg
Original source packages and manifest.json stay outside the shipped game.
Recipes use recorded/foley samples only; no generated noise or oscillator layers.
"""

import argparse
import array
import hashlib
import json
import math
import pathlib
import subprocess
import sys
import wave

RATE = 32000
GAP = 0.12  # MP3 filter ringing remains outside the next cue's playback window.
PEAK = 0.34  # Leave headroom for MP3 reconstruction overshoot on sharp metal transients.
TARGETS = {"shot": 0.115, "impact": 0.085, "mechanism": 0.04,
           "charge": 0.045, "spell": 0.134, "motion": 0.065,
           "move": 0.04, "burst": 0.11, "shield": 0.07}

# The first field identifies the preserved source-page/license record.
SAMPLES = {
    "bow": ("oga-bow", "oga-bow/battle_sound_effects/Bow.wav"),
    "swish2": ("oga-bow", "oga-bow/battle_sound_effects/swish_2.wav"),
    "swish3": ("oga-bow", "oga-bow/battle_sound_effects/swish_3.wav"),
    "swish4": ("oga-bow", "oga-bow/battle_sound_effects/swish_4.wav"),
    "fire": ("oga-fire", "archives/fire-1.wav"),
    "flame": ("oga-flame", "archives/flame_0.ogg"),
    "dull": ("oga-dull", "archives/explosion_dull.flac"),
    "spark": ("oga-electric", "oga-electric/spark.wav"),
    "arc": ("oga-electric", "oga-electric/continuousspark.wav"),
    "paper1": ("oga-paper", "oga-paper/WAV/Paper Sound - 1.wav"),
    "paper2": ("oga-paper", "oga-paper/WAV/Paper Sound - 2.wav"),
    "crush1": ("oga-paper", "oga-paper/WAV/Paper Crushed - 1.wav"),
    "crush2": ("oga-paper", "oga-paper/WAV/Paper Crushed - 2.wav"),
    "rip": ("oga-paper", "oga-paper/WAV/Paper Ripped - 1.wav"),
}
for alias, filename in {
    "blade1": "knifeSlice", "blade2": "knifeSlice2", "draw1": "drawKnife1",
    "draw2": "drawKnife2", "latch": "metalLatch", "click": "metalClick",
    "cloth1": "cloth1", "cloth2": "cloth2", "cloth3": "cloth3", "cloth4": "cloth4",
    "leather1": "handleSmallLeather", "leather2": "handleSmallLeather2",
    "page1": "bookFlip1", "page2": "bookFlip2", "book": "bookClose",
    "creak1": "creak1", "creak2": "creak2", "chop": "chop",
}.items():
    SAMPLES[alias] = ("kenney-rpg", f"kenney-rpg/Audio/{filename}.ogg")
for alias, filename in {
    "wood1": "impactWood_light_000", "wood2": "impactWood_light_003",
    "wood3": "impactWood_medium_001", "wood4": "impactPlank_medium_003",
    "metal1": "impactMetal_light_000", "metal2": "impactMetal_light_003",
    "metal3": "impactMetal_medium_001", "metal4": "impactMetal_heavy_003",
    "stone1": "impactMining_001", "stone2": "impactMining_003",
    "glass1": "impactGlass_light_001", "glass2": "impactGlass_light_003",
    "body1": "impactPunch_medium_001", "body2": "impactPunch_medium_003",
}.items():
    SAMPLES[alias] = ("kenney-impact", f"kenney-impact/Audio/{filename}.ogg")
for alias, filename in {
    "ice1": "LedasLuzta", "ice2": "LedasLuzta2", "ice3": "LedasLuzta4",
}.items():
    SAMPLES[alias] = ("oga-ice", f"oga-ice/IceShatters/{filename}.ogg")
for alias, filename in {
    "bubble1": "bubble_01", "bubble2": "bubble_02", "bubble3": "bubble_03",
    "slime1": "slime_01", "slime2": "slime_03", "slime3": "slime_08",
    "slime4": "slime_12", "splash1": "splash_01", "splash2": "splash_03",
    "splash3": "splash_07", "splash4": "splash_10", "bubbles": "loop_bubbles_1",
}.items():
    SAMPLES[alias] = ("oga-water", f"oga-water/{filename}.ogg")
for alias, filename in {
    "shot1": "shot_01", "shot2": "shot_02", "shot3": "shot_03",
    "bang1": "bang_03", "bang2": "bang_06", "cannon1": "cannon_01",
    "cannon2": "cannon_03",
}.items():
    SAMPLES[alias] = ("oga-fireworks", f"oga-fireworks/{filename}.ogg")


def L(sample, gain=1, delay=0, start=0, take=None, reverse=False, lowpass=0, highpass=0):
    return dict(sample=sample, gain=gain, delay=delay, start=start, take=take,
                reverse=reverse, lowpass=lowpass, highpass=highpass)


def recipes():
    """Two separately assembled takes per event; source choice supplies variation."""
    result = {}

    def cue(key, seconds, first, second, category=None):
        event = key.split(":")[1]
        kind = category or (key.split(":")[0] if key.startswith(("spell:", "motion:")) else event)
        result[key] = dict(duration=seconds, category=kind, variants=[first, second])

    cue("rifle:shot", .32, [L("shot1"), L("click", .16, .026)],
        [L("shot2"), L("latch", .13, .035)])
    cue("rifle:impact", .23, [L("metal1", .5), L("body1")], [L("metal2", .5), L("body2")])
    cue("rifle:mechanism", .24, [L("latch"), L("click", .5, .10)], [L("click"), L("draw2", .35, .07)])
    cue("shotgun:shot", .52, [L("cannon1"), L("shot3", .65), L("latch", .18, .12)],
        [L("cannon2"), L("bang2", .65), L("click", .18, .10)])
    cue("shotgun:impact", .33, [L("body1"), L("wood3", .55, .012), L("metal3", .25, .025)],
        [L("body2"), L("wood4", .5, .008), L("metal4", .22, .02)])
    cue("shotgun:mechanism", .35, [L("draw1"), L("latch", .8, .13)], [L("draw2"), L("click", .8, .15)])
    cue("crossbow:shot", .35, [L("bow"), L("wood1", .5), L("latch", .18, .02)],
        [L("bow", .85, start=.025), L("wood2", .55), L("creak2", .18, .025)])
    cue("crossbow:impact", .25, [L("wood3"), L("body1", .5)], [L("wood4"), L("body2", .45)])
    cue("crossbow:mechanism", .31, [L("creak1"), L("wood1", .4, .12)], [L("creak2"), L("wood2", .4, .15)])
    cue("shuriken:shot", .28, [L("blade1"), L("metal1", .22, .04)], [L("blade2"), L("metal2", .22, .035)])
    cue("shuriken:impact", .29, [L("metal1"), L("blade1", .3, .012)], [L("metal2"), L("blade2", .3, .016)])
    cue("shuriken:mechanism", .22, [L("draw1"), L("click", .3, .09)], [L("draw2"), L("latch", .2, .06)])
    cue("fire:shot", .52, [L("flame"), L("fire", .8, start=.35), L("bang1", .3)],
        [L("flame", .7, start=.04), L("fire", 1, start=1.4), L("bang2", .3)])
    cue("fire:impact", .43, [L("fire", 1, start=.5), L("dull", .6)],
        [L("fire", 1, start=1.7), L("bang2", .5, lowpass=1800)])
    cue("fire:mechanism", .30, [L("fire", 1, start=.2), L("click", .15)],
        [L("fire", 1, start=1.3), L("latch", .15)])
    cue("dark:shot", .49, [L("cloth1", 1, reverse=True, lowpass=1600), L("dull", .6, .13)],
        [L("cloth3", 1, reverse=True, lowpass=1300), L("body2", .6, .16, lowpass=900)])
    cue("dark:impact", .43, [L("crush1", 1, lowpass=1700), L("dull", .7)],
        [L("crush2", 1, lowpass=1500), L("body2", .8, lowpass=800)])
    cue("dark:mechanism", .35, [L("cloth2", reverse=True, lowpass=1100)], [L("cloth4", reverse=True, lowpass=1000)])
    cue("shade:shot", .39, [L("paper1", 1, reverse=True, lowpass=2400), L("cloth2", .6, .06)],
        [L("paper2", 1, reverse=True, lowpass=2200), L("cloth4", .6, .07)])
    cue("shade:impact", .37, [L("rip", .7, lowpass=2000), L("body1", .7)],
        [L("crush2", .7, lowpass=1600), L("body2", .7)])
    cue("shade:mechanism", .29, [L("leather1", 1, reverse=True)], [L("leather2", 1, reverse=True)])
    cue("shadowblade:shot", .36, [L("blade1"), L("cloth1", .5, reverse=True, lowpass=1800)],
        [L("blade2"), L("cloth3", .5, reverse=True, lowpass=1700)])
    cue("shadowblade:impact", .34, [L("metal3", .6), L("rip", .65, .018)],
        [L("metal4", .6), L("crush2", .7, .018)])
    cue("shadowblade:mechanism", .26, [L("draw1"), L("cloth2", .4)], [L("draw2"), L("cloth4", .4)])
    cue("grimoire:shot", .40, [L("page1"), L("rip", .55, .07)], [L("page2"), L("crush2", .6, .10)])
    cue("grimoire:impact", .37, [L("crush1"), L("book", .4)], [L("crush2"), L("paper2", .5, .035)])
    cue("grimoire:mechanism", .33, [L("paper1"), L("page1", .55, .10)], [L("paper2"), L("page2", .55, .09)])
    cue("harpoon:shot", .36, [L("metal3", .7), L("splash1", .7), L("swish2", .6)],
        [L("metal4", .65), L("splash2", .8), L("swish3", .55)])
    cue("harpoon:impact", .40, [L("metal3", .7), L("splash3")], [L("metal4", .7), L("splash4")])
    cue("harpoon:mechanism", .30, [L("draw1", .7), L("splash1", .5)], [L("draw2", .7), L("splash2", .5)])
    cue("harpoon:shot:1", .43, [L("swish3"), L("splash3", .55, .02)],
        [L("swish4"), L("splash4", .55, .03)], "shot")
    cue("harpoon:shot:2", .55, [L("draw1", .65), L("splash2", 1, .06), L("metal3", .4, .15)],
        [L("draw2", .65), L("splash4", 1, .04), L("metal4", .4, .17)], "shot")
    cue("harpoon:impact:1", .45, [L("splash3"), L("blade1", .55)], [L("splash4"), L("blade2", .55)], "impact")
    cue("harpoon:impact:2", .55, [L("splash2"), L("metal4", .6, .10)],
        [L("splash4"), L("metal3", .6, .14)], "impact")
    cue("boomerang:shot", .42, [L("swish2"), L("wood1", .4)], [L("swish4"), L("wood2", .4)])
    cue("boomerang:impact", .27, [L("wood3"), L("body1", .45)], [L("wood4"), L("body2", .45)])
    cue("boomerang:mechanism", .31, [L("swish3", take=.13), L("swish2", .7, .15, take=.13)],
        [L("swish4", take=.14), L("swish3", .7, .16, take=.12)])
    cue("boomerang:mechanism:1", .26, [L("wood1"), L("leather1", .6)],
        [L("wood2"), L("leather2", .6)], "mechanism")
    cue("sporelantern:shot", .37, [L("bubble1"), L("slime1", .65, .02)], [L("bubble2"), L("slime2", .65, .015)])
    cue("sporelantern:impact", .42, [L("slime3"), L("bubble3", .5, .08)], [L("slime4"), L("splash2", .4, .06)])
    cue("sporelantern:mechanism", .22, [L("leather1", .65), L("bubble1", .3), L("wood1", .15, .03, lowpass=1300)],
        [L("leather2", .65), L("bubble2", .3), L("wood2", .15, .025, lowpass=1300)])
    cue("sporelantern:move", .24, [L("bubble1", .5), L("leather1", .4)], [L("bubble2", .5), L("leather2", .4)])
    cue("sporelantern:burst", .64, [L("slime3"), L("splash3", .7, .04), L("bubble1", .35, .16)],
        [L("slime4"), L("splash4", .7, .03), L("bubble2", .35, .20)])
    cue("sporelantern:shield", .56, [L("bubble3"), L("glass1", .3, .06), L("bubbles", .5, .11, start=.2)],
        [L("bubble2"), L("glass2", .3, .08), L("bubbles", .5, .13, start=1.4)])
    cue("miasmalantern:shot", .47, [L("slime1", 1, lowpass=1600), L("cloth2", .6, reverse=True)],
        [L("slime2", 1, lowpass=1800), L("cloth4", .6, reverse=True)])
    cue("miasmalantern:impact", .51, [L("slime3", 1, lowpass=2100), L("crush1", .4)],
        [L("slime4", 1, lowpass=1900), L("crush2", .4)])
    cue("miasmalantern:charge", .18, [L("cloth1", .6, reverse=True, lowpass=1200), L("bubbles", .8, start=.4)],
        [L("cloth3", .6, reverse=True, lowpass=1000), L("bubbles", .8, start=1.7)])
    result["miasmalantern:charge"]["crescendo"] = [.08, .15]
    cue("spell:ice", .67, [L("ice1"), L("glass1", .4, .07)], [L("ice2"), L("glass2", .4, .05)])
    cue("spell:storm", .69, [L("arc"), L("spark", .7, .15), L("bang1", .3, .03, lowpass=1100)],
        [L("spark"), L("arc", .75, .20), L("bang2", .3, .05, lowpass=1100)])
    cue("spell:fire", .72, [L("flame"), L("fire", .8, start=.3), L("bang1", .4)],
        [L("fire", 1, start=1.2), L("flame", .8, .10), L("bang2", .45)])
    cue("spell:veil", .64, [L("cloth1", 1, reverse=True), L("paper1", .45, .16, reverse=True)],
        [L("cloth3", 1, reverse=True), L("paper2", .45, .15, reverse=True)])
    cue("spell:chain", .72, [L("spark"), L("metal1", .4, .08), L("arc", .65, .24)],
        [L("arc"), L("metal2", .4, .10), L("spark", .65, .31)])
    cue("spell:rift", .78, [L("rip", 1, reverse=True), L("dull", .7, .20), L("ice1", .45, .30)],
        [L("crush2", 1, reverse=True), L("body2", .7, .23, lowpass=700), L("ice3", .45, .31)])
    cue("spell:dark", .72, [L("cloth2", 1, reverse=True, lowpass=1500), L("dull", .8, .21), L("crush1", .5, .20, lowpass=1300)],
        [L("cloth4", 1, reverse=True, lowpass=1300), L("body2", .8, .18, lowpass=650), L("crush2", .6, .21, lowpass=1500)])
    cue("motion:roll", .37, [L("cloth1"), L("leather1", .6, .08)], [L("cloth3"), L("leather2", .6, .07)])
    cue("motion:blink", .45, [L("cloth2", reverse=True), L("paper1", .45, .16)],
        [L("cloth4", reverse=True), L("paper2", .45, .17)])
    cue("motion:water", .41, [L("splash1"), L("bubble1", .35, .13)], [L("splash2"), L("bubble2", .35, .15)])
    cue("material:stone:impact", .32, [L("stone1"), L("body1", .25)], [L("stone2"), L("body2", .25)], "impact")
    cue("material:wood:impact", .29, [L("wood3"), L("wood1", .25, .04)], [L("wood4"), L("wood2", .25, .04)], "impact")
    cue("material:ice:impact", .42, [L("ice1"), L("glass1", .3)], [L("ice2"), L("glass2", .3)], "impact")
    cue("material:wet:impact", .36, [L("slime1"), L("bubble1", .4)], [L("slime2"), L("bubble2", .4)], "impact")
    cue("material:fire:impact", .43, [L("fire", start=.4), L("dull", .45)], [L("fire", start=1.6), L("bang2", .4)], "impact")
    return result


def rms(samples):
    return math.sqrt(sum(x * x for x in samples) / max(1, len(samples)))


def read_audio(ffmpeg, path):
    data = subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE),
                           "-f", "f32le", "-"], check=True, capture_output=True).stdout
    audio = array.array("f")
    audio.frombytes(data)
    if sys.byteorder != "little":
        audio.byteswap()
    return audio


def filter_audio(values, lowpass=0, highpass=0):
    for cutoff, subtract in ((highpass, True), (lowpass, False)):
        if cutoff:
            alpha = 1 - math.exp(-2 * math.pi * cutoff / RATE)
            state = 0
            filtered = []
            for x in values:
                state += alpha * (x - state)
                filtered.append(x - state if subtract else state)
            values = filtered
    return values


def make_cue(recipe, layers, cache):
    length = round(recipe["duration"] * RATE)
    mix = [0.0] * length
    for layer in layers:
        audio = cache[layer["sample"]]
        # Locate the recorded transient; source-relative start selects a different texture region.
        threshold = max(abs(x) for x in audio) * .015
        onset = next((i for i, x in enumerate(audio) if abs(x) > threshold), 0)
        start = onset + round(layer["start"] * RATE)
        delay = round(layer["delay"] * RATE)
        count = min(length - delay, round((layer["take"] or recipe["duration"]) * RATE))
        values = list(audio[start:start + count])
        if not values:
            raise ValueError(f"Empty sample region: {layer}")
        if layer["reverse"]:
            values.reverse()
        values = filter_audio(values, layer["lowpass"], layer["highpass"])
        scale = layer["gain"] / max(.00001, rms(values))
        for i, value in enumerate(values):
            # Each layer gets a tiny edge fade before assembly to remove edit clicks.
            edge = min(1, i / 64, (len(values) - 1 - i) / 240)
            mix[delay + i] += value * scale * edge
    mean = sum(mix) / length
    mix = [x - mean for x in mix]
    fade_in = 96 if recipe["category"] in ("shot", "impact") else 256
    fade_out = round(.022 * RATE) if "crescendo" in recipe else min(1920, length // 5)
    window = [min(1, i / fade_in, (length - 1 - i) / fade_out) for i in range(length)]
    if "crescendo" in recipe:
        begin, end = recipe["crescendo"]
        for i in range(length):
            progress = max(0, min(1, (i / RATE - begin) / (end - begin)))
            window[i] *= .10 + .90 * (1 - math.cos(math.pi * progress)) / 2
    target = TARGETS[recipe["category"]]
    # A soft ceiling preserves recorded texture while making crowded combat predictable.
    scale = target / max(.00001, rms(mix))
    for _ in range(6):
        output = [PEAK * math.tanh(x * scale / PEAK) * window[i] for i, x in enumerate(mix)]
        scale *= target / max(.00001, rms(output))
    return output


def write_wav(path, values):
    pcm = array.array("h", (round(max(-1, min(1, x)) * 32767) for x in values))
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(path), "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        out.writeframes(pcm.tobytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--materials", type=pathlib.Path, required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--report", type=pathlib.Path)
    args = parser.parse_args()
    repo = pathlib.Path(__file__).resolve().parent.parent
    report_dir = args.report or args.materials.parent
    report_dir.mkdir(parents=True, exist_ok=True)
    (repo / "assets/audio").mkdir(parents=True, exist_ok=True)
    (repo / "docs").mkdir(exist_ok=True)
    plan = recipes()
    used = sorted({layer["sample"] for recipe in plan.values() for take in recipe["variants"] for layer in take})
    cache = {name: read_audio(args.ffmpeg, args.materials / SAMPLES[name][1]) for name in used}
    source_manifest = json.loads((args.materials / "manifest.json").read_text(encoding="utf-8"))
    selected = [{"id": name, "source": SAMPLES[name][0], "file": SAMPLES[name][1],
                 "sha256": hashlib.sha256((args.materials / SAMPLES[name][1]).read_bytes()).hexdigest(),
                 "duration": round(len(cache[name]) / RATE, 5)} for name in used]
    atlas = array.array("f", [0.0] * round(GAP * RATE))
    cues, records = {}, []
    previews = []
    for key, recipe in plan.items():
        cues[key] = []
        for variant, layers in enumerate(recipe["variants"]):
            audio = make_cue(recipe, layers, cache)
            offset = len(atlas) / RATE
            cues[key].append(dict(offset=round(offset, 5), duration=len(audio) / RATE, gain=1))
            records.append(dict(key=key, variant=variant, offset=offset, duration=len(audio) / RATE,
                                category=recipe["category"], target_rms=TARGETS[recipe["category"]], layers=layers))
            if "crescendo" in recipe:
                records[-1]["crescendo_seconds"] = recipe["crescendo"]
            atlas.extend(audio)
            atlas.extend([0.0] * round(GAP * RATE))
            if key in ("crossbow:shot", "fire:shot", "sporelantern:shot"):
                write_wav(report_dir / (key.replace(":", "-") + f"-{variant + 1}.wav"), audio)
                previews.extend(audio)
                previews.extend([0.0] * round(.30 * RATE))
    wav_path = report_dir / "material-sfx-master.wav"
    write_wav(wav_path, atlas)
    write_wav(report_dir / "material-sfx-preview.wav", previews)
    mp3_path = repo / "assets/audio/material-sfx.mp3"
    subprocess.run([args.ffmpeg, "-v", "error", "-y", "-i", str(wav_path), "-c:a", "libmp3lame",
                    "-b:a", "96k", "-ar", str(RATE), "-ac", "1", "-write_xing", "1", str(mp3_path)], check=True)
    decoded = read_audio(args.ffmpeg, mp3_path)
    for record in records:
        start = round(record["offset"] * RATE)
        end = start + round(record["duration"] * RATE)
        samples = decoded[start:end]
        record["decoded_peak"] = round(max(abs(x) for x in samples), 6)
        record["decoded_rms"] = round(rms(samples), 6)
        assert record["decoded_peak"] <= .68, record
        assert abs(record["decoded_rms"] - record["target_rms"]) < .015, record
        bounds = {"shot": (.10, .14), "impact": (.07, .10), "mechanism": (.03, .05),
                  "charge": (.03, .05), "spell": (.12, .15)}.get(record["category"])
        assert not bounds or bounds[0] <= record["decoded_rms"] <= bounds[1], record
        assert record["duration"] <= (.6 if record["category"] == "shot" else .9), record
        if "crescendo_seconds" in record:
            early = rms(samples[:round(.08 * RATE)])
            late = rms(samples[round(.10 * RATE):round(.15 * RATE)])
            record["charge_late_early_rms_ratio"] = round(late / max(1e-9, early), 5)
            assert record["charge_late_early_rms_ratio"] > 1.5, record
    assert len(decoded) >= len(atlas) - 1
    assert mp3_path.stat().st_size < 1_500_000
    assert all(len(v) >= 2 for v in cues.values())
    assert all(a != b for recipe in plan.values() for a, b in [recipe["variants"]])
    # Hurt uses the same material event intentionally, avoiding duplicate encoded clips.
    for material in ("stone", "wood", "ice", "wet", "fire"):
        cues[f"material:{material}:hurt"] = cues[f"material:{material}:impact"]
    js = "// Generated by scripts/build-material-sfx.py. See docs/audio-material-sources.json.\n"
    js += "export const SFX_FILE = 'assets/audio/material-sfx.mp3';\n"
    js += "export const SFX_CUES = " + json.dumps(cues, indent=2) + ";\n"
    (repo / "material-sfx.js").write_text(js, encoding="utf-8")
    used_source_ids = {entry["source"] for entry in selected}
    sources = [{k: v for k, v in source.items() if k not in ("directory", "archive", "bytes")}
               for source in source_manifest["sources"] if source["id"] in used_source_ids]
    provenance = dict(version=1,license="CC0-1.0",checked_on=source_manifest["checked_on"],
        sources=sources, selected_files=selected, cues=records,
        processing=dict(sample_rate=RATE,channels=1,codec="MP3 96 kbps",gap_seconds=GAP,
            operations=["mono resample", "onset trim", "source region selection", "layer-specific one-pole filtering",
                        "selective reverse", "material layering", "DC removal", "soft peak ceiling", "short edge fades", "RMS calibration"],
            notes=["No generated white-noise or oscillator layers; variation uses different source takes and regions.",
                   "Rifle/shotgun reports are designed from CC0 firework recordings, not claimed as firearm recordings.",
                   "Fire Magic/Catching fire is an authored mixed effect; fireplace, water/slime and Tesla sources include recorded texture.",
                   "OpenGameArt Battle Sound Effects offers CC0 alongside other licenses; the CC0 option is used.",
                   "No runtime pitch variation is required by this atlas. Original downloads remain outside the game."]))
    (repo / "docs/audio-material-sources.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding="utf-8")
    variant_correlations = {}
    for key in plan:
        pair = []
        for cue in cues[key]:
            start = round(cue["offset"] * RATE)
            pair.append(decoded[start:start + round(cue["duration"] * RATE)])
        a, b = pair
        energy = math.sqrt(sum(x*x for x in a) * sum(x*x for x in b))
        variant_correlations[key] = round(sum(x*y for x, y in zip(a, b)) / max(1e-9, energy), 6)
    categories = sorted({record["category"] for record in records})
    rms_ranges = {category: [min(record["decoded_rms"] for record in records if record["category"] == category),
                            max(record["decoded_rms"] for record in records if record["category"] == category)]
                  for category in categories}
    quality = dict(cue_keys=len(cues),encoded_variants=len(records),selected_samples=len(selected),
        duration_seconds=len(atlas)/RATE,mp3_bytes=mp3_path.stat().st_size,
        decoded_peak=max(record["decoded_peak"] for record in records),sample_rate=RATE,channels=1,
        minimum_gap=GAP,rms_ranges=rms_ranges,variant_waveform_correlations=variant_correlations,
        maximum_absolute_variant_correlation=max(abs(value) for value in variant_correlations.values()),
        listening_status="Local WAV previews prepared; no claim of human listening approval.",
        verification="Decoded MP3 checked at every exported cue offset; peaks, RMS ranges, durations and file size passed.",
        cues=[{k:v for k,v in record.items() if k != "layers"} for record in records])
    (report_dir / "material-sfx-quality.json").write_text(json.dumps(quality, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in quality.items() if k not in ("cues", "variant_waveform_correlations")}, indent=2))


if __name__ == "__main__":
    main()
