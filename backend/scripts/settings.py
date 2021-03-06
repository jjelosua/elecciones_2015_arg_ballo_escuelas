import os
from sqlalchemy import types

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://username@localhost:5432/results')

DOCUMENTCLOUD_USERNAME = os.environ.get('DOCUMENTCLOUD_USERNAME',
                                        'user@mail.com')

DOCUMENTCLOUD_PASSWORD = os.environ.get('DOCUMENTCLOUD_PASSWORD',
                                        'pass')

cwd = os.path.dirname(__file__)
INPUT_COMMON_PATH = os.path.join(cwd, '../data/comun')
INPUT_PASO_PATH = os.path.join(cwd, '../data/paso')
INPUT_PV_PATH = os.path.join(cwd, '../data/pv')
INPUT_BALLO_PATH = os.path.join(cwd, '../data/ballo')
OUTPUT_COMMON_PATH = os.path.join(cwd, '../data/comun/output')
OUTPUT_PASO_PATH = os.path.join(cwd, '../data/paso/output')
OUTPUT_PV_PATH = os.path.join(cwd, '../data/pv/output')
OUTPUT_BALLO_PATH = os.path.join(cwd, '../data/ballo/output')

DATABASE_TYPES = {
    'id_establecimiento': types.Integer,
    'id_agrupado': types.Integer,
    'key_sie': types.String(12),
    'id_distrito': types.String(2),
    'id_seccion': types.String(3),
    'id_circuito': types.String(5),
    'mesa_desde': types.String(4),
    'mesa_hasta': types.String(4),
    'num_mesas': types.Integer,
    'latitud': types.Float,
    'longitud': types.Float,
    'key_circ': types.String(17),
    'key_wo_circ': types.String(11),
    'id_mesa': types.String(4),
    'id_partido': types.String(4),
    'siglas': types.String(50),
    'nombre': types.String(200),
    'mesestado': types.Integer,
    'electores': types.Integer,
    'votantes': types.Integer,
    'validos': types.Integer,
    'positivos': types.Float,
    'blancos': types.Integer,
    'nulos': types.Integer,
    'votos': types.Integer,
}
