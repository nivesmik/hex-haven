"""Current approved integration entry point; old long-press policy superseded."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("test-thumb-v081.py")),run_name="__main__")
