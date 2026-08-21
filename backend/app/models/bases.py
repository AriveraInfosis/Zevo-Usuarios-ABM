from pydantic import BaseModel


class BasePreviewResponse(BaseModel):
    patron: str
    bases_afectadas: list[str]
    cantidad: int
