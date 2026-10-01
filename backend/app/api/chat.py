"""RAG chat endpoint."""
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse
from app.services import rag, store

router = APIRouter(prefix="/chat", tags=["chat"])

EMPTY_QUESTION_ANSWER = (
    "Please enter a question so I can search your knowledge base."
)


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    # Blank questions get a graceful reply: no retrieval, no citations,
    # and nothing written to recent questions.
    if not payload.question:
        return ChatResponse(
            question=payload.question,
            answer=EMPTY_QUESTION_ANSWER,
            citations=[],
            search_time_ms=0,
            chunks_searched=0,
            sources_searched=0,
        )

    store.add_question(payload.question)
    answer, citations, metrics = await rag.answer(
        payload.question,
        payload.top_k,
        source_type=payload.source_type,
        source_id=payload.source_id,
        history=payload.history,
    )
    return ChatResponse(
        question=payload.question,
        answer=answer,
        citations=citations,
        search_time_ms=metrics.get("search_time_ms"),
        chunks_searched=metrics.get("chunks_searched"),
        sources_searched=metrics.get("sources_searched"),
    )


@router.post("/stream")
async def chat_stream(payload: ChatRequest):
    """Stream chat response tokens via SSE."""

    async def event_generator():
        if not payload.question:
            yield f"data: {json.dumps({'type': 'token', 'content': EMPTY_QUESTION_ANSWER})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': EMPTY_QUESTION_ANSWER})}\n\n"
            return

        store.add_question(payload.question)
        full_answer = ""
        async for token in rag.answer_stream(
            payload.question,
            payload.top_k,
            source_type=payload.source_type,
            source_id=payload.source_id,
            history=payload.history,
        ):
            full_answer += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # Send final metadata
        yield f"data: {json.dumps({'type': 'done', 'answer': full_answer})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
