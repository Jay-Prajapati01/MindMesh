# MindMesh Clipper (Browser Extension)

One-click save the current page into your MindMesh knowledge base.

## Install (Chrome / Edge, developer mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the MindMesh Clipper and click it on any page.
5. Set the **Backend URL** (default `http://localhost:8000`) and click **Save page**.

The page is sent to `POST /api/web/process`, which extracts the article,
summarizes it, embeds it, and indexes it in Qdrant.

> Note: add `icon48.png` and `icon128.png` to this folder for custom icons,
> or remove the `icons` block from `manifest.json` to use defaults.
