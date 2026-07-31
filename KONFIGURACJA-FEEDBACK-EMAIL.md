# Feedback na istniejącą skrzynkę e-mail — bez Resend

Ta wersja korzysta bezpośrednio z serwera SMTP Twojej obecnej poczty.
Nie trzeba zakładać konta w dodatkowej usłudze wysyłkowej.

## Najprostsza konfiguracja Gmail

### 1. Włącz weryfikację dwuetapową konta Google

Hasło do aplikacji jest dostępne dla kont obsługujących tę funkcję po
włączeniu weryfikacji dwuetapowej.

### 2. Utwórz hasło do aplikacji

W ustawieniach konta Google utwórz hasło do aplikacji dla Aukcyjnej Areny.
Do Rendera wpisujesz to specjalne hasło, a nie zwykłe hasło do Gmaila.

### 3. Dodaj zmienne w Renderze

Otwórz:

Settings → Environment → Add Environment Variable

Dodaj:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=twoj-adres@gmail.com
SMTP_PASS=szesnastoznakowe_haslo_do_aplikacji
FEEDBACK_TO_EMAIL=twoj-adres@gmail.com
FEEDBACK_FROM_EMAIL=Aukcyjna Arena <twoj-adres@gmail.com>
```

Nie wpisuj tych danych w plikach na GitHubie.

## Outlook / Hotmail

Dla istniejącej skrzynki Outlook można zacząć od:

```text
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=twoj-adres@outlook.com
SMTP_PASS=haslo_lub_haslo_do_aplikacji
FEEDBACK_TO_EMAIL=twoj-adres@outlook.com
FEEDBACK_FROM_EMAIL=Aukcyjna Arena <twoj-adres@outlook.com>
```

Dostawca poczty może wymagać hasła do aplikacji lub dodatkowego
zatwierdzenia logowania.

## Inny dostawca poczty

Potrzebne są dane SMTP od dostawcy:

- adres serwera SMTP,
- port,
- informacja, czy połączenie jest zabezpieczone od początku,
- login,
- hasło lub hasło do aplikacji.

## Po zapisaniu zmiennych

W Renderze wybierz:

Manual Deploy → Deploy latest commit

Następnie wyślij próbną opinię z formularza na dole strony.

## Bez żadnego hasła w Renderze

Jedyną możliwością bez podawania danych SMTP jest przycisk otwierający
program pocztowy gracza (`mailto:`). Wtedy wiadomość nie wysyła się
automatycznie — gracz musi sam nacisnąć „Wyślij”.
