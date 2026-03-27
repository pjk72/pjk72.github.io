import os
import re
import sys
import json
import argparse
from datetime import datetime

# Check for deep_translator
try:
    from deep_translator import GoogleTranslator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False

# L10N_DIR = os.path.dirname(os.path.abspath(__file__))
# REPORT_FILE = os.path.join(L10N_DIR, "report_changes.txt")

# Path to the localization files in the Radio_Streaming project
L10N_DIR = r"C:\Apps\AntigravityProject\Radio_Streaming\lib\l10n"
REPORT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report_changes.txt")

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

def translate_text(text: str, target_lang: str) -> str:
    """ Translates text if deep-translator is available, protecting placeholders like {0}. """
    if not HAS_TRANSLATOR:
        return f"TODO: {text}"
    
    try:
        lang_map = {
            'en': 'en', 'it': 'it', 'es': 'es', 'fr': 'fr',
            'ar': 'ar', 'de': 'de', 'ru': 'ru', 'pt': 'pt', 'zh': 'zh-CN'
        }
        dest = lang_map.get(target_lang, target_lang)

        # Protect placeholders like {0}, {1}
        placeholders = re.findall(r'(\{\d+\})', text)
        temp_text = text
        for i, p in enumerate(placeholders):
            temp_text = temp_text.replace(p, f" SLOT{i}SLOT ")

        translated = GoogleTranslator(source='auto', target=dest).translate(temp_text)
        
        # Restore placeholders
        for i, p in enumerate(placeholders):
            # Try to match variations the translator might have introduced (spaces etc)
            pattern = re.compile(rf"\s*SLOT\s*{i}\s*SLOT\s*", re.IGNORECASE)
            translated = pattern.sub(p, translated)

        return translated
    except Exception as e:
        print(f"Translation Error ({target_lang}): {e}")
        return f"TODO: {text}"

def sync_translations(ref_lang):
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

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    
    print(f"\nSync complete. Report saved in: {REPORT_FILE}")

def main():
    parser = argparse.ArgumentParser(description="Synchronize Dart localization files.")
    parser.add_argument("--ref", "-r", help="Reference language code (e.g., en, it)")
    args = parser.parse_args()

    print("--- Localization Synchronizer (Python) ---")
    
    if not HAS_TRANSLATOR:
        print("\n[WARNING] deep-translator not installed. Missing entries will be placeholders.")
        print("To enable auto-translation, run: pip install deep-translator\n")

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
