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

    def cue(key, seconds, first, second, category=None, gain=1):
        event = key.split(":")[1]
        kind = category or (key.split(":")[0] if key.startswith(("spell:", "motion:")) else event)
        result[key] = dict(duration=seconds, category=kind, gain=gain, variants=[first, second])

    # A compact screen-space weapon needs a shorter, lighter cue than a blast or spell.
    # Mix headroom remains calibrated; gain is authored per event, not normalised away.
    cue("rifle:shot", .19, [L("shot1", take=.15, highpass=180, lowpass=7000), L("click", .10, .014, take=.06)],
        [L("shot2", take=.15, highpass=180, lowpass=6500), L("latch", .08, .018, take=.06)], gain=.82)
    cue("rifle:impact", .15, [L("body1"), L("metal1", .10, highpass=600)],
        [L("body2"), L("metal2", .10, highpass=600)], gain=.64)
    cue("rifle:mechanism", .11, [L("latch"), L("click", .2, .04)], [L("click"), L("draw2", .2, .035)], gain=.58)
    cue("shotgun:shot", .29, [L("cannon1", take=.23, highpass=75, lowpass=4500), L("shot3", .45, take=.10)],
        [L("cannon2", take=.23, highpass=75, lowpass=4500), L("bang2", .30, take=.10)], gain=1)
    cue("shotgun:impact", .25, [L("body1"), L("wood3", .25, .009), L("metal3", .10, .016)],
        [L("body2"), L("wood4", .25, .007), L("metal4", .10, .015)], gain=.88)
    cue("shotgun:mechanism", .17, [L("draw1", highpass=160), L("leather1", .2)],
        [L("draw2", highpass=160), L("leather2", .2)], gain=.64)
    cue("shotgun:mechanism:1", .10, [L("latch"), L("metal1", .12)],
        [L("click"), L("metal2", .12)], gain=.72)
    cue("crossbow:shot", .16, [L("bow", take=.085, highpass=320), L("swish2", .18, .018, take=.12, highpass=750, lowpass=5800)],
        [L("bow", .9, start=.012, take=.085, highpass=320), L("swish4", .18, .018, take=.12, highpass=750, lowpass=5600)], gain=.68)
    cue("crossbow:impact", .13, [L("body1", take=.11, highpass=180, lowpass=3000), L("blade1", .10, take=.06, highpass=500)],
        [L("body2", take=.11, highpass=180, lowpass=2800), L("blade2", .10, take=.06, highpass=500)], gain=.62)
    cue("crossbow:mechanism", .10, [L("leather1", take=.085, highpass=400), L("click", .07, .03, take=.045, highpass=700)],
        [L("leather2", take=.085, highpass=400), L("click", .07, .025, start=.006, take=.045, highpass=650)], gain=.38)
    cue("crossbow:mechanism:1", .07, [L("click", take=.055, highpass=800)],
        [L("click", start=.009, take=.055, highpass=950)], gain=.42)
    cue("shuriken:shot", .20, [L("swish2", highpass=250, lowpass=5000), L("blade1", .16)],
        [L("swish4", highpass=250, lowpass=5000), L("blade2", .16)], gain=.56)
    cue("shuriken:impact", .17, [L("blade1", .7), L("body1", .45), L("metal1", .18)],
        [L("blade2", .7), L("body2", .45), L("metal2", .18)], gain=.68)
    cue("shuriken:mechanism", .14, [L("draw1"), L("leather1", .3)], [L("draw2"), L("leather2", .3)], gain=.42)
    cue("fire:shot", .34, [L("flame", highpass=80, lowpass=3800), L("fire", .30, start=.35), L("bang1", .07, take=.09)],
        [L("flame", .9, start=.04, highpass=80, lowpass=3800), L("fire", .35, start=1.4), L("bang2", .07, take=.09)], gain=.84)
    cue("fire:impact", .47, [L("fire", 1, start=.5), L("dull", .32, lowpass=1700)],
        [L("fire", 1, start=1.7), L("bang2", .28, lowpass=1800)], gain=1)
    cue("fire:mechanism", .18, [L("fire", 1, start=.2, highpass=500)],
        [L("fire", 1, start=1.3, highpass=500)], gain=.34)
    cue("dark:shot", .35, [L("swish2", reverse=True, lowpass=1500, highpass=80), L("body1", .22, .035, lowpass=650)],
        [L("swish4", reverse=True, lowpass=1300, highpass=80), L("body2", .22, .04, lowpass=600)], gain=.82)
    cue("dark:impact", .39, [L("dull", .6, take=.23, lowpass=700), L("cloth2", .65, .025, lowpass=1800)],
        [L("body2", .65, take=.22, lowpass=650), L("cloth4", .8, .025, lowpass=1500)], gain=.88)
    cue("dark:mechanism", .22, [L("cloth2", reverse=True, lowpass=1100)],
        [L("cloth4", reverse=True, lowpass=1000)], gain=.36)
    cue("shade:shot", .25, [L("swish2", lowpass=1800, highpass=85), L("cloth2", .5, reverse=True, lowpass=1600), L("body1", .16, lowpass=550)],
        [L("swish4", lowpass=1700, highpass=85), L("cloth4", .5, reverse=True, lowpass=1400), L("body2", .16, lowpass=500)], gain=.70)
    cue("shade:impact", .24, [L("body1", .7, lowpass=750), L("cloth1", .55, .018, lowpass=1900)],
        [L("body2", .7, lowpass=700), L("cloth3", .55, .018, lowpass=1800)], gain=.78)
    cue("shade:mechanism", .19, [L("cloth1", reverse=True, lowpass=1200)], [L("cloth3", reverse=True, lowpass=1000)], gain=.32)
    cue("shadowblade:shot", .30, [L("swish3", lowpass=2800), L("cloth1", .45, reverse=True, lowpass=1300), L("blade1", .16)],
        [L("swish4", lowpass=2600), L("cloth3", .45, reverse=True, lowpass=1200), L("blade2", .16)], gain=.72)
    cue("shadowblade:impact", .27, [L("blade1", .65), L("body1", .7, lowpass=1100), L("metal3", .12, lowpass=2400)],
        [L("blade2", .65), L("body2", .7, lowpass=1000), L("metal4", .12, lowpass=2200)], gain=.88)
    cue("shadowblade:mechanism", .20, [L("cloth2"), L("draw1", .2)], [L("cloth4"), L("draw2", .2)], gain=.34)
    cue("grimoire:shot", .39, [L("swish2", 1, reverse=True, lowpass=1200), L("cloth2", .45, lowpass=1600)],
        [L("swish4", 1, reverse=True, lowpass=1000), L("cloth4", .45, lowpass=1500)], gain=.65)
    cue("grimoire:impact", .46, [L("dull", .75, take=.27, lowpass=600), L("swish3", .55, .025, lowpass=1700)],
        [L("body2", .8, take=.25, lowpass=550), L("swish4", .7, .025, lowpass=1500)], gain=1)
    cue("grimoire:mechanism", .20, [L("page1", .8), L("paper1", .12)],
        [L("page2", .8), L("paper2", .12)], gain=.36)
    cue("harpoon:shot", .24, [L("swish2"), L("splash1", .18, highpass=550, lowpass=4300)],
        [L("swish3"), L("splash2", .18, highpass=550, lowpass=4300)], gain=.70)
    cue("harpoon:impact", .26, [L("body1", .65), L("metal3", .2, lowpass=2800), L("splash3", .35)],
        [L("body2", .65), L("metal4", .2, lowpass=2600), L("splash4", .35)], gain=.94)
    cue("harpoon:mechanism", .18, [L("leather1"), L("splash1", .12, highpass=600)],
        [L("leather2"), L("splash2", .12, highpass=600)], gain=.36)
    cue("harpoon:shot:1", .32, [L("swish3"), L("splash3", .26, .015, highpass=400)],
        [L("swish4"), L("splash4", .26, .015, highpass=400)], "shot", gain=.76)
    cue("harpoon:shot:2", .37, [L("swish2", .8, reverse=True, take=.17), L("swish3", .65, .15), L("splash2", .26, .13, highpass=350)],
        [L("swish3", .8, reverse=True, take=.17), L("swish4", .65, .15), L("splash4", .26, .13, highpass=350)], "shot", gain=.82)
    cue("harpoon:impact:1", .29, [L("splash3", .55), L("blade1", .4), L("body1", .6)],
        [L("splash4", .55), L("blade2", .4), L("body2", .6)], "impact", gain=.96)
    cue("harpoon:impact:2", .35, [L("splash2", .65), L("metal4", .25, .035, lowpass=2400), L("body1", .7)],
        [L("splash4", .65), L("metal3", .25, .03, lowpass=2400), L("body2", .7)], "impact", gain=1)
    cue("boomerang:shot", .25, [L("swish2", highpass=220, lowpass=4300), L("wood1", .12)],
        [L("swish4", highpass=220, lowpass=4300), L("wood2", .12)], gain=.56)
    cue("boomerang:impact", .17, [L("wood1"), L("body1", .32, lowpass=2300)],
        [L("wood2"), L("body2", .32, lowpass=2300)], gain=.72)
    cue("boomerang:mechanism", .24, [L("swish3", take=.10, highpass=300), L("swish2", .65, .12, take=.10, highpass=300)],
        [L("swish4", take=.10, highpass=300), L("swish3", .65, .12, take=.10, highpass=300)], gain=.40)
    cue("boomerang:mechanism:1", .13, [L("leather1"), L("wood1", .22)],
        [L("leather2"), L("wood2", .22)], "mechanism", gain=.46)
    cue("sporelantern:shot", .27, [L("cloth2", .8, highpass=160, lowpass=2800), L("swish2", .45, lowpass=2300), L("bubble1", .10)],
        [L("cloth4", .8, highpass=160, lowpass=2600), L("swish4", .45, lowpass=2100), L("bubble2", .10)], gain=.62)
    cue("sporelantern:impact", .36, [L("slime3", .23, take=.10), L("cloth1", .9, .018, highpass=190, lowpass=3400)],
        [L("slime4", .23, take=.10), L("cloth3", .9, .018, highpass=190, lowpass=3200)], gain=.78)
    cue("sporelantern:mechanism", .17, [L("leather1"), L("wood1", .10, .025, lowpass=1300)],
        [L("leather2"), L("wood2", .10, .02, lowpass=1300)], gain=.38)
    cue("sporelantern:move", .26, [L("cloth2", reverse=True, lowpass=1700), L("swish2", .3, highpass=160, lowpass=2200)],
        [L("cloth4", reverse=True, lowpass=1600), L("swish4", .3, highpass=160, lowpass=2100)], gain=.72)
    cue("sporelantern:burst", .51, [L("slime3", .15, take=.10), L("swish3", .7, lowpass=2200), L("cloth1", .8, .035, highpass=150, lowpass=2800)],
        [L("slime4", .15, take=.10), L("swish4", .7, lowpass=2000), L("cloth3", .8, .035, highpass=150, lowpass=2600)], gain=.78)
    cue("sporelantern:shield", .36, [L("cloth1", .8, reverse=True, lowpass=1800), L("glass1", .08, .04, lowpass=1700)],
        [L("cloth3", .8, reverse=True, lowpass=1600), L("glass2", .08, .04, lowpass=1500)], gain=.65)
    cue("miasmalantern:shot", .40, [L("swish2", 1, lowpass=1900, highpass=110), L("cloth2", .55, reverse=True, lowpass=1400), L("slime1", .08, take=.10, lowpass=1200)],
        [L("swish4", 1, lowpass=1700, highpass=110), L("cloth4", .55, reverse=True, lowpass=1300), L("slime2", .08, take=.10, lowpass=1100)], gain=.78)
    cue("miasmalantern:impact", .44, [L("cloth1", 1, highpass=160, lowpass=2600), L("swish3", .65, .035, lowpass=1700), L("slime3", .13, take=.11, lowpass=1300)],
        [L("cloth3", 1, highpass=160, lowpass=2400), L("swish4", .65, .03, lowpass=1500), L("slime4", .13, take=.11, lowpass=1200)], gain=.88)
    cue("miasmalantern:charge", .18, [L("cloth1", 1, reverse=True, lowpass=1200), L("swish2", .4, reverse=True, lowpass=1700), L("bubbles", .05, start=.4, lowpass=900)],
        [L("cloth3", 1, reverse=True, lowpass=1000), L("swish4", .4, reverse=True, lowpass=1600), L("bubbles", .05, start=1.7, lowpass=850)], gain=.64)
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
    cue("motion:blink", .25, [L("swish2", reverse=True, highpass=350, lowpass=4800), L("cloth2", .25, .06, highpass=400)],
        [L("swish4", reverse=True, highpass=350, lowpass=4600), L("cloth4", .25, .06, highpass=400)], gain=.74)
    cue("motion:shadowblink", .32, [L("swish3", reverse=True, lowpass=1100), L("cloth1", .5, .04, lowpass=1300)],
        [L("swish4", reverse=True, lowpass=1000), L("cloth3", .5, .04, lowpass=1200)], gain=.86)
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
            cues[key].append(dict(offset=round(offset, 5), duration=len(audio) / RATE, gain=recipe["gain"]))
            records.append(dict(key=key, variant=variant, offset=offset, duration=len(audio) / RATE,
                                category=recipe["category"], gain=recipe["gain"], target_rms=TARGETS[recipe["category"]], layers=layers))
            if "crescendo" in recipe:
                records[-1]["crescendo_seconds"] = recipe["crescendo"]
            atlas.extend(audio)
            atlas.extend([0.0] * round(GAP * RATE))
            if key in ("crossbow:shot", "fire:shot", "sporelantern:shot"):
                preview = [value * recipe["gain"] for value in audio]
                write_wav(report_dir / (key.replace(":", "-") + f"-{variant + 1}.wav"), preview)
                previews.extend(preview)
                previews.extend([0.0] * round(.30 * RATE))
    wav_path = report_dir / "material-sfx-master.wav"
    write_wav(wav_path, atlas)
    write_wav(report_dir / "material-sfx-preview.wav", previews)
    mp3_path = repo / "assets/audio/material-sfx.mp3"
    subprocess.run([args.ffmpeg, "-v", "error", "-y", "-i", str(wav_path), "-c:a", "libmp3lame",
                    "-b:a", "128k", "-ar", str(RATE), "-ac", "1", "-write_xing", "1", str(mp3_path)], check=True)
    decoded = read_audio(args.ffmpeg, mp3_path)
    for record in records:
        start = round(record["offset"] * RATE)
        end = start + round(record["duration"] * RATE)
        samples = decoded[start:end]
        record["decoded_peak"] = round(max(abs(x) for x in samples), 6)
        record["decoded_rms"] = round(rms(samples), 6)
        record["playback_rms"] = round(record["decoded_rms"] * record["gain"], 6)
        record["playback_peak"] = round(record["decoded_peak"] * record["gain"], 6)
        assert 0 < record["gain"] <= 1, record
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
        processing=dict(sample_rate=RATE,channels=1,codec="MP3 128 kbps",gap_seconds=GAP,
            operations=["mono resample", "onset trim", "source region selection", "layer-specific one-pole filtering",
                        "selective reverse", "material layering", "DC removal", "soft peak ceiling", "short edge fades", "RMS calibration"],
            notes=["No generated white-noise or oscillator layers; variation uses different source takes and regions.",
                   "Rifle/shotgun reports are designed from CC0 firework recordings, not claimed as firearm recordings.",
                   "Fire Magic/Catching fire is an authored mixed effect; fireplace, water/slime and Tesla sources include recorded texture.",
                   "OpenGameArt Battle Sound Effects offers CC0 alongside other licenses; the CC0 option is used.",
                   "Encoded category RMS only reserves mixing headroom; exported per-event gain preserves hero and weapon scale.",
                   "Air swings omit collision layers; impact transients are reserved for actual contact. Reload pull and latch have distinct cues.",
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
        decoded_peak=max(record["decoded_peak"] for record in records),
        playback_peak=max(record["playback_peak"] for record in records),
        playback_gain_range=[min(record["gain"] for record in records),max(record["gain"] for record in records)],
        sample_rate=RATE,channels=1,
        minimum_gap=GAP,rms_ranges=rms_ranges,variant_waveform_correlations=variant_correlations,
        maximum_absolute_variant_correlation=max(abs(value) for value in variant_correlations.values()),
        listening_status="Local WAV previews prepared; no claim of human listening approval.",
        verification="Decoded MP3 checked at every exported cue offset; peaks, RMS ranges, durations and file size passed.",
        cues=[{k:v for k,v in record.items() if k != "layers"} for record in records])
    (report_dir / "material-sfx-quality.json").write_text(json.dumps(quality, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in quality.items() if k not in ("cues", "variant_waveform_correlations")}, indent=2))


if __name__ == "__main__":
    main()
