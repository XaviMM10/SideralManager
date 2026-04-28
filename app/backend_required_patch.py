# Copy these changes into app/main.py if your current backend does not have CORS
# and read endpoints for entries. Keep your existing create/update/delete routes.

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/work-entries")
def get_work_entries(job_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(models.WorkEntry)
    if job_id is not None:
        query = query.filter(models.WorkEntry.job_id == job_id)
    work_entries = query.all()
    return [
        {
            "id": entry.id,
            "job_id": entry.job_id,
            "date": entry.date,
            "num_workers": entry.num_workers,
            "hours_per_worker": entry.hours_per_worker,
            "title": entry.title,
            "description": entry.description,
            "location": entry.location,
        }
        for entry in work_entries
    ]

@app.get("/supply-entries")
def get_supply_entries(job_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(models.SupplyEntry)
    if job_id is not None:
        query = query.filter(models.SupplyEntry.job_id == job_id)
    supply_entries = query.all()
    return [
        {
            "id": entry.id,
            "job_id": entry.job_id,
            "supplier": entry.supplier,
            "reference": entry.reference,
            "total_amount": entry.total_amount,
            "date": entry.date,
        }
        for entry in supply_entries
    ]

# Also fix this typo in your existing delete route:
# def delete_supply_entry(supply_entry_id: int, db: Session = Depends(get_db)):
# not:
# def delete_supply_entry(work_entry_id: int, db: Session = Depends(get_db)):
