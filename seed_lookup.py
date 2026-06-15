from app.db import SessionLocal
from app import models


STATUSES = [
    (1, "Activo"),
    (2, "Pendiente"),
    (3, "Finalizado"),
    (4, "Cancelado"),
]

COMPLETIONS = [
    (1, "Pedido"),
    (2, "Cobrado"),
    (3, "Recibido"),
    (4, "Facturado"),
    (5, "Pendiente"),
    (6, "Cancelado"),
]


def set_label(obj, label: str):
    """
    Uses obj.option if the model has 'option',
    otherwise uses obj.name.
    """
    if hasattr(obj, "option"):
        obj.option = label
    elif hasattr(obj, "name"):
        obj.name = label
    else:
        raise AttributeError(
            f"{obj.__class__.__name__} has no 'option' or 'name' column"
        )


def make_status(status_id: int, label: str):
    kwargs = {"id": status_id}

    if hasattr(models.StatusOptions, "option"):
        kwargs["option"] = label
    elif hasattr(models.StatusOptions, "name"):
        kwargs["name"] = label
    else:
        raise AttributeError("StatusOptions has no 'option' or 'name' column")

    return models.StatusOptions(**kwargs)


def make_completion(completion_id: int, label: str):
    kwargs = {"id": completion_id}

    if hasattr(models.CompletionOptions, "option"):
        kwargs["option"] = label
    elif hasattr(models.CompletionOptions, "name"):
        kwargs["name"] = label
    else:
        raise AttributeError("CompletionOptions has no 'option' or 'name' column")

    return models.CompletionOptions(**kwargs)


db = SessionLocal()

try:
    for status_id, label in STATUSES:
        existing = (
            db.query(models.StatusOptions)
            .filter(models.StatusOptions.id == status_id)
            .first()
        )

        if existing is None:
            db.add(make_status(status_id, label))
        else:
            set_label(existing, label)

    for completion_id, label in COMPLETIONS:
        existing = (
            db.query(models.CompletionOptions)
            .filter(models.CompletionOptions.id == completion_id)
            .first()
        )

        if existing is None:
            db.add(make_completion(completion_id, label))
        else:
            set_label(existing, label)

    db.commit()
    print("Seed completado correctamente.")

finally:
    db.close()
