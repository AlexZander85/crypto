# tools/generate_all_psy_atoms_data.py
# Aggregates comprehensive, authentic atomic knowledge cards from all 15 unique sources
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'rag_generators'))

from book_01_jared_tendler import TENDLER_ATOMS
from book_02_tom_hougaard import HOUGAARD_ATOMS
from book_03_mark_douglas import DOUGLAS_ATOMS
from book_04_brent_donnelly import DONNELLY_ATOMS
from book_05_nassim_taleb import TALEB_ATOMS
from book_06_brett_steenbarger import STEENBARGER_ATOMS
from book_07_mark_minervini import MINERVINI_ATOMS
from book_08_jason_zweig import ZWEIG_ATOMS
from book_09_david_spiegelhalter import SPIEGELHALTER_ATOMS
from book_10_roman_mogilat import MOGILAT_ATOMS
from book_11_jack_schwager import SCHWAGER_ATOMS
from book_12_alan_edward import EDWARD_ATOMS
from book_13_steven_goldstein import GOLDSTEIN_ATOMS
from book_14_daniel_crosby import CROSBY_ATOMS
from book_15_morgan_housel import HOUSEL_ATOMS

ALL_PSY_ATOMS = (
    TENDLER_ATOMS +
    HOUGAARD_ATOMS +
    DOUGLAS_ATOMS +
    DONNELLY_ATOMS +
    TALEB_ATOMS +
    STEENBARGER_ATOMS +
    MINERVINI_ATOMS +
    ZWEIG_ATOMS +
    SPIEGELHALTER_ATOMS +
    MOGILAT_ATOMS +
    SCHWAGER_ATOMS +
    EDWARD_ATOMS +
    GOLDSTEIN_ATOMS +
    CROSBY_ATOMS +
    HOUSEL_ATOMS
)

print(f"Total authentic RAG atoms loaded across 15 books: {len(ALL_PSY_ATOMS)}")
