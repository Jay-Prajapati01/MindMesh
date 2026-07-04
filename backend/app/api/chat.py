"""RAG chat endpoint."""
from fastapi import APIRouter

from app.models.schemas import ChatRequest, ChatResponse
from app.services import rag, store

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    store.add_question(payload.question)
    answer, citations = await rag.answer(
        payload.question, payload.top_k, source_type=payload.source_type, source_id=payload.source_id
    )
    return ChatResponse(
        question=payload.question,
        answer=answer,
        citations=citations,
    )
