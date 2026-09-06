#!/usr/bin/env python3
"""Tests voor zins- en halfzinsplitsing in readalong.py."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import readalong as ra


def parts(text, max_words=16, min_words=4):
    return [" ".join(p) for p in ra.split_long(text.split(), max_words, min_words)]


class SplitSentencesTest(unittest.TestCase):
    def test_keeps_abbreviation(self):
        sents = ra.split_sentences(
            "Vi hadde f.eks. hjemmelagd lasagne ofte.")
        self.assertEqual(len(sents), 1)

    def test_keeps_ordinal_date(self):
        sents = ra.split_sentences(
            "Hun døde den 14. desember, samme dato som hennes far.")
        self.assertEqual(len(sents), 1)

    def test_splits_real_sentence_end(self):
        sents = ra.split_sentences(
            "Oh pizza, dat is cool! Waarom vind je dat zo lekker?")
        self.assertEqual(len(sents), 2)


class SplitLongTest(unittest.TestCase):
    def test_taco_friday_example(self):
        text = (
            "Før så bestemte jo ikke vi så mye, eller på åttitallet så bestemte "
            "ikke ungene alt, men det gjør de i dag, så det er liksom sånn det "
            "er taco på fredag og pizza på lørdag i liksom 90% av norske hjem "
            "trur jeg."
        )
        got = parts(text)
        self.assertGreaterEqual(len(got), 2)
        self.assertLessEqual(len(got), 3)
        joined = " ".join(got)
        self.assertEqual(joined, text)
        # De taco/pizza-opsomming hoort bij elkaar, niet geknipt op 'og pizza'.
        self.assertTrue(any("taco på fredag og pizza på lørdag" in p for p in got))
        self.assertFalse(any(p.startswith("og pizza") for p in got))

    def test_moussaka_example(self):
        text = (
            "Det var mamma som bestemte menyen og vi hadde f.eks. hjemmelagd "
            "lasagne ofte noen ganger moussakka også fordi hun ferierte i Hellas "
            "og plukka opp noen ideer der og tzatziki og med ja gryteretter som "
            "hadde stått lenge litt sånn."
        )
        got = parts(text)
        self.assertEqual(len(got), 2)
        self.assertTrue(got[0].startswith("Det var mamma som bestemte menyen"))
        self.assertTrue(got[1].startswith("fordi hun ferierte i Hellas"))
        self.assertEqual(" ".join(got), text)

    def test_does_not_split_inside_parentheses(self):
        text = (
            "Viktoria av Hessen-Darmstadt, senere Viktoria Mountbatten, "
            "markise av Milford Haven (Victoria Alberta Mathilde Marie; "
            "født 5. april 1863, død 24. september 1950), var den eldste "
            "datteren av Ludvig IV av Hessen-Darmstadt."
        )
        got = parts(text)
        self.assertTrue(any("født 5. april 1863, død 24. september 1950" in p for p in got))
        self.assertEqual(" ".join(got), text)

    def test_written_sentence_without_break_stays(self):
        text = (
            "Er was eens een grote groep kikkers die altijd naar het bos ging "
            "om rond te hangen en zich te vermaken."
        )
        self.assertEqual(parts(text), [text])

    def test_splits_at_maar(self):
        text = (
            "De derde kikker daarentegen bleef klimmen en vallen, maar na een "
            "paar uur slaagde hij erin om naar de oppervlakte te komen."
        )
        got = parts(text)
        self.assertEqual(len(got), 2)
        self.assertTrue(got[1].startswith("maar "))

    def test_does_not_split_noun_phrase_at_midpoint(self):
        text = (
            "In het midden van hun gebruikelijke spelletjes vielen drie van de "
            "kikkers in een diepe put die niemand van hen eerder had opgemerkt."
        )
        got = parts(text)
        self.assertEqual(got, [text])

    def test_og_sa_chain_becomes_few_clauses(self):
        text = (
            "På fredager så bada vi i badekaret og så blei reine og så fikk jeg "
            "og søstera mi lov å gå og ta på oss noe fint og så komme ned og "
            "være pynta til dette måltidet som var taima til halvsju "
            "selvfølgelig sånn at vi kunne liksom se og sitte å se spise foran "
            "tv-en, se på halv sju og spise, det var bare helt nydelig."
        )
        got = parts(text)
        self.assertGreaterEqual(len(got), 2)
        self.assertLessEqual(len(got), 4)
        self.assertEqual(" ".join(got), text)
        # 'jeg og søstera' is één constituent.
        self.assertTrue(any("jeg og søstera" in p for p in got))
        for p in got:
            self.assertGreaterEqual(len(p.split()), 8)

    def test_short_sentence_unchanged(self):
        self.assertEqual(parts("Jeg husker jeg var helt sjokkert."), 
                         ["Jeg husker jeg var helt sjokkert."])

    def test_max_words_zero_disables(self):
        text = (
            "Før så bestemte jo ikke vi så mye, eller på åttitallet så bestemte "
            "ikke ungene alt, men det gjør de i dag."
        )
        self.assertEqual(parts(text, max_words=0), [text])


class SplitTranslationTest(unittest.TestCase):
    def test_proportional_split_snaps_to_comma(self):
        source = (
            "Før så bestemte jo ikke vi så mye, eller på åttitallet så bestemte "
            "ikke ungene alt, men det gjør de i dag, så det er liksom sånn det "
            "er taco på fredag og pizza på lørdag i liksom 90% av norske hjem "
            "trur jeg."
        )
        src_parts = parts(source)
        translated = (
            "Vroeger bepaalden wij niet zo veel, of in de jaren tachtig bepaalden "
            "de kinderen niet alles, maar dat doen ze nu wel, dus het is een "
            "beetje zo dat het taco op vrijdag is en pizza op zaterdag in als "
            "het ware 90% van de Noorse huizen denk ik."
        )
        got = ra.split_translation(source, src_parts, translated)
        self.assertEqual(len(got), len(src_parts))
        self.assertEqual(" ".join(got).split(), translated.split())
        self.assertTrue(all(g.strip() for g in got))

    def test_friday_bath_translation_keeps_phrases(self):
        source = (
            "På fredager så bada vi i badekaret og så blei reine og så fikk jeg "
            "og søstera mi lov å gå og ta på oss noe fint og så komme ned og "
            "være pynta til dette måltidet som var taima til halvsju "
            "selvfølgelig sånn at vi kunne liksom se og sitte å se spise foran "
            "tv-en, se på halv sju og spise, det var bare helt nydelig."
        )
        src_parts = parts(source)
        translated = (
            "Op vrijdag namen we een bad en werden we schoon en toen mochten "
            "ik en mijn zus iets moois aantrekken en naar beneden komen en "
            "aangekleed zijn voor deze maaltijd die getimed was op half zeven "
            "natuurlijk, zodat we voor de tv konden zitten eten, naar het "
            "halfzevenjournaal kijken en eten, het was gewoon heerlijk."
        )
        got = ra.split_translation(source, src_parts, translated)
        self.assertEqual(len(got), len(src_parts))
        self.assertEqual(" ".join(got).split(), translated.split())
        self.assertFalse(any(p.endswith((" we", " naar")) for p in got[:-1]))
        self.assertTrue(any("werden we schoon" in p for p in got))

    def test_empty_translation(self):
        self.assertEqual(
            ra.split_translation("een twee drie vier vijf zes zeven acht",
                                 ["een twee drie vier", "vijf zes zeven acht"],
                                 ""),
            ["", ""],
        )


class InterpolateTimestampsTest(unittest.TestCase):
    def test_word_ratio_and_monotonic(self):
        ts = ra.interpolate_timestamps(
            [0.0, 9.5],
            [[16, 16, 12], [20]],
            15.3,
        )
        self.assertEqual(len(ts), 4)
        self.assertEqual(ts[0], 0.0)
        self.assertTrue(all(ts[i] < ts[i + 1] for i in range(len(ts) - 1)))
        self.assertLess(ts[2], 9.5)
        self.assertEqual(ts[3], 9.5)


class ResegmentBlocksTest(unittest.TestCase):
    def test_keeps_speaker_and_counts(self):
        blocks = [{
            "speaker": "Ane",
            "sentences": [
                "Det var mamma som bestemte menyen og vi hadde f.eks. hjemmelagd "
                "lasagne ofte noen ganger moussakka også fordi hun ferierte i "
                "Hellas og plukka opp noen ideer der og tzatziki og med ja "
                "gryteretter som hadde stått lenge litt sånn.",
                "Ja.",
            ],
        }]
        translations = [[
            "Mama bepaalde het menu en we hadden bijvoorbeeld vaak "
            "zelfgemaakte lasagne, soms ook moussaka omdat ze in Griekenland "
            "op vakantie ging en daar ideeën opdeed, en tzatziki.",
            "Ja.",
        ]]
        new_blocks, new_tr, new_ts = ra.resegment_blocks(
            blocks, translations, [[0.0, 15.3]], 36.2, 16, 4)
        sents = new_blocks[0]["sentences"]
        self.assertEqual(new_blocks[0]["speaker"], "Ane")
        self.assertEqual(len(sents), 3)
        self.assertEqual(len(new_tr[0]), 3)
        self.assertEqual(len(new_ts[0]), 3)
        self.assertEqual(sents[-1], "Ja.")
        self.assertEqual(new_tr[0][-1], "Ja.")

    def test_splits_internal_periods_only_when_long(self):
        short = {
            "sentences": ["Oh pizza, dat is cool! Waarom vind je dat zo lekker?"]
        }
        long = {
            "sentences": [
                "Hun lære meg å nyte det å arbeide hardt og det å være grundig. "
                "Hun sa det hun mente og var åpenhjertig. "
                "Og hun var også helt fri for overlegenhet mot andre mennesker."
            ]
        }
        b1, t1, ts1 = ra.resegment_blocks(
            [short], [["Oh pizza, that's cool! Why do you like it so much?"]],
            [[0.0]], 4.0, 16, 4)
        self.assertEqual(len(b1[0]["sentences"]), 1)
        b2, t2, ts2 = ra.resegment_blocks(
            [long], [["She taught me to enjoy working hard. She said what she thought. And she was also completely free of superiority."]],
            [[0.0]], 10.0, 16, 4)
        self.assertGreaterEqual(len(b2[0]["sentences"]), 3)
        self.assertEqual(len(t2[0]), len(b2[0]["sentences"]))


if __name__ == "__main__":
    unittest.main()
