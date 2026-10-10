"""RAG chat endpoint."""
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse, ChatMessage
from app.services import rag, store

router = APIRouter(prefix="/chat", tags=["chat"])

EMPTY_QUESTION_ANSWER = (
    "Please enter a question so I can search your knowledge base."
)


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    import uuid
    from app.core.tenant import cloud, scope
    conversation_id = payload.conversation_id or str(
        uuid.uuid5(uuid.NAMESPACE_URL, scope().job_id) if cloud() else uuid.uuid4())
    conversation = store.get_conversation(conversation_id)
    history = payload.history
    if conversation:
        history = [message for turn in conversation["turns"][-20:] for message in (
            ChatMessage(role="user", content=turn["response"]["question"]),
            ChatMessage(role="assistant", content=turn["response"]["answer"]),
        )]
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

    from app.services.commerce import CommerceError, reserve
    try:
        reserve("chat")
    except CommerceError as exc:
        raise HTTPException(exc.status, {"code": exc.code, "message": str(exc)}) from None

    store.add_question(payload.question)
    answer, citations, metrics = await rag.answer(
        payload.question,
        payload.top_k,
        source_type=payload.source_type,
        source_id=payload.source_id,
        history=history,
    )
    response = ChatResponse(
        question=payload.question,
        conversation_id=conversation_id,
        answer=answer,
        citations=citations,
        search_time_ms=metrics.get("search_time_ms"),
        chunks_searched=metrics.get("chunks_searched"),
        sources_searched=metrics.get("sources_searched"),
    )
    store.save_conversation_turn(conversation_id, response.model_dump(mode="json"))
    return response


@router.get("/conversations/{conversation_id}")
async def conversation(conversation_id: str):
    data = store.get_conversation(conversation_id)
    if data is None:
        raise HTTPException(404, "Conversation not found")
    return data


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
