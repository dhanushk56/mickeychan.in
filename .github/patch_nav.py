import pathlib
import sys


def edit(path, replacements):
    file = pathlib.Path(path)
    text = file.read_text()
    for old, new in replacements:
        found = text.count(old)
        if found != 1:
            print(f"{path}: expected exactly one match for {old.splitlines()[0]!r}, found {found}")
            sys.exit(1)
        text = text.replace(old, new)
    file.write_text(text)
    return len(text)


# --- globals.css: hand the nav over to nav.css -------------------------------

path = pathlib.Path("app/globals.css")
src = path.read_text()

start = src.index("  .site-nav {\n")
end = src.index("  .btn {\n    display: inline-flex;")
if start >= end:
    print("nav block not in the expected order")
    sys.exit(1)
removed = src[start:end]
if ".nav-shell" not in removed or "nav-row-in" not in removed or ".mobile-nav" not in removed:
    print("the block being removed does not look like the nav rules")
    sys.exit(1)
src = src[:start] + src[end:]

scrolled_rule = """.nav-shell[data-scrolled="true"] {
  background: var(--glass-strong);
  box-shadow: 0 24px 50px -24px rgba(10, 5, 22, .7), inset 0 1px 0 var(--glass-highlight);
}

"""
if src.count(scrolled_rule) != 1:
    print("scrolled rule not found exactly once")
    sys.exit(1)
src = src.replace(scrolled_rule, "")

narrow_nav = """  .nav-links { display: none; }
  .menu-button { display: inline-grid; }
  .nav-shell { padding: .5rem .5rem .5rem .75rem; }
"""
if src.count(narrow_nav) != 1:
    print("narrow-screen nav rules not found exactly once")
    sys.exit(1)
src = src.replace(narrow_nav, "")

nav_glass = "  --nav-glass: rgba(12, 8, 22, .44);\n"
if src.count(nav_glass) != 1:
    print("--nav-glass token not found exactly once")
    sys.exit(1)
src = src.replace(nav_glass, "")

if ".site-nav" in src or ".nav-shell" in src or "data-scrolled" in src or "--nav-glass" in src:
    print("nav rules still present in globals.css")
    sys.exit(1)

path.write_text(src)
print(f"globals.css: patched, {len(src)} bytes")


# --- nav.css: keep the look the removed globals rules were providing ---------

size = edit(
    "app/nav.css",
    [
        (
            "  .site-nav {\n    position: fixed;\n    inset: 0 0 auto 0;\n    z-index: 60;\n"
            "    display: flex;\n    justify-content: center;\n    pointer-events: none;\n  }",
            "  .site-nav {\n    position: fixed;\n    inset: 0 0 auto 0;\n    z-index: 60;\n"
            "    display: flex;\n    justify-content: center;\n    pointer-events: none;\n"
            "    padding: .85rem 1.25rem;\n  }",
        ),
        (
            "    padding: 0 1.5rem;\n    background:\n",
            "    padding: 0 1.5rem;\n    max-width: 76rem;\n"
            "    border: 1px solid var(--glass-line);\n    border-radius: 999px;\n    background:\n",
        ),
        (
            "    backdrop-filter: blur(22px) saturate(160%);\n  }\n\n  @media (min-width: 1024px) {",
            "    backdrop-filter: blur(22px) saturate(160%);\n  }\n\n"
            '  .nav-shell[data-scrolled="true"] {\n    background: var(--glass-strong);\n'
            "    box-shadow: 0 24px 50px -24px rgba(10, 5, 22, .7), inset 0 1px 0 var(--glass-highlight);\n"
            "  }\n\n  @media (min-width: 1024px) {",
        ),
        (
            "  .brand-logo {\n    width: 2rem;\n    height: 2rem;\n    border-radius: .5rem;\n    object-fit: cover;\n  }",
            "  .brand-logo {\n    width: 2rem;\n    height: 2rem;\n    border-radius: .5rem;\n    object-fit: cover;\n"
            "    border: 1px solid var(--glass-line);\n    box-shadow: 0 6px 16px -6px rgba(15, 8, 30, .55);\n  }",
        ),
        (
            "  .nav-links {\n    display: flex;\n    align-items: center;\n    gap: .0625rem;\n  }",
            "  .nav-links {\n    display: flex;\n    align-items: center;\n    gap: .0625rem;\n"
            "    padding: .2rem;\n    border-radius: 999px;\n  }",
        ),
        (
            '  .nav-link[data-active="true"] { color: var(--primary); background: var(--hover-tint); }',
            '  .nav-link[data-active="true"] {\n    color: var(--primary);\n    background: var(--hover-tint);\n'
            "    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent);\n  }",
        ),
        (
            "    width: min(20rem, 84vw);\n    padding: 1.1rem .9rem 1.4rem;\n    background:",
            "    width: min(20rem, 84vw);\n    padding: 1.1rem .9rem 1.4rem;\n"
            "    border-radius: 1.4rem;\n    background:",
        ),
        (
            "    transform: translate3d(-104%, 0, 0);\n    visibility: hidden;\n    overflow-y: auto;\n"
            "    transition: transform 460ms var(--ease-soft), visibility 0s linear 460ms;\n  }\n\n"
            '  .mobile-nav[data-open="true"] {\n    transform: none;\n    visibility: visible;\n'
            "    transition: transform 460ms var(--ease-soft), visibility 0s;\n  }",
            "    transform: translate3d(-104%, 0, 0);\n    visibility: hidden;\n    opacity: 0;\n"
            "    pointer-events: none;\n    overflow-y: auto;\n"
            "    transition: transform 460ms var(--ease-soft), opacity 320ms ease,\n"
            "      visibility 0s linear 460ms;\n  }\n\n"
            '  .mobile-nav[data-open="true"] {\n    transform: none;\n    visibility: visible;\n'
            "    opacity: 1;\n    pointer-events: auto;\n"
            "    transition: transform 460ms var(--ease-soft), opacity 320ms ease, visibility 0s;\n  }",
        ),
    ],
)
print(f"nav.css: patched, {size} bytes")
