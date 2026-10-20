import os
# Add backend/services to this package's __path__ for proper imports
_backend_services_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend', 'services'))
if _backend_services_path not in __path__:
    __path__.append(_backend_services_path)
