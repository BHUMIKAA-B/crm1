import sys
from pathlib import Path

# Add backend directory to sys.path so server and router imports resolve
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from server import app
