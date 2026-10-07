# Refract

Refract is a browser-based toolkit for working with text, URLs, binary data, hashes, and structured data without sending anything to a server.

Everything runs in the browser, so it is useful for quick decode, format, and inspection work when privacy and speed matter.

## Features

- Encode and decode formats such as Base64, URL percent encoding, HTML entities, hexadecimal, and Unicode escapes.
- Format and inspect structured data such as JSON, text, and binary output.
- Hash values with algorithms such as SHA-256.
- Chain multiple operations in a reusable pipeline.
- Save favorite operations, recent actions, and custom recipes.
- Keep everything local with browser storage and an offline-ready service worker.
- Switch between dark and light themes with persistent preferences.

## Why use Refract

Refract is designed for quick, repeatable data work.

- Decode payloads from APIs or logs.
- Check escaped strings and encoded values.
- Compare outputs across transforms.
- Build a small sequence of operations without leaving the browser.

Because it runs locally, the input stays on the device unless you copy or export it manually.

## Project structure

- `index.html` is the main application shell.
- `css/` contains the layout, component, and responsive styling.
- `js/` holds the application logic for state, UI, operations, and pipelines.
- `sw.js` is the service worker for offline caching support.

## Running locally

This project does not need a build step or package install.

Option 1: open the app directly

- Open `index.html` in a browser.

Option 2: serve it locally

```bash
cd /path/to/refract
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Using the app

1. Paste or type input into the input panel.
2. Choose an operation from the sidebar or command palette.
3. Add it to the transformation pipeline.
4. Adjust the operation options if needed.
5. View the transformed output in real time or with pipeline processing enabled.
6. Save recipes for repeated workflows.

## Typical workflows

- Base64 encode and decode.
- Decode URL query strings and path segments.
- Escape or unescape HTML payloads.
- Inspect binary or hexadecimal output.
- Format JSON into readable text.
- Hash strings for comparison or verification.

## Privacy and security

Refract is intentionally local-first.

- There is no backend service.
- There are no remote API calls for processing.
- No data is transmitted to a server during normal use.

That said, the browser still stores some preferences in `localStorage`, such as theme, favorites, and saved recipes.

## License

This project is under the [MIT License](./LICENSE).
