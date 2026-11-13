# Pack 361 website

The public website for Cub Scout Pack 361, San Marino, California.
Hosted free on GitHub Pages from this repository.

## Everyday edits (no coding)

Almost everything that changes during the year is in **`assets/settings.js`**:

- next pack meeting (date, time, place)
- the navy registration banner and the bubble
- "Big events this year" on the Home page
- den numbers for each rank
- the registration app link, the medical form link, the T-shirt form link
- the Cubmaster's name

To edit: open `assets/settings.js`, click the **pencil icon**, change the text between the quotes,
then click **Commit changes**. The website updates within a few minutes.
Keep the quotes and commas exactly as they are.

## Page text and photos

| Page | File |
|---|---|
| Home | `index.html` |
| Join | `join-us/index.html` |
| Register | `registration/index.html` (registration form; the form itself is `assets/register.js`) |
| T-shirts | `t-shirts/index.html` (T-shirt order form; the form itself is `assets/shirts.js`) |
| Cub Scouting | `cub-scouting/index.html` |
| Uniforms | `uniforms/index.html` |
| Camping & Hiking | `camping-hiking/index.html` |
| Resources | `pack-resources/index.html` |
| Not found | `404.html` |

Photos live in `assets/img/`. To replace one, upload a new file with **the same file name**
(Add file → Upload files). Keep photos under about 300 KB; 1000 pixels wide is plenty.

The page addresses match the old Google Sites addresses, so old links keep working.

## Rules

- This repository is **public**. Never put rosters, registration data, passwords or anything private here.
- Use photos only if the pack has permission from the families.
- Registration data is never stored on this site. The forms send it straight to the pack's Apps Script app (treasurer@), which saves it in the Registration Sheet on Google Drive.
- Prices, dens, deadlines and the T-shirt pickup note come from the Registration Sheet's Settings / Charges / Dens tabs, not from this site.

## Owners

GitHub organization owners: the treasurer@ account and one backup owner.
When volunteers change, add the new person as an owner before removing the old one.
