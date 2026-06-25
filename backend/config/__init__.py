import os

# Solo carga Celery si hay un broker de Redis disponible.
# Sin esto, Django crashea al importar la app de Celery cuando no hay Redis.
_broker = os.environ.get('CELERY_BROKER_URL', '')
if _broker and 'redis' in _broker:
    try:
        from .celery import app as celery_app
        __all__ = ('celery_app',)
    except Exception:
        celery_app = None
        __all__ = ()
else:
    celery_app = None
    __all__ = ()

