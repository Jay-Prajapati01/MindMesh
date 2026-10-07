"""Request/job ownership context. Never infer a production scope from input data."""
from contextvars import ContextVar
from dataclasses import dataclass, asdict
from app.core.config import get_settings


@dataclass(frozen=True)
class Scope:
    tenant_id: str
    user_id: str
    job_id: str = ""
    resource_id: str = ""

    def envelope(self) -> dict:
        if not all(asdict(self).values()):
            raise PermissionError("A complete job scope is required")
        return asdict(self)


current_scope: ContextVar[Scope | None] = ContextVar("mindmesh_scope", default=None)


def scope() -> Scope:
    value = current_scope.get()
    if value is None or not value.tenant_id or not value.user_id:
        raise PermissionError("Authenticated ownership context required")
    return value


def cloud() -> bool:
    return get_settings().mindmesh_execution_mode in {"modal", "cloud"}
