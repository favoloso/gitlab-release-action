# @favoloso/gitlab-release-action

GitHub Action per la pubblicazione su una repository GitLab.

## Setup

Realizzata con [`google/zx`](https://github.com/google/zx).

## Utilizzo

```yaml
name: Release to GitLab
on:
  push:
    branches:
      - main
jobs:
  commit:
    name: Commit & Push
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Release
        uses: favoloso/gitlab-release-action@v1
        with:
          gitlab-token: ${{ secrets.GITLAB_TOKEN }}
          gitlab-url: ${{ vars.GITLAB_REPO_URL }}
          repo-branch: develop
          repo-path: subfolder
          git-user-name: GitHub Action
          git-user-email: bot@my-domain.xyz
          include-from: .gitlabinclude
          dry-run: true # Opzionale, di default è false
```

## Opzioni

### `include-from`

Path al file che contiene l'elenco dei path da includere nel commit. È obbligatorio e puntare ad un file esistente che descrivere un elenco di file da includere nel commit.
Vedere `man rsync` per la documentazione di `--include-from`.
È l'opposto di un file `.gitignore`.

#### Note sui file inclusi

- Le cartelle devono essere indicate con lo **/ finale** e tre asterischi `***`, (es. `assets/***`)
  - `***` indica "la cartella stessa e tutti i suoi sottonodi"
- In caso si voglia *escludere* una cartella, si può indicare con `- path` in una riga dedicata
  - È necessario inserire la regola di esclusione **prima** della regola di inclusione della cartella padre
- Le cartelle e i file annidati devono avere più entry che includono anche la cartella superiore (es. `assets/` e `assets/images/`, solo `assets/images/` non funziona)
- È possibile aggiungere commenti con `#` all'inizio della riga

#### Esempio

```
- /assets/private/***
/assets/***
/src/***
# Oppure, se ad esempio ci sono solamente src/{js,css,dist} e si vuole includere solo dist 
# (notare l'inclusione di `src` su linea dedicata)
src/
src/dist/***
```

#### Proteggere alcuni file con `protect-filters`

È possibile proteggere alcuni file o cartelle dall'essere modificati, aggiungendo un filtro di protezione.
I file o le cartelle protette non verranno modificati se sono già presenti nel repository GitLab.

Ad esempio, per proteggere il file `README.md` e la cartella `assets/private/`, si può utilizzare:

```
protect-filters: README.md,assets/private/**
``` 

### `dry-run`

Se impostato a `true` non effettua il commit su SVN, ma mostra solo le modifiche che verranno effettuate.

### `commit-message`

Messaggio di commit da utilizzare. Di default è `Rilascio %version%`.
Possono essere utilizzate le seguenti variabili:

- `%version%`: versione del package.json. Il percorso del file può essere impostato con `package-json-path`
- `%sha%`: SHA dell'ultimo commit (versione _short_)

### `package-json-path`

Percorso del file `package.json` da utilizzare per estrarre la versione. 
Di default è `package.json`.
