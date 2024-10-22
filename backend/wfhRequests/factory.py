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

class Status(enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    CANCELLED = "Cancelled"
    REVIEWED = "Reviewed"
    WITHDRAWN = "Withdrawn"
    PENDING_WITHDRAWN = "Pending Withdrawal"
    AUTO_REJECTED = "Auto Rejected"
    ACKNOWLEDGED = "Acknowledged"


class NotificationStatus(enum.Enum):
    DELIVERED = "Delivered"
    SEEN = "Seen"
    EDITED = "Edited"
    WITHDRAWN = "Withdrawn"
    SELF_WITHDRAWN = "Self-Withdrawn"
    CANCELLED = "Cancelled"
    ACKNOWLEDGED = "Acknowledged"
    AUTO_REJECTED = "Auto Rejected"

class WFHRequest(Base):
    __tablename__ = "wfhrequests"

    request_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_status: Mapped[Status] = mapped_column(Enum(Status), nullable=False, default=Status.PENDING)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    reporting_manager: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[str] = mapped_column(String(50))
    entries: Mapped['WFHRequestEntry'] = relationship('WFHRequestEntry', back_populates='wfhRequest', cascade="all, delete", lazy='joined', uselist=True)
    notification_status: Mapped[NotificationStatus] = mapped_column(Enum(NotificationStatus), nullable=False, default=NotificationStatus.DELIVERED)
    modified_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    last_notification_status: Mapped[NotificationStatus] = mapped_column(Enum(NotificationStatus), nullable=False, default=NotificationStatus.DELIVERED)
    audit_trails = relationship('AuditTrail', back_populates='wfh_request')

class WFHRequestEntry(Base):
    __tablename__ = "wfhrequestentries"

    entry_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(Integer, ForeignKey('wfhrequests.request_id'), nullable=False)
    entry_date: Mapped[Date] = mapped_column(Date, nullable=False)  # Example entry field
    reason: Mapped[str] = mapped_column(String(255))  # Example additional entry field
    duration: Mapped[str] = mapped_column(String(50))
    status: Mapped[Status] = mapped_column(Enum(Status), nullable=False, default=Status.PENDING)
    action_reason: Mapped[str] = mapped_column(String(255))
    wfhRequest: Mapped['WFHRequest'] = relationship('WFHRequest', back_populates='entries')
    audit_trails = relationship('AuditTrail', back_populates='wfh_request_entry')

class AuditTrail(Base):
    __tablename__ = "audittrail"

    audit_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(Integer, ForeignKey('wfhrequests.request_id'), nullable=False)
    entry_id: Mapped[int] = mapped_column(Integer, ForeignKey('wfhrequestentries.entry_id'), nullable=True)
    requester_id: Mapped[int] = mapped_column(Integer, nullable=False)
    reporting_manager: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[str] = mapped_column(String(50))
    entry_date: Mapped[Date] = mapped_column(Date, nullable=True)  # Example entry field
    reason: Mapped[str] = mapped_column(String(255), nullable=True)  # Example additional entry field
    duration: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[Status] = mapped_column(Enum(Status), nullable=False, default=Status.PENDING)
    action_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    wfh_request = relationship('WFHRequest', back_populates='audit_trails')
    wfh_request_entry = relationship('WFHRequestEntry', back_populates='audit_trails')

class WFHRequestEntrySchema(ma.SQLAlchemyAutoSchema):
    entry_id = fields.Int(dump_only=True)
    request_id = fields.Int(dump_only=True)
    entry_date = fields.Date(required=True)
    reason = fields.Str(required=False)
    duration = fields.Str(required=False)
    status = EnumField(Status, by_value=True, required=False, default=Status.PENDING)
    action_reason = fields.Str(required=False)

    class Meta:
        model = WFHRequestEntry
        load_instance = True
        include_fk = True # Include foreign key fields

class WFHRequestSchema(ma.SQLAlchemyAutoSchema):
    request_id = fields.Int(dump_only=True)
    requester_id = fields.Int(required=True)
    created_at = fields.DateTime(dump_only=True)
    reporting_manager = fields.Int(required=True)
    overall_status = EnumField(Status, by_value=True, required=False, default=Status.PENDING)
    department = fields.Str(required=False)
    notification_status = EnumField(NotificationStatus, by_value=True, required=False, default=NotificationStatus.DELIVERED)
    modified_at = fields.DateTime(dump_only=True)
    last_notification_status = EnumField(NotificationStatus, by_value=True, required=False, default=NotificationStatus.DELIVERED)

    
    class Meta:
        model = WFHRequest
        load_instance = True

class AuditTrailSchema(ma.SQLAlchemyAutoSchema):
    audit_id = fields.Int(dump_only=True)
    request_id = fields.Int(required=True)
    entry_id = fields.Int(required=False)
    requester_id = fields.Int(required=True)
    reporting_manager = fields.Int(required=True)
    department = fields.Str(required=False)
    entry_date = fields.Date(required=False)
    reason = fields.Str(required=False)
    duration = fields.Str(required=False)
    status = EnumField(Status, by_value=True, required=True, default=Status.PENDING)
    action_reason = fields.Str(required=False)
    created_at = fields.DateTime(dump_only=True)

    class Meta:
        model = AuditTrail
        load_instance = True
        include_fk = True  # Include foreign key fields
