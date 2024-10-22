import enum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.mutable import MutableList
from flask_marshmallow import Marshmallow
from marshmallow import fields
from marshmallow_enum import EnumField
from sqlalchemy import Column, Integer, String, Date, Enum, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import timezone

# SQLAlchemy models start here
# class Base(DeclarativeBase):
#     pass

db = SQLAlchemy()
ma = Marshmallow()

class Base(db.Model):
    __abstract__ = True

class AnnualLeave(Base):
    __tablename__ = "leaves"

    leave_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(Integer, nullable=False)
    leave_date: Mapped[Date] = mapped_column(Date, nullable=False)  # Example entry field
    department: Mapped[str] = mapped_column(String(50))

class AnnualLeaveSchema(ma.SQLAlchemyAutoSchema):
    leave_id = fields.Int(dump_only=True)
    employee_id = fields.Int(required=True)
    leave_date = fields.Date(required=True)
    department = fields.Str(required=True)

    class Meta:
        model = AnnualLeave
        load_instance = True