from datetime import date
from decimal import Decimal

from app.db import SessionLocal
from app.models import Client, Job, SupplyEntry, WorkEntry

def seed_data():
    db = SessionLocal()

    try:
        client = Client( #Creates a Python object in memory
            name = "Cliente de prueba",
            address = "Calle de prueba 123"
        )
        db.add(client) #Session is aware of object and plan to insert it
        db.commit() #Sends the object to PostgreSQL
        db.refresh(client) #Reloads so the object is in the database (generates id)

        job = Job(
            client_id = client.id,
            title = "Reforma de prueba",
            description = "Trabajo de prueba",
            status = "Activo"
        )
        db.add(job)
        db.commit() #Since job.id is used later on, we have to commit before creating the other objects
        db.refresh(job)

        supply_entry = SupplyEntry(
            job_id = job.id,
            supplier = "Proveedor de prueba",
            reference = "ABC-123",
            total_amount=Decimal("123.45"),
            date=date.today()
        )
        db.add(supply_entry)

        work_entry = WorkEntry(
            job_id=job.id,
            date=date.today(),
            num_workers=2,
            hours_per_worker=Decimal("6.50"),
            title="Instalación de prueba",
            description = "Montaje de prueba",
            location = "Calle de prueba 123"
        )
        db.add(work_entry)

        db.commit() #Since these two don't affect other tables, they can be commited together

        print("Test data inserted successfully")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()