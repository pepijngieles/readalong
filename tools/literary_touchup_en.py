#!/usr/bin/env python3
"""Apply hand-crafted literary overrides to tools/cache/nl/<slug>-en.json."""
import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# index -> literary English (segment-aligned)
OVERRIDES = {
    "rontgenstralen-lorentz": {
        0: "When the editors of De Gids invited me to contribute an essay on the 'X-rays',",
        1: "whose existence Professor Röntgen at Würzburg demonstrated toward the end of last year, I did not hesitate for a moment to declare myself willing.",
        2: "That the new phenomena which now occupy the minds of physicists would also awaken keen interest outside their circle",
        3: "I could take for granted; indeed, in the space of a few months neither any discovery in physics of recent years, nor Hertz's experiments,",
        4: "nor the detection of argon and helium, has been discussed and written about as much as Röntgen's invisible rays.",
        5: "Yet I would have objected to saying anything about them in this place,",
        6: "had the subject not seemed to me pre-eminently suited to a simple treatment intelligible to everyone.",
        7: "Although the discovery required the resources of a well-equipped laboratory, the apparatus employed",
        8: "can, at least in essentials, be described very well in brief terms and without the aid of figures.",
        9: "What mattered was a closed glass tube filled with a highly rarefied gas,",
        10: "so arranged that powerful electrical discharges could be passed through it; further, around that tube, a sleeve of black cardboard",
        11: "that cut off every ray of light on its outward path; finally, in the surrounding dark space, a sheet of paper coated with a fluorescent substance, that is,",
        12: "with a substance that has the property of becoming temporarily luminous itself when irradiated with light.",
        13: "It did so now too, with every electrical discharge, although",
        14: "no trace of light was visible; something other than light,",
        15: "yet something that issued from the discharge apparatus, clearly existed in its vicinity.",
        16: "The name 'X-rays' chosen by Röntgen refers to rectilinear propagation,",
        17: "as appears from the 'shadows' that various objects cast upon the fluorescent screen.",
        18: "It may be mentioned at once that the rays exert a photographic action similar to that of light rays,",
        19: "that they call forth 'images' on sensitive plates, which can be developed in the ordinary way.",
        20: "All this can be said in a few words,",
        21: "and the observations hitherto made could likewise be recounted quickly enough.",
        22: "I imagine, however, that the reader will also wish to learn something of what happens in the discharge tube.",
        23: "In these phenomena, which alas still hold almost as many riddles, lies in any case the origin of the X-rays.",
        24: "By devoting a few pages to them I shall at the same time have occasion",
        25: "to do justice to some of Röntgen's predecessors.",
        50: "if one briefly and plainly labels electricity—or the two electricities—with the name 'substance', this namely:",
    },
    "fabriekskinderen": {
        0: "It is winter.",
        1: "A cold December night, with chill fingers, holds the blindfold over the eyes of old Holland's grey university town.",
        2: "Only a worthy companion of this century's giant spirit wages war with the night and repeatedly tears the blindfold away.",
        3: "Look: gas flames cast a fleeting light from distance to distance into the hollow streets, and yonder along the sombre canals.",
        4: "What is that camp for; what is that light for?",
        5: "For the city has gone to rest and sleeps—or so one might think.",
        6: "Do not believe it, for again and again she must wake and see,",
        7: "wake and see to keep watch against the disaster that might approach.",
        8: "And the old city does not sleep either.",
        9: "Only at times is she seized by a light slumber,",
        10: "and it seems to you as though she dreamed of her ancient fame—like the tender bough on the grey monarch of the Alps,",
        11: "that gently dozes upon her breast, and murmurs and whispers of the greatness of its origin.",
        12: "Yet however fleeting her slumber—ever peering over the blindfold,",
        13: "to keep watch even in the night—she cannot manage it as she would wish.",
        14: "The poor town is ill!",
        15: "Yes, the head is clear, even clearer than before; yes, her heart beats as loudly for virtue and fidelity as in the days of her youth,",
        16: "and yet you see well enough how her right arm lies there as if paralysed.",
        17: "Listen:",
        18: "Part of her noblest sap has passed into impure humours; humours that have formed a repulsive wound;",
        19: "a wound that consumes her strength and in the end will lead her to the ruin of her glorious existence.",
        20: "Poor city!",
        21: "Daughter of the State!",
        22: "Rise up, throw yourself upon your father's breast.",
        23: "There are still sisters who suffer as you do.",
        24: "Beg him to come to the aid",
        25: "of you and of her, to send his servants with medicine and salve, if need be with the sharp lancet.",
        26: "But you, novelist, why do you speak in images and riddles?",
        27: "Do you not already hear the voice that admonishes you to simplicity and calm, that calls to you: Remain who you would be?",
        28: "And yes, he feels the justice of those words; but alas!",
        29: "feverishly his blood raced through his veins, for you see—they have shown him that wound!",
        30: "From him a word was asked to the father of the suffering city; a plea for help, for swift deliverance.",
        31: "Was it any wonder that he had difficulty at once striking the right tone, aware of the high weight of his calling.",
        32: "Henceforth he will strive to be simple, forbiddingly simple.",
        33: "It is winter.",
    },
    "gezondheid-en-ziekte-eijkman": {
        0: "My Curators, Professors, Doctors, Students, and all of you who take an interest in Higher Education in this place,",
        1: "highly esteemed Hearers!",
        2: "Although the time still seems far off when hygiene—as some would have it—will already be taught in primary school,",
        3: "the great value of health is nevertheless imprinted upon us all from our youth.",
        4: "That health is the greatest treasure, and that a sound mind can properly dwell only in a sound body—there you have what",
        90: "I would like to recall how Robert Koch expressed his positive opinion about the specificity of the bacilli he discovered.",
    },
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    args = parser.parse_args()

    path = REPO / "tools" / "cache" / "nl" / f"{args.slug}-en.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    sentences = doc.get("sentences") or []
    overrides = OVERRIDES.get(args.slug, {})
    for idx, text in overrides.items():
        if 0 <= idx < len(sentences):
            sentences[idx] = text
    doc["sentences"] = sentences
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{args.slug}: applied {len(overrides)} overrides")


if __name__ == "__main__":
    main()
