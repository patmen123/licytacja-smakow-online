# Licytacja Smaków Online

Gra internetowa dla dwóch osób. Gracze mogą korzystać z różnych urządzeń i różnych sieci.

## Funkcje

- tworzenie pokoju z sześcioliterowym kodem,
- krótki quiz smaków przed rozpoczęciem gry,
- punkty produktów wyliczane z preferencji obu graczy,
- link zaproszenia,
- opuszczanie i anulowanie pokoju,
- synchronizacja licytacji w czasie rzeczywistym,
- serwer kontrolujący kolejność, budżety i wyniki,
- automatyczny powrót do gry po chwilowym rozłączeniu,
- rewanż w tym samym pokoju bez tworzenia nowego kodu,
- losowe potrawy i ukryte punkty,
- responsywny wygląd na telefonie i komputerze.

## Uruchomienie lokalne

Wymagany jest Node.js 20 lub nowszy.

```bash
npm install
npm start
```

Następnie otwórz:

```text
http://localhost:3000
```

Do testowania na jednym komputerze otwórz stronę w dwóch różnych przeglądarkach albo w zwykłym i prywatnym oknie.

## Publikacja na Render

1. Utwórz nowe repozytorium na GitHubie.
2. Wgraj do niego wszystkie pliki z tego projektu.
3. W Render wybierz **New → Web Service**.
4. Połącz repozytorium.
5. Ustaw:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Opublikuj usługę.
7. Wyślij drugiej osobie publiczny adres nadany przez Render.

Plik `render.yaml` pozwala również utworzyć usługę jako Blueprint.

## Ważne ograniczenie tej wersji

Pokoje są przechowywane w pamięci serwera. Restart lub ponowne wdrożenie serwera usuwa aktywne gry. Dla małej gry to najprostsze rozwiązanie. Wersja produkcyjna działająca na wielu instancjach serwera powinna używać Redis lub bazy danych.

Nie uruchamiaj więcej niż jednej instancji serwera bez dodania współdzielonego magazynu stanu.


## Jak quiz wpływa na punkty

Każda potrawa zaczyna od 5 punktów.

- ulubiona dla jednego gracza: +3 punkty,
- najmniej lubiana dla jednego gracza: -2 punkty,
- wynik jest ograniczony do 1–10 punktów.

Przykłady:
- oboje wybierają produkt jako ulubiony: 10 punktów,
- jedna osoba wybiera go jako ulubiony: 8 punktów,
- jedna osoba go lubi, a druga nie lubi: 6 punktów,
- oboje wybierają go jako najmniej lubiany: 1 punkt.


## Rewanż

Po zakończeniu gry obaj gracze mogą kliknąć **Zagraj ponownie**. Gdy obie osoby są gotowe:

- pokój i kod pozostają bez zmian,
- budżety wracają do wartości początkowej,
- zdobyte potrawy są zerowane,
- losowana jest nowa kolejność potraw,
- zachowywane są odpowiedzi z quizu smaków.
