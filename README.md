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


## Poprawki wersji 10

- Każda osoba dołączająca przez link najpierw wpisuje własną nazwę gracza.
- Nazwa nie jest już automatycznie ustawiana jako „Gracz 2”.
- Gracze z zerowym budżetem nie otrzymują kolejnych tur.
- Jeżeli tylko jeden gracz ma jeszcze monety, gra kończy się natychmiast.
- Dotyczy to również rozgrywek dla 3 i 4 osób oraz gry z komputerami.


## Poprawki wersji 11

- Rozłączony gracz jest automatycznie pomijany w kolejce.
- Jeżeli rozłączy się podczas swojej tury, serwer automatycznie wybiera pas.
- Po ponownym połączeniu wraca do gry od kolejnej licytacji.
- Po zakończeniu gry pokój może zostać ponownie otwarty.
- Nowy gracz może wejść do zakończonego pokoju, jeżeli jest wolne miejsce.
- Rozłączeni uczestnicy poprzedniej gry są usuwani przy ponownym otwieraniu pokoju.


## Zasady 5 miejsc na dania

- Każdy gracz może zdobyć maksymalnie 5 dań.
- Liczba dań w grze jest wyliczana automatycznie:
  - 2 graczy: 10 dań,
  - 3 graczy: 15 dań,
  - 4 graczy: 20 dań.
- Usunięto ręczny wybór liczby dań.
- Gracz z kompletem 5 dań jest pomijany w kolejnych licytacjach.
- Jeżeli tylko jedna osoba ma jeszcze wolne miejsca, pozostałe dania są jej przyznawane bez licytacji, aż zapełni 5 miejsc.


## Poprawka wersji 13

- Gracz z zerowym budżetem nie jest już liczony jako osoba mogąca zdobywać kolejne dania.
- Rozłączony gracz również nie blokuje automatycznego przydzielenia pozostałych dań.
- Gdy zostanie tylko jeden aktywny gracz z monetami i wolnymi miejscami, otrzymuje pozostałe dania za 0 monet, aż osiągnie 5/5.


## Poprawka wersji 14

Po zakończeniu każdej licytacji gra najpierw sprawdza, czy został tylko jeden aktywny gracz z monetami i wolnymi miejscami. Jeżeli tak, dostaje on pozostałe dania za 0 monet aż do 5/5. Dopiero później sprawdzany jest warunek zakończenia gry z powodu braku monet.


## Wersja 15 — podium i kategorie

### Podium wyników

Po zakończeniu gry trzech najlepszych graczy jest pokazywanych na podium:

- 1. miejsce — złoty stopień i tańcząca świnka,
- 2. miejsce — srebrny stopień,
- 3. miejsce — brązowy stopień.

Pełna lista wyników nadal znajduje się pod podium.

### Kategorie licytacji

Gospodarz wybiera kategorię przed utworzeniem pokoju:

- miks wszystkiego,
- dania główne,
- desery,
- napoje,
- przekąski.

Quiz smaków i pula licytowanych produktów korzystają tylko z wybranej kategorii.


## Wersja 16 — większa świnka i brak powtórek

- Świnka zwycięzcy na podium jest znacznie większa.
- Powiększono także świnkę przy tytule „Największy obżartuch”.
- Produkty nie powtarzają się w obrębie jednej rozgrywki.
- Każda kategoria ma co najmniej 20 unikalnych pozycji, więc również gra dla 4 osób może użyć 20 różnych produktów.
- Rewanż losuje nowy zestaw, ale w pojedynczej grze każdy produkt występuje maksymalnie raz.


## Wersja 17 — zawody i pojazdy

Dodano dwie nowe kategorie:

- **Zawody** — 20 unikalnych profesji,
- **Pojazdy** — 20 unikalnych środków transportu.

Gospodarz wybiera kategorię przed utworzeniem pokoju. Quiz i pula licytowanych obiektów korzystają wyłącznie z wybranej kategorii.


## Wersja 18 — kafelki kategorii i ikony zwycięzców

- Kategorie są pokazane jako interaktywne kafelki z ikoną i opisem.
- Kliknięcie kafelka rozwija go i ustawia wybraną kategorię.
- Z rozwiniętego kafelka można od razu utworzyć pokój w wybranej kategorii.
- Kategoria pokoju jest widoczna w poczekalni i podczas gry.
- Ikona zwycięzcy zależy od kategorii:
  - jedzenie, desery, napoje i przekąski: tańcząca świnka,
  - pojazdy: tańczący samochód,
  - zawody: tańczący astronauta,
  - miks: tańcząca świnka.
- Dla pojazdów zwycięzca otrzymuje tytuł „Król pojazdów”.
- Dla zawodów zwycięzca otrzymuje tytuł „Mistrz zawodów”.


## Wersja 19 — nowa nazwa i poprawiony układ

Gra nazywa się teraz **Aukcyjna Arena**, ponieważ obejmuje jedzenie, zawody, pojazdy i kolejne kategorie.

Na komputerach:
- kategorie zajmują całą szerokość górnej części strony,
- formularze tworzenia i dołączania są w równych kolumnach poniżej,
- opis kategorii i przyciski nie nachodzą na siebie,
- ekran lepiej wykorzystuje szerokość monitora.

Na telefonach układ nadal zmienia się w prostą, pionową wersję.


## Wersja 20 — nazewnictwo zależne od kategorii

Interfejs używa teraz odpowiednich określeń:

- dania główne: „dania”,
- desery: „desery”,
- napoje: „napoje”,
- przekąski: „przekąski”,
- zawody: „zawody”,
- pojazdy: „pojazdy”,
- miks: „elementy”.

Zmiana obejmuje karty graczy, licznik 0/5, komunikat o pustej kolekcji, numer rundy, podium i podsumowanie.


## Wersja 21 — poprawka powtarzających się elementów

Usunięto błąd, przez który aktualnie wylicytowany element mógł zostać ponownie dodany podczas automatycznego uzupełniania kolekcji.

Dodatkowe zabezpieczenia:

- następna runda jest ustawiana przed automatycznym rozdaniem pozostałych elementów,
- automatyczne rozdanie pomija wszystko, co już posiada którykolwiek gracz,
- pula gry jest dodatkowo oczyszczana z powtarzających się nazw,
- jeden element może trafić do graczy maksymalnie jeden raz w danej rozgrywce.


## Wersja 22 — każdy kończy z kompletem 5/5

Na końcu rozgrywki serwer sprawdza kolekcje wszystkich uczestników.

Jeżeli jakieś elementy nie zostały wylicytowane, ponieważ wszyscy spasowali albo gra zakończyła się wcześniej:

- niewylicytowane pozycje są rozdawane za 0 monet,
- najpierw otrzymują je gracze z najmniejszą liczbą elementów,
- każdy uczestnik jest uzupełniany do 5/5,
- żaden element nie może zostać przyznany dwa razy.
