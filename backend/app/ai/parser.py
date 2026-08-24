"""
AI Parser service using the Google GenAI SDK to call Gemini 2.5/3.6 Flash and Groq fallback.
"""
import os
import json
from typing import List, Dict, Any
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from app.models.models import Employee, EntityType, ActionType
from app.schemas.schemas import AIParseResponse, ParsedActivity
from app.ai.prompts import PARSER_SYSTEM_PROMPT
from app.services import employee_service

_genai_client = None

function_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is not None:
        return _genai_client
    key = GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if key and key.strip() and not key.startswith("your-"):
        _genai_client = genai.Client(api_key=key.strip())
        return _genai_client
    return None


def parse_activity_text(db: Session, text: str) -> AIParseResponse:
    """
    Parse daily activities text using Gemini API or Groq fallback with structured JSON output.
    """
    client = get_genai_client()

    # 1. Fetch current context from database
    employees = db.query(Employee).filter(Employee.active == True).all()
    entities = db.query(EntityType).all()
    actions = db.query(ActionType).all()

    emp_list_str = "\n".join([f"- {emp.name} (Role: {emp.role}, ID: {emp.id})" for emp in employees])
    ent_list_str = "\n".join([f"- {ent.name}: {ent.display_name} (ID: {ent.id})" for ent in entities])
    act_list_str = "\n".join([f"- {act.name}: {act.display_name} (ID: {act.id})" for act in actions])

    system_prompt = (
        PARSER_SYSTEM_PROMPT
        .replace("{employees_list}", emp_list_str)
        .replace("{entities_list}", ent_list_str)
        .replace("{actions_list}", act_list_str)
    )

    response_text = ""
    last_error = None

    # Try Gemini models first
    if client:
        models_to_try = [GEMINI_MODEL, "gemini-3.6-flash"]
        for model_name in models_to_try:
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=text,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                if hasattr(res, "candidates") and res.candidates and res.candidates[0].content and res.candidates[0].content.parts:
                    for part in res.candidates[0].content.parts:
                        if hasattr(part, "text") and part.text:
                            response_text += part.text
                elif hasattr(res, "text") and res.text:
                    response_text = res.text
                if response_text:
                    break
            except Exception as err:
                last_error = err
                continue

    # Try Groq API fallback if Gemini is unavailable
    if not response_text and GROQ_API_KEY:
        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY)
            groq_completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            response_text = groq_completion.choices[0].message.content
        except Exception as groq_err:
            last_error = groq_err

    if not response_text:
        return AIParseResponse(
            success=False,
            confirmation_message=f"سيرفرات الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة: {str(last_error)}",
            needs_confirmation=True
        )

    try:
        result_data = json.loads(response_text)

        # 2. Re-verify mapping and lookup IDs
        parsed_activities = []
        unknown_employees = result_data.get("unknown_employees", [])
        unknown_entities = result_data.get("unknown_entities", [])
        unknown_actions = result_data.get("unknown_actions", [])
        similar_employees = {}
        needs_confirmation = result_data.get("needs_confirmation", False)

        for act in result_data.get("activities", []):
            emp_name = act.get("employee_name")
            entity_name = act.get("entity")
            action_name = act.get("action")
            qty = act.get("quantity", 1)
            unit_val = act.get("unit", "items")
            if unit_val not in ["items", "seconds", "minutes"]:
                unit_val = "items"

            # Match employee
            emp = employee_service.find_employee_by_name(db, emp_name)
            emp_id = emp.id if emp else None
            
            if not emp:
                similar = employee_service.find_similar_employees(db, emp_name)
                if similar:
                    similar_employees[emp_name] = [e.name for e in similar]
                    needs_confirmation = True
                else:
                    if emp_name not in unknown_employees:
                        unknown_employees.append(emp_name)
                    needs_confirmation = True

            # Smart Entity Correction based on Employee Role or Unit
            if emp:
                if emp.role == "designer" and entity_name in ["video", "animation"]:
                    entity_name = "design"
                elif emp.role == "animator" and entity_name in ["design", "image"]:
                    entity_name = "video"
            else:
                # For NEW employees, infer role from unit/activity type
                if unit_val in ["seconds", "minutes"] and entity_name in ["design", "image"]:
                    entity_name = "video"

            # Match Entity Type
            ent = db.query(EntityType).filter(
                (EntityType.name.ilike(entity_name)) | (EntityType.display_name.ilike(entity_name))
            ).first()
            ent_id = ent.id if ent else None
            if not ent:
                if entity_name not in unknown_entities:
                    unknown_entities.append(entity_name)
                needs_confirmation = True

            # Match Action Type
            action_obj = db.query(ActionType).filter(
                (ActionType.name.ilike(action_name)) | (ActionType.display_name.ilike(action_name))
            ).first()
            act_id = action_obj.id if action_obj else None
            if not action_obj:
                if action_name not in unknown_actions:
                    unknown_actions.append(action_name)
                needs_confirmation = True

            parsed_activities.append(
                ParsedActivity(
                    employee_name=emp_name,
                    employee_id=emp_id,
                    entity=entity_name,
                    entity_id=ent_id,
                    action=action_name,
                    action_id=act_id,
                    quantity=qty,
                    unit=unit_val
                )
            )

        # Build final confirmation message
        conf_msg = result_data.get("confirmation_message", "")
        
        # Only require hard confirmation if entity or action are completely missing
        critical_missing = bool(unknown_entities or unknown_actions)
        needs_confirmation = critical_missing

        if not conf_msg:
            if unknown_employees and not critical_missing:
                names_str = ", ".join(unknown_employees)
                conf_msg = f"تم استخراج الإنجازات بنجاح. سيتم إضافة ({names_str}) تلقائياً عند التثبيت."
            elif critical_missing:
                msg_parts = []
                if unknown_entities:
                    msg_parts.append(f"نوع إنجاز غير معروف: {', '.join(unknown_entities)}")
                if unknown_actions:
                    msg_parts.append(f"نوع إجراء غير معروف: {', '.join(unknown_actions)}")
                conf_msg = " | ".join(msg_parts)
            else:
                conf_msg = "أهلاً بك! أنا هنا لمساعدتك في أي وقت."

        # If no activities parsed at all, do not open confirmation side card
        has_activities = bool(parsed_activities)

        return AIParseResponse(
            success=True,
            activities=parsed_activities if has_activities else [],
            needs_confirmation=needs_confirmation if has_activities else False,
            confirmation_message=conf_msg,
            unknown_employees=unknown_employees,
            unknown_entities=unknown_entities,
            unknown_actions=unknown_actions,
            similar_employees=similar_employees
        )

    except Exception as e:
        return AIParseResponse(
            success=False,
            confirmation_message=f"حدث خطأ أثناء معالجة النص: {str(e)}",
            needs_confirmation=True
        )
