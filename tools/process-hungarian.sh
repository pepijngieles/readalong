#!/usr/bin/env bash
# Verwerk tien Hongaarse MEK-fragmenten voor Readalong.
# Vereist: export XI_API_KEY=...  (optioneel: export DEEPL_API_KEY=...)
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"
EXTRA=()
if [[ -n "$SLUG" ]]; then
  EXTRA=("$SLUG")
fi

python3 tools/fetch_mek_hu.py "${EXTRA[@]}"

process_one() {
  local slug="$1"
  local heading="$2"
  local title_en="$3"
  local title_nl="$4"
  local level="$5"
  local kind="$6"
  local topic="$7"
  local voice_id="$8"
  local voice_name="$9"
  local attr_title="${10}"
  local attr_url="${11}"
  local text_source="${12}"
  local audio_reader="${13}"
  local audio_url="${14}"
  local audio_recorded="${15:-}"

  local cache="tools/cache/hu/${slug}-scribe.json"
  local args=(
    from-audio
    --audio "tools/cache/hu/${slug}.mp3"
    --script "tools/cache/hu/${slug}.txt"
    --slug "$slug"
    --heading "$heading"
    --voice-id "$voice_id"
    --voice-name "$voice_name"
    --language hu
    --translations en,nl
    --title-en "$title_en"
    --title-nl "$title_nl"
    --level "$level"
    --kind "$kind"
    --attribution-title "$attr_title"
    --attribution-url "$attr_url"
    --rights-text-source "$text_source"
    --rights-text-license "Public domain"
    --rights-text-url "$attr_url"
    --rights-audio-reader "$audio_reader"
    --rights-audio-license "Public domain"
    --rights-audio-url "$audio_url"
    --publish
    --cache "$cache"
  )
  if [[ -n "$audio_recorded" ]]; then
    args+=(--rights-audio-recorded "$audio_recorded")
  fi
  python3 tools/readalong.py "${args[@]}"
}

run_all() {
  process_one a-kis-szurke-ember "A kis szürke ember" "The little grey man" "De kleine grijze man" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/"
  process_one nomen-et-omen "Nomen et omen" "Nomen et omen" "Nomen et omen" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/"
  process_one a-szerencsetlen-szelkakas "A szerencsétlen szélkakas" "The unfortunate weathercock" "De ongelukkige windhaan" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/"
  process_one a-feher-angyal "A fehér angyal" "The white angel" "De witte engel" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/"
  process_one egy-bal "Egy bál" "A ball" "Een bal" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/"
  process_one az-ezermester-es-a-kozak "Az ezermester és a kozák" "The master craftsman and the Cossack" "De meester en de Kozak" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Egy bujdosó naplója — Jókai Mór" "https://mek.oszk.hu/00800/00801/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/"
  process_one magyar-dolgozat "Magyar dolgozat" "Hungarian essay" "Hongaars werkstuk" B1-B2 book fiction bakonyi-orsolya "Bakonyi Orsolya" "Tanár úr kérem — Karinthy Frigyes" "https://mek.oszk.hu/19100/19144/" "MEK / Karinthy Frigyes (public domain)" "Bakonyi Orsolya" "https://mek.oszk.hu/19100/19144/" 2019
  process_one a-rossz-tanulo-felel "A rossz tanuló felel" "The bad student answers" "De slechte leerling antwoordt" B1-B2 book fiction bakonyi-orsolya "Bakonyi Orsolya" "Tanár úr kérem — Karinthy Frigyes" "https://mek.oszk.hu/19100/19144/" "MEK / Karinthy Frigyes (public domain)" "Bakonyi Orsolya" "https://mek.oszk.hu/19100/19144/" 2019
  process_one a-vesztanacs "A vésztanács" "The council of doom" "De noodraad" B1-B2 book fiction bakonyi-orsolya "Bakonyi Orsolya" "Tanár úr kérem — Karinthy Frigyes" "https://mek.oszk.hu/19100/19144/" "MEK / Karinthy Frigyes (public domain)" "Bakonyi Orsolya" "https://mek.oszk.hu/19100/19144/" 2019
  process_one az-elrontott-regeny "Az elrontott regény" "The ruined novel" "De mislukte roman" B2-C1 book biography papp-janos "Papp János" "Jókai Mór élete és kora — Mikszáth Kálmán" "https://mek.oszk.hu/02300/02387/" "MEK / Mikszáth Kálmán (public domain)" "Papp János (MVGYOSZ)" "https://mek.oszk.hu/02300/02387/"
}

if [[ -n "$SLUG" ]]; then
  case "$SLUG" in
    a-kis-szurke-ember) process_one a-kis-szurke-ember "A kis szürke ember" "The little grey man" "De kleine grijze man" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/" ;;
    nomen-et-omen) process_one nomen-et-omen "Nomen et omen" "Nomen et omen" "Nomen et omen" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/" ;;
    a-szerencsetlen-szelkakas) process_one a-szerencsetlen-szelkakas "A szerencsétlen szélkakas" "The unfortunate weathercock" "De ongelukkige windhaan" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/" ;;
    a-feher-angyal) process_one a-feher-angyal "A fehér angyal" "The white angel" "De witte engel" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/" ;;
    egy-bal) process_one egy-bal "Egy bál" "A ball" "Een bal" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Forradalmi és csataképek — Jókai Mór" "https://mek.oszk.hu/00700/00799/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/" ;;
    az-ezermester-es-a-kozak) process_one az-ezermester-es-a-kozak "Az ezermester és a kozák" "The master craftsman and the Cossack" "De meester en de Kozak" B2-C1 book history szoboszlai-eva "Szoboszlai Éva" "Egy bujdosó naplója — Jókai Mór" "https://mek.oszk.hu/00800/00801/" "MEK / Jókai Mór (public domain)" "Szoboszlai Éva (MVGYOSZ)" "https://mek.oszk.hu/02300/02359/" ;;
    magyar-dolgozat) process_one magyar-dolgozat "Magyar dolgozat" "Hungarian essay" "Hongaars werkstuk" B1-B2 book fiction bakonyi-orsolya "Bakonyi Orsolya" "Tanár úr kérem — Karinthy Frigyes" "https://mek.oszk.hu/19100/19144/" "MEK / Karinthy Frigyes (public domain)" "Bakonyi Orsolya" "https://mek.oszk.hu/19100/19144/" 2019 ;;
    a-rossz-tanulo-felel) process_one a-rossz-tanulo-felel "A rossz tanuló felel" "The bad student answers" "De slechte leerling antwoordt" B1-B2 book fiction bakonyi-orsolya "Bakonyi Orsolya" "Tanár úr kérem — Karinthy Frigyes" "https://mek.oszk.hu/19100/19144/" "MEK / Karinthy Frigyes (public domain)" "Bakonyi Orsolya" "https://mek.oszk.hu/19100/19144/" 2019 ;;
    a-vesztanacs) process_one a-vesztanacs "A vésztanács" "The council of doom" "De noodraad" B1-B2 book fiction bakonyi-orsolya "Bakonyi Orsolya" "Tanár úr kérem — Karinthy Frigyes" "https://mek.oszk.hu/19100/19144/" "MEK / Karinthy Frigyes (public domain)" "Bakonyi Orsolya" "https://mek.oszk.hu/19100/19144/" 2019 ;;
    az-elrontott-regeny) process_one az-elrontott-regeny "Az elrontott regény" "The ruined novel" "De mislukte roman" B2-C1 book biography papp-janos "Papp János" "Jókai Mór élete és kora — Mikszáth Kálmán" "https://mek.oszk.hu/02300/02387/" "MEK / Mikszáth Kálmán (public domain)" "Papp János (MVGYOSZ)" "https://mek.oszk.hu/02300/02387/" ;;
    *) echo "Onbekende slug: $SLUG" >&2; exit 1 ;;
  esac
else
  run_all
fi

python3 tools/readalong.py check
