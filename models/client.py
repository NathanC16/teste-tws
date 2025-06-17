from pydantic import BaseModel


class ClientBase(BaseModel):
    name: str
    area_of_expertise: str


class ClientCreate(ClientBase):
    pass


class Client(ClientBase):
    id: int

    class Config:
        from_attributes = True
