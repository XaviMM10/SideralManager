from pydantic import BaseModel
import datetime
from decimal import Decimal

class ClientCreate(BaseModel):
    name:str
    address:str | None = None # Means its optional

class ClientUpdate(BaseModel):
    name: str | None = None
    address: str | None = None

class JobCreate(BaseModel):
    client_id: int
    title: str
    description: str | None = None
    status: str

class JobUpdate(BaseModel):
    client_id: int | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None

class WorkEntryCreate(BaseModel):
    job_id: int
    date: datetime.date
    num_workers: int | None = None
    hours_per_worker: int | None = None
    title: str
    description: str | None = None
    location: str | None = None

class WorkEntryUpdate(BaseModel):
    job_id: int | None = None
    date: datetime.date | None = None
    num_workers: int | None = None
    hours_per_worker: int | None = None
    title: str | None = None
    description: str | None = None
    location: str | None = None

class SupplyEntryCreate(BaseModel):
    job_id: int
    supplier: str
    reference: str | None = None
    total_amount: Decimal | None = None
    date: datetime.date | None = None

class SupplyEntryUpdate(BaseModel):
    job_id: int | None = None
    supplier: str | None = None
    reference: str | None = None
    total_amount: Decimal | None = None
    date: datetime.date | None = None