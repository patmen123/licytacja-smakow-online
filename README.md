# Licytacja Smaków Online

Gra internetowa dla dwóch osób. Gracze mogą korzystać z różnych urządzeń i różnych sieci.

## Funkcje

- tworzenie pokoju z sześcioliterowym kodem,
- link zaproszenia,
- synchronizacja licytacji w czasie rzeczywistym,
- serwer kontrolujący kolejność, budżety i wyniki,
- automatyczny powrót do gry po chwilowym rozłączeniu,
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
