from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.db import Base, engine, get_db
from app import models #Gets the models I defined
from app import schemas

from datetime import date

app = FastAPI()

@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine) #look at model classes, generate the SQL tables, send them to PostgreSQL 

@app.get("/")
def read_root():
    return {"message": "Office manager is running"}

@app.get("/clients") #This function finds all clients like SELECT * FROM clients;
def get_clients(db: Session = Depends(get_db)): #Depends(get_db) calls get_db and provides the database session to the function
    clients = db.query(models.Client).all() #This is the query like above

    return [
        {
            "id": client.id,
            "name": client.name,
            "address": client.address,
        }
        for client in clients
    ]

@app.get("/jobs") # SELECT * FROM jobs;
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.Job).all()

    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,
        }
        for job in jobs
    ]

@app.get("/jobs/{job_id}") #SELECT * FROM jobs WHERE id = 1;
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first() #First matching row

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "id": job.id,
        "client_id": job.client_id,
        "title": job.title,
        "description": job.description,
        "status": job.status,
    }

@app.get("/jobs/by-client-name/{client_name}")
def get_jobs_by_client(client_name: str, db: Session = Depends(get_db)):
    jobs = (
        db.query(models.Job)
        .join(models.Client) #JOIN clients ON jobs.client_id = clients.id
        .filter(models.Client.name.ilike(f"%{client_name}%"))
        .all()
    )

    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,
        }
        for job in jobs
    ]

#- get: /jobs/{title}			Filter through title words

@app.get("/jobs/by-title/{title}")
def get_jobs_by_title(title: str, db:Session = Depends(get_db)):
    jobs = (
        db.query(models.Job).filter(models.Job.title.ilike(f"%{title}%")).all()
    )

    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,            
        }
        for job in jobs
    ]
    
#- get: /jobs/{supply_entry_supplier}	Filter through supplier of all supply entries

@app.get("/jobs/by-supplier/{supplier}")
def get_jobs_by_supplier(supplier: str, db:Session = Depends(get_db)):
    jobs = (
        db.query(models.Job)
        .join(models.SupplyEntry)
        .filter(models.SupplyEntry.supplier.ilike(f"%{supplier}%"))
        .distinct() #So it does not show the same job more than once
        .all()
    )
    
    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,            
        }
        for job in jobs
    ]

#- get: /jobs/{work_entry_location}	Filter through location of all work entries || 
@app.get("/jobs/by-location/{location}")
def get_jobs_by_location(location: str, db:Session = Depends(get_db)):
    jobs = (
        db.query(models.Job)
        .join(models.WorkEntry)
        .filter(models.WorkEntry.location.ilike(f"%{location}%"))
        .distinct()
        .all()
    )

    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,
        }
        for job in jobs
    ]


#- get: /jobs/{work_entry_date}		Filter through dates of all work entries

@app.get("/jobs/by-work-entry-date/{work_entry_date}")
def get_jobs_by_work_entry_date(work_entry_date: date, db:Session = Depends(get_db)):
    jobs = (
        db.query(models.Job)
        .join(models.WorkEntry)
        .filter(models.WorkEntry.date == work_entry_date)
        .distinct()
        .all()
    )

    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,
        }
        for job in jobs
    ]

#- get: /jobs/{status}			Filter through status (Active/Finished) || 
@app.get("/jobs/by-status/{status}")
def get_jobs_by_status(status: str, db:Session = Depends(get_db)):
    jobs = (
        db.query(models.Job)
        .filter(models.Job.status == status)
        .all()
    )

    return [
        {
            "id": job.id,
            "client_id": job.client_id,
            "title": job.title,
            "description": job.description,
            "status": job.status,
        }
        for job in jobs
    ]

@app.post("/clients")
def create_client(client_data: schemas.ClientCreate, db: Session = Depends(get_db)):
    client = models.Client(
        name = client_data.name,
        address = client_data.address,
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return {
        "id": client.id,
        "name": client.name,
        "address": client.address,
    }

@app.patch("/clients/{client_id}")
def update_client(
    client_id: int,
    client_data: schemas.ClientUpdate,
    db: Session = Depends(get_db),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()

    if client is None:
        raise HTTPException(status_code=404, detail = "Client not found")

    if client_data.name is not None:
        client.name = client_data.name
    
    if client_data.address is not None:
        client.address = client_data.address

    db.commit()
    db.refresh(client)

    return {
        "id": client.id,
        "name": client.name,
        "address": client.address
    }

@app.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()

    if client is None:
        raise HTTPException(status_code=404, detail = "Client not found")
    
    db.delete(client)
    db.commit()

    return {"message": "Client deleted successfully"}

@app.post("/jobs")
def create_job(job_data: schemas.JobCreate, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == job_data.client_id).first()

    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    job = models.Job(
        client_id=job_data.client_id,
        title=job_data.title,
        description=job_data.description,
        status=job_data.status,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return {
        "id": job.id,
        "client_id": job.client_id,
        "title": job.title,
        "description": job.description,
        "status": job.status,
    }

@app.patch("/jobs/{job_id}")
def update_job(
    job_id: int,
    job_data: schemas.JobUpdate,
    db: Session = Depends(get_db),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()

    if job is None:
        raise HTTPException(status_code=404, detail = "Job not found")
    
    if job_data.client_id is not None:
        client = db.query(models.Client).filter(models.Client.id == job_data.client_id).first()

        if client is None:
            raise HTTPException(status_code=404, detail="Client not found")

        job.client_id = job_data.client_id

    if job_data.title is not None:
        job.title = job_data.title

    if job_data.description is not None:
        job.description = job_data.description
    
    if job_data.status is not None:
        job.status = job_data.status
    
    db.commit()
    db.refresh(job)

    return {
        "id": job.id,
        "client_id": job.client_id,
        "title": job.title,
        "description": job.description,
        "status": job.status
    }

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()

    return {"message": "Job deleted succesfully"}


@app.post("/work-entries")
def create_work_entry(work_entry_data: schemas.WorkEntryCreate, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == work_entry_data.job_id).first()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    work_entry = models.WorkEntry(
        job_id = work_entry_data.job_id,
        date = work_entry_data.date,
        num_workers = work_entry_data.num_workers,
        hours_per_worker = work_entry_data.hours_per_worker,
        title = work_entry_data.title,
        description = work_entry_data.description,
        location = work_entry_data.location,
    )

    db.add(work_entry)
    db.commit()
    db.refresh(work_entry)

    return {
        "id": work_entry.id,
        "job_id": work_entry.job_id,
        "date": work_entry.date,
        "num_workers": work_entry.num_workers,
        "hours_per_worker": work_entry.hours_per_worker,
        "title" : work_entry.title,
        "description" : work_entry.description,
        "location" : work_entry.location,
    }

@app.patch("/work-entries/{work_entry_id}")
def update_work_entry(
    work_entry_id: int,
    work_entry_data: schemas.WorkEntryUpdate,
    db: Session = Depends(get_db),
):
    work_entry = db.query(models.WorkEntry).filter(models.WorkEntry.id == work_entry_id).first()

    if work_entry is None:
        raise HTTPException(status_code=404, detail="Work Entry not found")
    
    if work_entry_data.job_id is not None:
        job = db.query(models.Job).filter(models.Job.id == work_entry_data.job_id).first()

        if job is None: 
           raise HTTPException(status_code = 404, detail = "Job not found")

        work_entry.job_id = work_entry_data.job_id
        ####
    if work_entry_data.date is not None:
        work_entry.date = work_entry_data.date
        
    if work_entry_data.num_workers is not None:
        work_entry.num_workers = work_entry_data.num_workers
        
    if work_entry_data.hours_per_worker is not None:
        work_entry.hours_per_worker = work_entry_data.hours_per_worker

    if work_entry_data.title is not None:
        work_entry.title = work_entry_data.title

    if work_entry_data.description is not None:
        work_entry.description = work_entry_data.description
        
    if work_entry_data.location is not None:
        work_entry.location = work_entry_data.location
        
    db.commit()
    db.refresh(work_entry)

    return {
        "id": work_entry.id,
        "job_id": work_entry.job_id,
        "date": work_entry.date,
        "num_workers": work_entry.num_workers,
        "hours_per_worker": work_entry.hours_per_worker,
        "title" : work_entry.title,
        "description" : work_entry.description,
        "location" : work_entry.location,
    }

@app.delete("/work-entries/{work_entry_id}")
def delete_work_entry(work_entry_id: int, db: Session = Depends(get_db)):
    work_entry = db.query(models.WorkEntry).filter(models.WorkEntry.id == work_entry_id).first()

    if work_entry is None:
        raise HTTPException(status_code = 404, detail = "Work Entry not found")

    db.delete(work_entry)
    db.commit()

    return {"message": "Work Entry deleted succesfully"}

@app.post("/supply-entries")
def create_supply_entry(supply_entry_data: schemas.SupplyEntryCreate, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == supply_entry_data.job_id).first()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    supply_entry = models.SupplyEntry(
        job_id = supply_entry_data.job_id,
        supplier = supply_entry_data.supplier,
        reference = supply_entry_data.reference,
        total_amount = supply_entry_data.total_amount,
        date = supply_entry_data.date,
    )

    db.add(supply_entry)
    db.commit()
    db.refresh(supply_entry)

    return {
        "id": supply_entry.id,
        "job_id": supply_entry.job_id,
        "supplier": supply_entry_data.supplier,
        "total_amount": supply_entry_data.total_amount,
        "date" : supply_entry_data.date,
    }

@app.patch("/supply-entries/{supply_entry_id}")
def update_supply_entry(
    supply_entry_id: int,
    supply_entry_data: schemas.SupplyEntryUpdate,
    db: Session = Depends(get_db),
):
    supply_entry = db.query(models.SupplyEntry).filter(models.SupplyEntry.id == supply_entry_id).first()

    if supply_entry is None:
        raise HTTPException(status_code=404, detail="Supply Entry not found")
    
    if supply_entry_data.job_id is not None:
        job = db.query(models.Job).filter(models.Job.id == supply_entry_data.job_id).first()

        if job is None:
            raise HTTPException(status_code=404, detail="Job is not found")
        
        supply_entry.job_id = supply_entry_data.job_id
    
    if supply_entry_data.supplier is not None:
        supply_entry.supplier = supply_entry_data.supplier

    if supply_entry_data.total_amount is not None:
        supply_entry.total_amount = supply_entry_data.total_amount
    
    if supply_entry_data.date is not None:
        supply_entry.date = supply_entry_data.date

    db.commit()
    db.refresh(supply_entry)

    return {
        "id": supply_entry.id,
        "job_id": supply_entry.job_id,
        "supplier": supply_entry_data.supplier,
        "total_amount": supply_entry_data.total_amount,
        "date" : supply_entry_data.date,
    }

@app.delete("/supply-entries/{supply_entry_id}")
def delete_supply_entry(work_entry_id: int, db: Session = Depends(get_db)):
    supply_entry = db.query(models.SupplyEntry).filter(models.SupplyEntry.id == supply_entry_id).first()

    if supply_entry is None:
        raise HTTPException(status_code = 404, detail = "Supply Entry not found")

    db.delete(supply_entry)
    db.commit()

    return {"message" : "Supply Entry deleted successfully"}