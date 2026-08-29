# tools/inspect_psy_sources.py
import os
import zipfile
import re

PSY_DIR = r'D:\crypto\психология'

files = os.listdir(PSY_DIR)
print(f"Total files in directory: {len(files)}")

unique_sources = [
    {"author": "Tom Hougaard", "book": "Best Loser Wins (2022)", "file": [f for f in files if "Hougaard" in f][0]},
    {"author": "Jason Zweig", "book": "Your Money and Your Brain / Мозг и деньги", "file": [f for f in files if "Cveyg" in f][0]},
    {"author": "Brent Donnelly", "book": "Alpha Trader / Альфа-трейдер (2021)", "file": [f for f in files if "Donnelli" in f][0]},
    {"author": "Mark Douglas", "book": "Trading in the Zone / Зональный трейдинг (2000)", "file": [f for f in files if "Duglas" in f][0]},
    {"author": "Morgan Housel", "book": "The Art of Spending Money / Искусство тратить деньги (2024/2025)", "file": [f for f in files if "Hauzel" in f][0]},
    {"author": "Steven Goldstein", "book": "Mastering the Mental Game of Trading (2022)", "file": [f for f in files if "Goldstein" in f][0]},
    {"author": "Mark Minervini", "book": "Mindset Secrets for Winning (2019)", "file": [f for f in files if "Minervini" in f][0]},
    {"author": "Roman Mogilat", "book": "Добро пожаловать в тильт (2023)", "file": [f for f in files if "Mogilat" in f][0]},
    {"author": "Jack Schwager", "book": "Unknown Market Wizards / Таинственные маги рынка (2020)", "file": [f for f in files if "Shvager" in f][0]},
    {"author": "Brett Steenbarger", "book": "Trading Psychology 2.0 / Психология трейдинга (2015)", "file": [f for f in files if "Stinbardzher" in f][0]},
    {"author": "Nassim Nicholas Taleb", "book": "Fooled by Randomness / Одураченные случайностью", "file": [f for f in files if "Taleb" in f][0]},
    {"author": "David Spiegelhalter", "book": "The Art of Uncertainty (2024)", "file": [f for f in files if "Spiegelhalter" in f][0]},
    {"author": "Alan Edward", "book": "The Blueprint to Trading Psychology (2021)", "file": [f for f in files if "Blueprint" in f][0]},
    {"author": "Jared Tendler", "book": "The Mental Game of Trading (2021)", "file": [f for f in files if "Tendler" in f][0]},
    {"author": "Dr. Daniel Crosby", "book": "The Soul of Wealth (2024)", "file": [f for f in files if "Crosby" in f][0]},
]

print(f"\n--- 15 UNIQUE SOURCES VERIFIED ---")
for i, s in enumerate(unique_sources, 1):
    fpath = os.path.join(PSY_DIR, s['file'])
    sz_mb = os.path.getsize(fpath) / (1024 * 1024)
    ext = os.path.splitext(s['file'])[1].upper()
    print(f"{i:2d}. [{ext}] {s['author']} — {s['book']} ({sz_mb:.2f} MB)")
