# Touch-Friendly Web Scale Design

## Goal

Make the entire Secret Vaults web app easier to read and operate on touch screens. Apply a larger, consistent scale to buttons, form controls, dialogs, table rows, and key text without redesigning the app structure.

## Scope

In scope:

- Login form.
- Vault header and top actions.
- Filters and table controls.
- Secrets table rows, chips, value reveal/copy controls, and row actions.
- Add/edit secret dialog.
- Delete confirmation dialog.
- Toasts if their current sizing is visibly smaller than the rest of the app.

Out of scope:

- New layout, navigation, or marketing hero.
- New icon system unless current emoji controls cannot be made accessible at the target size.
- Data model, API, authentication, or Google Apps Script changes.

## Visual Direction

Follow the existing dark app and the Binance-inspired `DESIGN.md` direction:

- Keep the near-black canvas and dark card surfaces.
- Use Binance Yellow `#FCD535` for primary CTAs such as unlock, add secret, and save.
- Keep compact radii around 6-12px.
- Avoid gradients, decorative backgrounds, and large marketing composition.
- Keep table density high enough for scanning, but make every row and control touch-friendly.

## Scale Rules

- App body and default form text use `text-base` on all app screens.
- Secondary/meta text uses `text-sm`; avoid `text-xs` except small table headers or helper/error text.
- Buttons, inputs, selects, and dialog action controls have at least `44px` hit height.
- Primary buttons use `48px` height when they anchor a form or dialog.
- Dialog titles move to `text-xl`; page title moves to `text-2xl`.
- Dialog content gets more padding, typically `p-7` or `p-8`.
- Table cells use larger vertical padding, about `py-3`, with larger action hit targets.
- Chips use larger padding and `text-sm` so environment and tag labels remain readable.

## Component Plan

### Login Form

Increase form card padding and title size. Inputs use at least 44px height, and the unlock button uses 48px height. Keep the single-column layout and current validation behavior.

### Vault Shell

Increase page padding, header title size, and action button size. The "Add secret" button becomes a yellow primary CTA. The "Lock" action remains secondary but gets a real touch target.

### Filters And Table

Search input and selects use the same touch-friendly control height. Table header remains compact enough to scan, but body rows use larger padding. Value reveal/copy controls and edit/delete actions become larger click targets while preserving the table layout.

### Secret Dialog

Increase dialog width from `max-w-lg` to `max-w-xl`, increase padding, use larger form controls, and keep two-column fields only where they fit. Environment checkboxes become larger pill-like controls with 44px target height.

### Delete Dialog

Increase dialog padding, title/body text, and action button sizes. Delete stays red because it is destructive; cancel stays secondary.

### Toasts

Set toast text to at least `text-sm` and padding to at least 16px so notifications do not feel smaller than the rest of the app.

## Error Handling

No behavioral changes. Existing validation and API errors remain. Larger error text stays visually subordinate but readable, using `text-sm` with red color.

## Testing

Run:

- `pnpm --filter web typecheck`
- `pnpm --filter web build`

Manual checks:

- Login form at desktop and mobile width.
- Vault table with filters.
- Add secret dialog.
- Edit secret dialog.
- Delete confirmation dialog.
- Empty and loading states.

## Non-Goals

Do not change business logic, persistence, API calls, schema validation, sorting/filtering behavior, or authentication storage.
