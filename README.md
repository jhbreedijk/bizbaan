# Bizbaan workstation

One place for a whole renovation project: the request, the call, the calculation, the offer, the planning, the talk with the client, the files and the invoices. Built for Urban of Bizbaan Interior Construction, Amsterdam.

Plain HTML, CSS and JavaScript. No libraries, no server, no database. Runs from GitHub Pages, or from any static server on this folder.

## Finding your way

One menu on top of every screen: **Home, Projects, Calculation, Quotes, Planning, Email, Project folder**, plus **?** (walkthrough) and settings. On Home, a function asks which project; inside a project the menu stays in that project, and tapping the project name switches. On a phone the menu is a row of icons; on iPad it sits under the logo with small labels.

The walkthrough runs the first time the app opens, with an example project, and can be switched off under Settings, Help. `help/bizbaan-manual.pdf` and `help/bizbaan-video.mp4` explain it all; their sources are in `help/src` (`help/src/video/make_music.py` writes the original soundtrack; `help/src/video/anim/video.html` is the video as an animated page, and `anim/record.mjs <screens> [music]` films it frame by frame with puppeteer-core and the installed Chrome).

Links can open a screen directly: `?example` makes the example project, `&go=plan` opens a function, `&tour=0` skips the walkthrough, `&skin=light` sets the look.

## How a project moves

| Stage | Where he works | What the app does |
|---|---|---|
| Request | Info | Reads a pasted request (the bizbaan.nl form's email or JSON, or loose notes) into name, phone, email, address, services, m², wishes and budget. A call checklist lists what is still unknown. |
| Quote | Calculation, Documents | The calculation as before. Saving the offer freezes it; changing it saves a new version. |
| Planned | Planning | Phases in building order, who works when, and tasks that follow from the calculation: buy materials the day before a phase, book subcontractors and the container, invoice 1%, 5%, 45%, 40% and the rest as on bizbaan.nl. |
| Running | Planning, Talk | "Something changed" moves the plan, logs it, shows what it does to the price and offers meerwerk, a new offer version or a mail to the client. |
| Done | Documents | What is still unpaid, and a review request. |

Every project shows one **Next** line with the one thing to do. **Home** shows the requests to call, tasks due in two weeks, a six-week calendar of all projects with each crew member's days (double bookings in red), and every project by stage.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css` | the shell and the look (see `DESIGN.md`) |
| `calc.js` | every sum and every date, as pure functions |
| `lookups.js` | public lookups: PDOK, OSRM, CBS, RDW, Bouwmaat |
| `js/core.js` | helpers, state, saving and syncing, stages, mail templates, field builders |
| `js/calc-view.js` | Calculation tab and the live lookups |
| `js/docs-view.js` | Documents tab: offers, additions and less work, invoices, private sheet |
| `js/request.js` | reading requests, Info tab, call checklist |
| `js/plan.js` | Planning tab, derived tasks, the day grid |
| `js/mails.js` | 90 mail templates: 15 situations, warm, business and short, Dutch and English |
| `js/talk.js` | Mail: write from a template, log calls, the history |
| `js/tour.js` | the walkthrough and the example project |
| `js/files.js` | Folder: ten numbered folders, storage in the browser, zip with printable documents |
| `js/home.js` | Home: next steps, calendar, projects by stage |
| `js/settings-view.js` | Settings: values, materials, crew, partners, mail templates, look, file |
| `js/app.js` | screens, navigation, events, start |
| `test.mjs` | `node test.mjs`: Urban's checks, the VAT rules and the holidays |
| `private/bizbaan-start.json` | his starting values. Ignored by git. Never publish it. |

Each file adds its own actions to one shared list (`A`), so a button's `data-act` always points at a function in the file of the screen it sits on.

## Pricing rules worth knowing

- All costs except food get the profit, error and discount margins. Food goes on after, at cost, and is never profit.
- Painting and Stucco can take 9% VAT, on labour only. Materials stay at 21%. With an all-in m² price, the saved materials for that service are split off at 21%; without saved materials the whole service stays at 21% and the app says so.
- Offers are in whole euros. The largest line, and the largest VAT rate, take the rounding difference, so everything adds up exactly.
- Additions are meerwerk. A minus amount is minderwerk (less work).

## One file, several devices

Save the file in a cloud folder (iCloud Drive, Google Drive or OneDrive) and load it on the other device. Loading merges: for each project, material, template, saved value and permit price the newest version wins, and deletions carry over.

**Files are the exception.** Photos and documents live in the browser of the device they were added on (IndexedDB) and are not in the sync file. "Download the project folder" gives a zip with one folder per kind, for the cloud folder or the bookkeeper.

## Bookkeeping

Kees de Boekhouder has no import and no API. Invoices go there as PDF under Externe facturen (inkomsten); the invoice list CSV is for checking. Receipts are photographed in Kees's own Scan & Herken; a copy can sit in the project's Receipts folder.

## Requests from the website

The bizbaan.nl form posts to the site's own `/api/project-intake` and stores answers in Formbricks. It asks for services, area, dates, budget, priorities, goal, motivation, photos and email. **It does not ask for a name, phone number or address**, which is why the call checklist starts there. A static page cannot receive the form by itself: he pastes the notification or the answers. The next step is the site's endpoint also writing to a place this app can read.

## The joke

The offer button plays a two-second oompah at most once every 7 days. Put a file at `assets/shout.mp3` and it plays that instead.

## To publish

Copy everything except `private/` and `test.mjs` to a GitHub Pages repository.

## Known limits

- Bouwmaat prices are its public prices without VAT, not his account prices. Stock is Bouwmaat's online flag.
- Parking uses the hourly street rate of paid zones within 400 m. RDW has no reliable day tickets for Amsterdam streets.
- Other shops are search links and route stops only.
