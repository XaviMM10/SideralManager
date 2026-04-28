from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

class StatusOptions(Base):
    __tablename__='statuses'

    id: Mapped[int] = mapped_column(BigInteger, primary_key = True)
    option: Mapped[str] = mapped_column(String(255), nullable = False)

    jobs: Mapped[list["Job"]] = relationship(back_populates =  'statuses')

class CompletionOptions(Base):
    __tablename__='completions'

    id: Mapped[int] = mapped_column(BigInteger, primary_key = True)
    option: Mapped[str] = mapped_column(String(255), nullable = False)

    work_entries: Mapped[list["SupplyEntry"]] = relationship(back_populates =  'completions')

class Client(Base):
    __tablename__='clients'

    id: Mapped[int] = mapped_column(BigInteger, primary_key = True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    jobs: Mapped[list["Job"]] = relationship(back_populates = 'client')

class Job(Base):
    __tablename__='jobs'

    id: Mapped[int] = mapped_column(BigInteger, primary_key = True)
    client_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("clients.id"), nullable = False)
    title: Mapped[str] = mapped_column(String(255), nullable = False)
    description: Mapped[str | None] = mapped_column(Text, nullable = True)
    status: Mapped[int] = mapped_column(BigInteger, ForeignKey("statuses.id"), nullable=False) 

    client: Mapped["Client"] = relationship(back_populates='jobs')
    supply_entries: Mapped[list["SupplyEntry"]] = relationship(back_populates="job")
    work_entries: Mapped[list["WorkEntry"]] = relationship(back_populates="job")
    completions: Mapped["CompletionOptions"] = relationship(back_populates='supply_entries')
    

class SupplyEntry(Base): 
    __tablename__ = 'supply_entries'

    id: Mapped[int] = mapped_column(BigInteger, primary_key = True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id"), nullable = False)
    supplier: Mapped[str] = mapped_column(String(255), nullable = False)
    reference: Mapped[str] = mapped_column(String(255), nullable = False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10,2), nullable = False)
    date: Mapped[date] = mapped_column(Date, nullable = False)
    completion: Mapped[int] = mapped_column(BigInteger, ForeignKey("completions.id"), nullable = False) 
    description: Mapped[str] = mapped_column(Text, nullable = False)
    

    job: Mapped["Job"] = relationship(back_populates='supply_entries')
    statuses: Mapped[list["StatusOptions"]] = relationship(back_populates="job")
    

class WorkEntry(Base):
    __tablename__ = 'work_entries'

    id: Mapped[int] = mapped_column(BigInteger, primary_key= True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id"), nullable = False)
    date: Mapped[date] = mapped_column(Date, nullable = False)
    num_workers: Mapped[int] = mapped_column(nullable = False)
    hours_per_worker: Mapped[Decimal] = mapped_column(Numeric(10,2), nullable = False)
    title: Mapped[str] = mapped_column(String(255), nullable = False)
    description: Mapped[str] = mapped_column(Text, nullable = False)
    location: Mapped[str] = mapped_column(String(255), nullable = False)

    job: Mapped["Job"] = relationship(back_populates="work_entries")

