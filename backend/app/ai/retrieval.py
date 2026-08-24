"""
Retrieval (RAG) service using SQL generation & execution via Gemini API / Groq fallback.
"""
import os
import json
from typing import Optional
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from app.ai.prompts import RETRIEVER_SYSTEM_PROMPT
from app.schemas.schemas import AIChatResponse

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is not None:
        return _genai_client
    key = GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if key and key.strip() and not key.startswith("your-"):
        _genai_client = genai.Client(api_key=key.strip())
        return _genai_client
    return None


def answer_question(db: Session, question: str) -> AIChatResponse:
    """
    RAG Assistant using Text -> SQL -> Query results -> Natural language answer.
    """
    client = get_genai_client()

    sql_text = ""
    last_err = None

    # 1. Try Gemini models
    if client:
        models_to_try = [GEMINI_MODEL, "gemini-3.6-flash"]
        for m_name in models_to_try:
            try:
                sql_res = client.models.generate_content(
                    model=m_name,
                    contents=question,
                    config=types.GenerateContentConfig(
                        system_instruction=RETRIEVER_SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                if hasattr(sql_res, "candidates") and sql_res.candidates and sql_res.candidates[0].content and sql_res.candidates[0].content.parts:
                    for part in sql_res.candidates[0].content.parts:
                        if hasattr(part, "text") and part.text:
                            sql_text += part.text
                elif hasattr(sql_res, "text") and sql_res.text:
                    sql_text = sql_res.text
                if sql_text:
                    break
            except Exception as err:
                last_err = err
                continue

    # 2. Try Groq fallback
    if not sql_text and GROQ_API_KEY:
        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY)
            groq_comp = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": RETRIEVER_SYSTEM_PROMPT},
                    {"role": "user", "content": question}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            sql_text = groq_comp.choices[0].message.content
        except Exception as g_err:
            last_err = g_err

    if not sql_text:
        return AIChatResponse(
            answer=f"سيرفرات الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، يرجى المحاولة بعد لحظات: {str(last_err)}",
            sql_used=""
        )

    try:
        # Robust parsing of sql_text
        cleaned_text = sql_text.strip()
        if cleaned_text.startswith("```"):
            lines = cleaned_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_text = "\n".join(lines).strip()

        sql_query = ""
        try:
            sql_data = json.loads(cleaned_text)
            if isinstance(sql_data, dict):
                sql_query = sql_data.get("sql", "")
            elif isinstance(sql_data, str):
                sql_query = sql_data
        except Exception:
            if "SELECT" in cleaned_text.upper():
                # Extract starting from SELECT
                idx = cleaned_text.upper().find("SELECT")
                sql_query = cleaned_text[idx:]

        # Clean markdown wrappers if any left
        sql_query = sql_query.replace("CURRENT_DATE()", "DATE('now')").replace("CURDATE()", "DATE('now')").strip()
        if sql_query.startswith("```sql"):
            sql_query = sql_query[6:].strip()
        if sql_query.endswith("```"):
            sql_query = sql_query[:-3].strip()

        if not sql_query or not "SELECT" in sql_query.upper():
            raise ValueError("لم نتمكن من إنشاء استعلام قاعدة بيانات صالح لهذا السؤال.")

        # Execute SQL query on database
        result_rows = db.execute(text(sql_query)).fetchall()
        
        # Format results into structured dict list for context explanation
        results = [dict(row._mapping) for row in result_rows]

        # Ask Gemini / Groq to explain results in Arabic
        explanation_prompt = f"""
السؤال: {question}
بيانات قاعدة البيانات المسترجعة: {json.dumps(results, ensure_ascii=False)}

يرجى تقديم إجابة مباشرة ودقيقة باللغة العربية بناءً على البيانات المسترجعة أعلاه فقط.
لا تخمن إحصاءات أو أرقام غير موجودة في البيانات.
        """

        exp_text = ""
        if client:
            try:
                exp_res = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=explanation_prompt,
                    config=types.GenerateContentConfig(temperature=0.3),
                )
                if hasattr(exp_res, "candidates") and exp_res.candidates and exp_res.candidates[0].content and exp_res.candidates[0].content.parts:
                    for part in exp_res.candidates[0].content.parts:
                        if hasattr(part, "text") and part.text:
                            exp_text += part.text
                elif hasattr(exp_res, "text") and exp_res.text:
                    exp_text = exp_res.text
            except Exception:
                pass

        if not exp_text and GROQ_API_KEY:
            try:
                from groq import Groq
                groq_client = Groq(api_key=GROQ_API_KEY)
                exp_comp = groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[{"role": "user", "content": explanation_prompt}],
                    temperature=0.3,
                )
                exp_text = exp_comp.choices[0].message.content
            except Exception:
                pass

        if not exp_text:
            exp_text = f"البيانات المسترجعة: {json.dumps(results, ensure_ascii=False)}"

        return AIChatResponse(
            answer=exp_text.strip(),
            data={"results": results},
            sql_used=sql_query
        )

    except Exception as e:
        return AIChatResponse(
            answer=f"عذراً، لم أستطع استرجاع البيانات المطلوبة: {str(e)}",
            sql_used=locals().get("sql_query", "")
        )
