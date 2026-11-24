import pathlib
import sys


def block_end(text, start):
    """Return the index just past the closing brace of the block that opens at `start`."""
    brace = text.index("{", start)
    depth = 0
    for i in range(brace, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return i + 1
    raise ValueError("unbalanced braces")


globals_css = pathlib.Path("app/globals.css")
src = globals_css.read_text()

dark_marker = '[data-theme="dark"] {'
root_at = src.find(":root {")
dark_at = src.find(dark_marker)

if root_at == -1 or dark_at == -1:
    print("could not find the :root or dark block")
    sys.exit(1)
if src.count(":root {") != 1 or src.count(dark_marker) != 1:
    print("globals.css no longer has exactly one :root and one dark block")
    sys.exit(1)

root_end = block_end(src, root_at)
dark_end = block_end(src, dark_at)

dark_block = src[dark_at:dark_end]
# Keep the dark declarations, hand them to :root, then drop the dark block.
new_root = ":root " + dark_block[len(dark_marker) - 1 :]

out = src[:root_at] + new_root + src[root_end:dark_at] + src[dark_end:]

if "data-theme" in out:
    print("data-theme still referenced in globals.css")
    sys.exit(1)
if out.count(":root {") != 1:
    print("expected exactly one :root block after the patch")
    sys.exit(1)
if "--bg-base: #07050e;" not in out or "color-scheme: dark;" not in out:
    print("dark tokens missing from :root")
    sys.exit(1)

globals_css.write_text(out)
print(f"globals.css: {len(src)} -> {len(out)} bytes")

hover_css = pathlib.Path("app/hover.css")
hover = hover_css.read_text()

light_menu_rules = """:root:not([data-theme="dark"]) .menu-button[aria-expanded="true"] {
  background-color: color-mix(in srgb, var(--accent) 74%, #fff);
  border-color: color-mix(in srgb, var(--accent) 62%, transparent);
  color: #331028;
  transform: scale(.94);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

:root:not([data-theme="dark"]) .menu-button[aria-expanded="true"]:hover {
  background-color: color-mix(in srgb, var(--accent) 82%, #fff);
}

"""

if hover.count(light_menu_rules) != 1:
    print("light-only menu rules not found exactly once in hover.css")
    sys.exit(1)

hover = hover.replace(light_menu_rules, "")
if "data-theme" in hover:
    print("data-theme still referenced in hover.css")
    sys.exit(1)

hover_css.write_text(hover)
print(f"hover.css: patched")
