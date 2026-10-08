// Build the favicon sizes from the vector source and compose a social card
// using the existing, unmodified brand image.
import { readFile, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const root = new URL("../", import.meta.url);
const icon = await readFile(new URL("public/brand/favicon.svg", root));
for (const [size, filename] of [[32, "favicon-32.png"], [180, "apple-touch-icon.png"]]) {
  const result = new ImageResponse(h("img", { src: `data:image/svg+xml;base64,${icon.toString("base64")}`, width: size, height: size }), { width: size, height: size });
  await writeFile(new URL(`public/brand/${filename}`, root), Buffer.from(await result.arrayBuffer()));
}
const logo = await readFile(new URL("public/brand/lado-a-discos-logo.jpg", root));
const response = new ImageResponse(h("div", {
  style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#171512" }
}, h("div", {
  style: { width: 480, height: 480, display: "flex", borderRadius: "50%", overflow: "hidden", border: "2px solid #ded0b4" }
}, h("img", { src: `data:image/jpeg;base64,${logo.toString("base64")}`, width: 480, height: 480, style: { objectFit: "cover" } }))), { width: 1200, height: 630 });
await writeFile(new URL("public/opengraph-image.png", root), Buffer.from(await response.arrayBuffer()));
console.log("Brand assets generated.");
