# Licytacja Smaków Online — wersja 8

Gra internetowa dla **2–4 graczy** albo jednego gracza przeciwko **1–3 komputerom**.

## Najważniejsze funkcje

- pokoje online dla minimum 2 i maksimum 4 osób,
- gospodarz rozpoczyna grę, gdy dołączy odpowiednia liczba osób,
- tryb z komputerem,
- pula 20 różnych dań,
- od 5 do 20 licytowanych dań,
- 10 sekund na każdy ruch,
- automatyczny pas po przekroczeniu czasu,
- automatyczne pomijanie graczy, którzy nie mogą przebić oferty,
- ukryte budżety przeciwników,
- quiz smaków wpływający na ukryte punkty,
- automatyczne dołączanie przez link,
- rewanż w tym samym pokoju,
- tytuł „Największy obżartuch” i tańcząca świnka dla zwycięzcy.

## Publikacja aktualizacji

Na GitHubie podmień:

- `server.js`
- `public/index.html`
- `public/app.js`
- `public/style.css`
- `README.md`

Następnie w Renderze wybierz **Manual Deploy → Deploy latest commit**.

## Uruchomienie lokalne

```bash
npm install
npm start
```

Otwórz `http://localhost:3000`.

## Zasady czasu

Serwer przydziela każdemu uczestnikowi 10 sekund. Jeżeli gracz nie zalicytuje ani nie spasuje, serwer automatycznie wybiera pas. Licznik działa po stronie serwera, więc odświeżenie strony nie zatrzymuje czasu.


## Uproszczona wersja mobilna

Na telefonach:

- własna liczba monet jest widoczna w lewym górnym rogu karty licytacji,
- karta licytacji jest najważniejszym elementem ekranu,
- karty graczy są mniejsze i przewijane poziomo,
- budżety przeciwników pozostają ukryte,
- przyciski licytacji są większe i łatwiejsze do naciskania.
