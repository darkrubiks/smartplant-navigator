# Editing the building catalog

`buildings.csv` controls every building card, search result, map marker, contact detail, and route destination. Edit this file to update the page; you do not need to edit HTML or JavaScript.

## Update through GitHub

1. Open `data/buildings.csv` in the GitHub repository and click **Edit this file** (the pencil).
2. Change a row, add a row, or remove a row. Keep the header.
3. Click **Commit changes** to save to `main`, or open a pull request and merge it into `main`.
4. Wait for **Validate and deploy to GitHub Pages** to finish under **Actions**. When it is green, the site has the updated CSV. If validation fails, fix the row identified in the log; the previous working deployment stays available.

You can also download the CSV, edit it in Excel or LibreOffice, and upload the replacement to the same path. Save as **CSV UTF-8**. Import `id`, `number`, and `phone` as **Text** so Excel preserves leading zeros such as building `04`. Decimal coordinates must use a dot, not a comma. Comma-delimited and semicolon-delimited exports are supported.

Saving a file only on your computer does not change GitHub Pages: commit and push/upload it to the repository. Pages is static hosting, so visitors cannot save changes back to GitHub through the page. The page checks for newly published data every 60 seconds while visible, on return to the tab, and when **Refresh data** is clicked. GitHub deployment and caching can add a delay.

## Columns

| Column                             | How to edit                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                               | Required, unique, stable identifier. Keep existing IDs to preserve shared destination links, favorites, and recent destinations. For a new row, a unique value such as `building-150` is sufficient. |
| `number`                           | Required, unique display number, e.g. `04`, `45`, or `P1`. Keep as text.                                                                                                                             |
| `name_pt`, `name_en`               | Portuguese and English names. Keep both columns; at least one name is required per row.                                                                                                              |
| `category`                         | Exactly `industrial`, `social`, `auxiliary`, or `gate`. Controls marker/card color and category filtering.                                                                                           |
| `x`, `y`                           | Required numeric coordinates on the plant drawing: x from 0 to 2698 (left to right), y from 0 to 1964 (top to bottom). These are image coordinates, not latitude/longitude.                          |
| `description_pt`, `description_en` | Descriptions in each language. Optional; empty descriptions show an explicit placeholder. Provide both for custom wording.                                                                           |
| `department`                       | Department label; optional.                                                                                                                                                                          |
| `responsible`                      | Contact person or team; optional.                                                                                                                                                                    |
| `phone`                            | Telephone number; optional. Appears as a call link.                                                                                                                                                  |
| `hours`                            | Opening hours; optional. Existing standard labels are translated.                                                                                                                                    |
| `dock`                             | Dock or delivery point; optional.                                                                                                                                                                    |
| `keywords`                         | Search aliases separated by `                                                                                                                                                                        | `, e.g. `engines | motores | deliveries`. Optional. |

All columns in the shipped header may remain in place even if cells are empty. Optional metadata columns may be omitted entirely. For plain CSV editing, wrap cells containing commas, double quotes, or line breaks in double quotes. Escape a quote inside a quoted cell by doubling it:

```csv
"Restaurant, clinic and offices"
"Entrance marked ""Visitors"""
```

The initial 69 rows were exported from the current public catalog on October 27, 2026. Existing UUIDs and locations were preserved; previously excluded buildings remain absent. Some source records had no description, so those cells are intentionally empty.

## Locations and routes

Moving a row's `x`/`y` moves its marker and updates routes involving it after the CSV reloads. The SVG and CSV both use the original 2698 × 1964 coordinate space, even though the JPEG's natural resolution is 1349 × 982. If measuring on the JPEG, multiply its pixel coordinates by 2. Building details show the current x/y values.

Routes snap to the existing street graph, which lives in `assets/plant.js`. Adding or moving a building does not add a road. Distances and travel times are approximate. GPS appears separately because the drawing has no geographic calibration.
