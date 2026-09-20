import os
import re
import sys
import json
import time
import argparse
from datetime import datetime

# Check for deep_translator
try:
    from deep_translator import GoogleTranslator, MyMemoryTranslator
    HAS_TRANSLATOR = True
except Exception:
    # Provide a lightweight fallback so linters/IDEs don't flag the import as unresolved
    # and so the rest of the code can reference GoogleTranslator safely.
    HAS_TRANSLATOR = False

    class GoogleTranslator:
        def __init__(self, source: str = 'auto', target: str = 'en'):
            self.source = source
            self.target = target

        def translate(self, text: str) -> str:
            # Fallback: return the original text (actual translation not available)
            return text

    class MyMemoryTranslator:
        def __init__(self, source: str = 'auto', target: str = 'it'):
            self.source = source
            self.target = target

        def translate(self, text: str) -> str:
            # Fallback: return the original text (actual translation not available)
            return text

# L10N_DIR = os.path.dirname(os.path.abspath(__file__))
# REPORT_FILE = os.path.join(L10N_DIR, "report_changes.txt")

# Path to the localization files in the Radio_Streaming project
L10N_DIR = r"C:\Apps\AntigravityProject\Radio_Streaming\lib\l10n"
REPORT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report_changes.txt")

# Languages used by MyMemoryTranslator (it expects names, not ISO codes).
MYMEMORY_LANGS = {
    'en': 'english', 'it': 'italian', 'es': 'spanish', 'fr': 'french',
    'ar': 'arabic', 'de': 'german', 'ru': 'russian', 'pt': 'portuguese', 'zh': 'chinese simplified'
}

# Source language of the reference file, set when a sync starts.
REF_LANG = 'en'

def parse_dart_map(file_path: str) -> dict[str, str]:
    """ Extracts message map from a .dart file, handling escaped quotes. """
    if not os.path.exists(file_path):
        return {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Improved regex to handle escaped quotes: 'key': 'value with \'escapes\''
    # It matches the key, the quote type, and the value content (handles escaped chars)
    pattern = re.compile(r"['\"]([^'\"]+)['\"]\s*:\s*(['\"])((?:\\.|(?!\2).)*)\2", re.DOTALL)
    matches = pattern.findall(content)
    
    return {match[0]: match[2] for match in matches} if matches else {}

def translate_text(text: str, target_lang: str, retries: int = 3, delay: float = 1.0) -> str:
    """ Translates text if deep-translator is available, protecting placeholders like {0}. Includes retry logic and rate limiting. """
    if not HAS_TRANSLATOR or not text or not text.strip():
        return text if not HAS_TRANSLATOR else f"TODO: {text}"
    
    lang_map = {
        'en': 'en', 'it': 'it', 'es': 'es', 'fr': 'fr',
        'ar': 'ar', 'de': 'de', 'ru': 'ru', 'pt': 'pt', 'zh': 'zh-CN'
    }
    dest = lang_map.get(target_lang, target_lang)
    mm_source = MYMEMORY_LANGS.get(REF_LANG, 'english')
    mm_dest = MYMEMORY_LANGS.get(target_lang, lang_map.get(target_lang, target_lang))

    # Protect placeholders like {0}, {1}
    placeholders = re.findall(r'(\{\d+\})', text)
    temp_text = text
    for i, p in enumerate(placeholders):
        temp_text = temp_text.replace(p, f" SLOT{i}SLOT ")

    # Google first; MyMemory as automatic fallback when Google is blocked/rate-limited.
    providers = [
        ("GoogleTranslator", lambda: GoogleTranslator(source='auto', target=dest)),
        ("MyMemoryTranslator", lambda: MyMemoryTranslator(source=mm_source, target=mm_dest)),
    ]

    for name, make_translator in providers:
        for attempt in range(1, retries + 1):
            try:
                translator = make_translator()
                translated = translator.translate(temp_text)
                
                # Increased delay to avoid rate limiting
                time.sleep(1.0)
                
                if not translated:
                    raise ValueError("Empty response received from translator.")

                # Check for known error messages in the translated text
                error_patterns = ["Error 500", "Server Error", "That's an error", "Please try again later", "MYMEMORY WARNING"]
                if any(err in translated for err in error_patterns):
                    raise ValueError(f"Translator error detected in response: {translated[:200]}")

                # Restore placeholders
                for i, p in enumerate(placeholders):
                    # Try to match variations the translator might have introduced (spaces etc)
                    pattern = re.compile(rf"\s*SLOT\s*{i}\s*SLOT\s*", re.IGNORECASE)
                    translated = pattern.sub(p, translated)

                # Enforce space-around-placeholder spacing rule
                translated = normalize_placeholder_spacing(translated)

                return translated
            except Exception as e:
                if attempt < retries:
                    wait_time = delay * (2 ** (attempt - 1))
                    print(f"    [Warning] Translation error ({target_lang}, {name}) attempt {attempt}/{retries}: {e}. Retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    print(f"    [Warning] {name} failed for {target_lang} after {retries} attempts: {e}.")

    return f"TODO: {text}"

ERROR_PATTERNS = [
    "Error 500", "Server Error", "That's an error",
    "That's all we know", "!!1500", "Error 500 (Server Error)",
    "There was an error",
]

# Scripts that use spaces between words (placeholder braces get a space around them).
# Latin + Extended, Greek, Cyrillic, Cyrillic Supplement, Latin Extended Additional, Arabic.
WORD_SCRIPTS = "A-Za-z0-9\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u1E00-\u1EFF\u0600-\u06FF"
# Scripts that do NOT use spaces between words (CJK, Hangul, kana). Placeholders keep
# their position but no space is added around them.
NO_SPACE_PLACEHOLDER = re.compile(r"[\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]")

def normalize_placeholder_spacing(text: str) -> str:
    """Ensure a space exists BEFORE '{N}' and AFTER '}N' of a placeholder, but only
    when adjacent to a real word character. Escape sequences (\\n, \\t, ...) and
    CJK/customary units are left untouched. Consecutive placeholders (e.g. {0}{1})
    are not separated."""
    if not text:
        return text
    # Tokenize: treat backslash escapes as indivisible tokens so their last char
    # (e.g. the 'n' of '\n') is not mistaken for a word char.
    toks = []  # (kind, token) kind: 'esc' | 'one'
    i = 0
    n = len(text)
    while i < n:
        if text[i] == "\\" and i + 1 < n:
            toks.append(("esc", text[i:i+2]))
            i += 2
        else:
            toks.append(("one", text[i]))
            i += 1

    WORD_RE = re.compile(r"[" + WORD_SCRIPTS + r"]")

    def is_word(tok) -> bool:
        return tok[0] == "one" and WORD_RE.match(tok[1]) is not None

    def is_placeholder_start(toks, j) -> bool:
        # toks[j] == '{' followed by digits then '}'
        if toks[j][0] != "one" or toks[j][1] != "{":
            return False
        k = j + 1
        while k < len(toks) and toks[k][0] == "one" and toks[k][1].isdigit():
            k += 1
        return k < len(toks) and toks[k][0] == "one" and toks[k][1] == "}"

    def placeholder_end(toks, j) -> int:
        k = j + 1
        while k < len(toks) and toks[k][0] == "one" and toks[k][1].isdigit():
            k += 1
        return k + 1  # index after '}'

    chars = [t[1] for t in toks]
    insert = set()

    j = 0
    m = len(toks)
    while j < m:
        if is_placeholder_start(toks, j):
            end = placeholder_end(toks, j)
            # Only apply the rule when the surrounding text contains NO CJK/unit-less scripts.
            # Simple approach: skip rule entirely if value has CJK chars.
            if not NO_SPACE_PLACEHOLDER.search(text):
                # BEFORE: previous token is a word char -> need space
                if j > 0 and is_word(toks[j - 1]) and not (j >= 2 and toks[j - 2][0] == "esc"):
                    insert.add(j)
                # AFTER: next token after '}' is a word char -> need space
                if end < m and is_word(toks[end]):
                    insert.add(end)
            j = end
        else:
            j += 1

    out = []
    for idx, t in enumerate(toks):
        if idx in insert:
            out.append(" ")
        out.append(t[1])
    return "".join(out)


def verify_placeholder_spacing(filepath: str) -> list[tuple[str, str]]:
    """Check a .dart file: return list of (key, value) where a placeholder '{N}'
    lacks the required space around it (word char adjacent)."""
    data = parse_dart_map(filepath)
    problems = []
    for key, val in data.items():
        fixed = normalize_placeholder_spacing(val)
        if fixed != val:
            problems.append((key, val))
    return problems

def verify_file_errors(filepath: str) -> list[tuple[str, str]]:
    """Check a .dart file for error strings in values.

    A key is flagged only if it contains at least 2 error patterns from the Google
    error page, OR a single high-confidence pattern (Error 500, !!1500, That's all we know).
    This avoids false positives on legitimate strings like 'Please try again later'.
    """
    HIGH_CONFIDENCE = {"Error 500", "!!1500", "That's all we know", "Error 500 (Server Error)"}
    data = parse_dart_map(filepath)
    corrupted = []
    for key, val in data.items():
        matched = [p for p in ERROR_PATTERNS if p in val]
        if not matched:
            continue
        if any(p in HIGH_CONFIDENCE for p in matched):
            corrupted.append((key, val))
        elif len(matched) >= 2:
            corrupted.append((key, val))
    return corrupted

def sync_translations(ref_lang):
    global REF_LANG
    REF_LANG = ref_lang

    ref_file = os.path.join(L10N_DIR, f"{ref_lang}.dart")
    if not os.path.exists(ref_file):
        print(f"Error: Reference file {ref_file} not found.")
        return

    ref_data: dict[str, str] = parse_dart_map(ref_file)
    if not ref_data:
        print(f"Error: Could not read data from {ref_file} or file is empty.")
        return

    all_files = [f for f in os.listdir(L10N_DIR) if f.endswith(".dart") and f != f"{ref_lang}.dart" and f != "app_translations.dart"]
    
    languages = ['en', 'it', 'es', 'fr', 'ar', 'de', 'ru', 'pt', 'zh']
    for lang in languages:
        expected_file = f"{lang}.dart"
        if expected_file != f"{ref_lang}.dart" and expected_file not in all_files:
            all_files.append(expected_file)

    report = [f"Sync Report {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 
              f"Reference: {ref_lang}.dart", "-"*50]

    for filename in all_files:
        lang_code = filename.replace(".dart", "")
        target_path = os.path.join(L10N_DIR, filename)
        
        print(f"Analyzing {filename}...")
        report.append(f"\nAnalyzing {filename}...")
        
        target_data = parse_dart_map(target_path)
        is_new_file = not os.path.exists(target_path) or not target_data
        
        missing_keys = [k for k in ref_data if k not in target_data]
        extra_keys = [k for k in target_data if k not in ref_data] if target_data else []
        
        if extra_keys:
            report.append(f"  Extra keys found: {', '.join(extra_keys)}")
        
        if not missing_keys and not is_new_file:
            report.append("  All keys are aligned.")
            continue

        if is_new_file:
            report.append("  File missing or empty: Full regeneration...")
            print(f"  Regenerating {filename} ({len(ref_data)} keys)...")
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(f"final Map<String, String> {lang_code} = {{\n")
                for i, (key, val) in enumerate(ref_data.items()):
                    if i % 10 == 0:
                        print(f"    progress: {i}/{len(ref_data)}")
                    translated_val = translate_text(val, lang_code)
                    escaped_val = translated_val.replace("'", "\\'")
                    f.write(f"  '{key}': '{escaped_val}',\n")
                f.write("};\n")
            report.append(f"  Created {filename} with {len(ref_data)} keys.")
        else:
            print(f"  Found {len(missing_keys)} missing keys.")
            report.append(f"  Missing keys: {len(missing_keys)}")
            with open(target_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            last_idx = -1
            for i in range(len(lines)-1, -1, -1):
                if '};' in lines[i]:
                    last_idx = i
                    break
            
            if last_idx != -1:
                new_entries = []
                for key in missing_keys:
                    print(f"    Translating key: {key}")
                    translated_val = translate_text(ref_data.get(key, ""), lang_code)
                    escaped_val = translated_val.replace("'", "\\'")
                    new_entries.append(f"  '{key}': '{escaped_val}',\n")
                    report.append(f"    - Added key: {key}")
                
                for entry in reversed(new_entries):
                    lines.insert(last_idx, entry)
                with open(target_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
            else:
                report.append("  ERROR: Could not find map closure '};' in target file.")
                print("  ERROR: Missing map closure. Consider deleting the file and rerunning.")

    # ── Post-sync verification: scan all files for error strings ──
    print("\n--- Verifying translation files for error strings ---")
    error_count = 0
    spacing_count = 0
    for filename in os.listdir(L10N_DIR):
        if not filename.endswith(".dart") or filename == "app_translations.dart":
            continue
        filepath = os.path.join(L10N_DIR, filename)
        corrupted = verify_file_errors(filepath)
        if corrupted:
            for key, val in corrupted:
                print(f"  [!] {filename} -> key '{key}': {val}")
                error_count += 1
        for key, val in verify_placeholder_spacing(filepath):
            print(f"  [~] {filename} -> key '{key}': spacing fixed rule violated")
            spacing_count += 1
    if error_count == 0:
        print("  All files clean. No error strings found.")
    else:
        print(f"\n  WARNING: {error_count} key(s) contain error strings across files!")
        print("  These should be re-translated manually or by re-running the sync.")
    if spacing_count == 0:
        print("  Placeholder spacing rule respected in all files.")
    else:
        print(f"\n  WARNING: {spacing_count} key(s) violate the placeholder spacing rule.")
    report.append(f"\nVerification: {error_count} corrupted key(s), {spacing_count} spacing issue(s) found.")

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    
    print(f"\nSync complete. Report saved in: {REPORT_FILE}")

def main():
    parser = argparse.ArgumentParser(description="Synchronize Dart localization files.")
    parser.add_argument("--ref", "-r", help="Reference language code (e.g., en, it)")
    args = parser.parse_args()

    print("--- Localization Synchronizer (Python) ---")
    
    if not HAS_TRANSLATOR:
        print("\n[ERROR] deep-translator non è installato. La traduzione automatica non è disponibile.")
        print("Installa il pacchetto eseguendo: pip install deep-translator\n")
        return

    files = [f.replace(".dart", "") for f in os.listdir(L10N_DIR) if f.endswith(".dart") and f != "app_translations.dart"]
    
    if not files:
        print("No translation files found.")
        return

    # Use argument if provided, otherwise ask interactively
    if args.ref:
        if args.ref in files:
            sync_translations(args.ref)
        else:
            print(f"Error: '{args.ref}' is not a valid file in this directory.")
            print(f"Available: {', '.join(files)}")
    else:
        print("Available files:")
        for i, f in enumerate(files):
            print(f"[{i}] {f}")
        
        try:
            choice = input("\nChoose reference file (index or code): ")
            if choice.isdigit():
                idx = int(choice)
                if 0 <= idx < len(files):
                    sync_translations(files[idx])
                else:
                    print("Invalid index.")
            elif choice in files:
                sync_translations(choice)
            else:
                print("Invalid choice.")
        except (ValueError, EOFError, KeyboardInterrupt):
            print("\nExiting.")

if __name__ == "__main__":
    main()
