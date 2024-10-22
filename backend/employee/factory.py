import enum
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from marshmallow import fields
from marshmallow_enum import EnumField
from sqlalchemy import String, Integer, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Initialize Flask extensions
db = SQLAlchemy()
ma = Marshmallow()

# Base class for models
class Base(db.Model):
    __abstract__ = True


class Role(enum.Enum):
    HR = 1
    STAFF = 2
    MANAGER = 3
    
class Status(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    SEEN = "seen"


class Employee(Base):
    __tablename__ = "employee"

    staff_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    staff_fname: Mapped[str] = mapped_column(String(50), nullable=False)
    staff_lname: Mapped[str] = mapped_column(String(50), nullable=False)
    dept: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(50), nullable=False)
    reporting_manager: Mapped[int] = mapped_column(Integer, ForeignKey('employee.staff_id'), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False)

    # Relationship to Credential model (declared later)
    credentials: Mapped['Credential'] = relationship('Credential', back_populates='employee', uselist=False)


class Credential(Base):
    __tablename__ = "credential"

    staff_id: Mapped[int] = mapped_column(Integer, ForeignKey('employee.staff_id'), primary_key=True)
    password: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationship to Employee model (declared later)
    employee: Mapped['Employee'] = relationship('Employee', back_populates='credentials')


class CredentialSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Credential
        load_instance = True
        include_fk = True # Include foreign key fields
        

class EmployeeSchema(ma.SQLAlchemyAutoSchema):
    role = EnumField(Role, by_value=True)
    reporting_manager = fields.Int(required=True)

    class Meta:
        model = Employee
        load_instance = True


class Delegate(Base):
    __tablename__ = "delegate"

    delegate_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    delegate_from: Mapped[int] = mapped_column(Integer, nullable=False)
    delegate_to: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), nullable=False)
    created_on: Mapped[DateTime] = mapped_column(DateTime, nullable=False, default=func.now())
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    notification_status: Mapped[Status] = mapped_column(Enum(Status), nullable=False)

class DelegateSchema(ma.SQLAlchemyAutoSchema):
    status = EnumField(Status, by_value=True)
    notification_status = EnumField(Status, by_value=True)

    class Meta:
        model = Delegate
        load_instance = True
        
class DelegateStatusHistory(Base):
    __tablename__ = "delegateStatusHistory"

    delegate_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delegate_status_history_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    delegate_from: Mapped[int] = mapped_column(Integer, nullable=False)
    delegate_to: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_on: Mapped[DateTime] = mapped_column(DateTime, nullable=False, default=func.now())
    status: Mapped[Status] = mapped_column(Enum(Status), nullable=False)


class DelegateStatusHistorySchema(ma.SQLAlchemyAutoSchema):
    status = EnumField(Status, by_value=True)

    class Meta:
        model = DelegateStatusHistory
        load_instance = True