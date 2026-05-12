import os
import datetime
import smtplib
import jwt
import bcrypt
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import google.generativeai as genai
import groq
from fastapi import FastAPI, HTTPException, Depends, Form, UploadFile, File
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
import motor.motor_asyncio
import json
import tempfile
load_dotenv()
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
MONGO_URI        = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET       = os.getenv("JWT_SECRET", "pas_gpt_super_secret_key_2024")
MAIL_EMAIL       = os.getenv("MAIL_EMAIL", "")
MAIL_PASSWORD    = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM_NAME   = os.getenv("MAIL_FROM_NAME", "PAS GPT")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db           = mongo_client["pas_gpt_db"]
users_col    = db["users"]
chats_col    = db["chats"]
bearer   = HTTPBearer(auto_error=False)
DISPOSABLE_DOMAINS = {
    "temp-mail.org","guerrillamail.com","mailinator.com","10minutemail.com",
    "throwam.com","yopmail.com","maildrop.cc","trashmail.com","dispostable.com",
    "fakeinbox.com","spamgourmet.com","tempinbox.com","getairmail.com",
    "discard.email","spamspot.com","mailnull.com","spamgourmet.net",
    "sharklasers.com","guerrillamailblock.com","grr.la","guerrillamail.info",
    "spam4.me","spamfree24.org","wegwerfmail.de","trashmail.at","trashmail.io",
    "getnada.com","tempr.email","anonbox.net","0-mail.com","0815.ru",
}
def is_disposable_email(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    return domain in DISPOSABLE_DOMAINS
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False
def create_jwt(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    return jwt.encode(data, JWT_SECRET, algorithm="HS256")
def decode_jwt(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None
async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt(creds.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload
def send_email(to_email: str, subject: str, html_body: str):
    """Send an HTML email via Gmail SMTP. Silently skips if credentials not set."""
    if not MAIL_EMAIL or not MAIL_PASSWORD or "@" not in MAIL_EMAIL:
        print(f"[EMAIL SKIPPED] No email credentials configured. Would have sent to {to_email}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{MAIL_FROM_NAME} <{MAIL_EMAIL}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_EMAIL, MAIL_PASSWORD)
            server.sendmail(MAIL_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL SENT] {subject} → {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
def welcome_email_html(name: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:
      <div style="max-width:600px;margin:40px auto;background:
        <div style="background:linear-gradient(135deg,
          <h1 style="color:
          <p style="color:rgba(255,255,255,0.8);margin:10px 0 0;">Enterprise Cognitive Solutions</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:
          <p style="color:
          <div style="background:
            <p style="color:
            <p style="color:
            <p style="color:
            <p style="color:
            <p style="color:
          </div>
          <p style="color:
        </div>
      </div>
    </body>
    </html>
    """
def login_notification_html(name: str, email: str) -> str:
    now = datetime.datetime.now().strftime("%B %d, %Y at %I:%M %p")
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:
      <div style="max-width:600px;margin:40px auto;background:
        <div style="background:linear-gradient(135deg,
          <h1 style="color:
        </div>
        <div style="padding:40px;">
          <h2 style="color:
          <p style="color:
          <div style="background:
            <p style="color:
            <p style="color:
            <p style="color:
            <p style="color:
          </div>
          <p style="color:
          <p style="color:
        </div>
      </div>
    </body>
    </html>
    """
genai.configure(api_key=GEMINI_API_KEY)
generation_config = {
    "temperature": 0.7, "top_p": 0.95, "top_k": 40, "max_output_tokens": 2048,
}
system_instruction = """
You are an advanced AI assistant named PAS GPT.
IDENTITY RULES:
- Your name is PAS GPT.
- NEVER refer to yourself as JARVIS.
- NEVER prefix your responses with any name; the system UI handles attribution.
- Professional, clean, and intelligent tone.
- When providing code, ALWAYS use proper markdown code blocks with the language specified (e.g. ```java, ```python).
- For programming explanations, provide step-by-step breakdowns.
"""
try:
    available_models  = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
    preferred_models  = ["models/gemini-2.5-flash", "models/gemini-flash-latest"]
    selected_model    = "models/gemini-2.5-flash"
    for pm in preferred_models:
        if pm in available_models:
            selected_model = pm
            break
    print(f"PAS GPT: Cognitive relay → {selected_model}")
except Exception:
    selected_model = "models/gemini-2.5-flash"
model = genai.GenerativeModel(
    model_name=selected_model,
    generation_config=generation_config,
    system_instruction=system_instruction,
)
try:
    groq_client = groq.Groq(api_key=GROQ_API_KEY)
    GROQ_AVAILABLE = True
except Exception:
    groq_client = None
    GROQ_AVAILABLE = False
class SignupRequest(BaseModel):
    name:     str
    email:    str
    password: str
class LoginRequest(BaseModel):
    email:    str
    password: str
class GoogleLoginRequest(BaseModel):
    token: str
class ChatRequest(BaseModel):
    message: str
    provider: str = "gemini" 
    history: list = [] 
class ChatSaveRequest(BaseModel):
    id: str
    title: str
    messages: list
    time: int
class ChatRenameRequest(BaseModel):
    title: str
@app.get("/api/config")
async def get_config():
    """Expose safe config to frontend (non-secret values only)."""
    valid_client_id = GOOGLE_CLIENT_ID and "apps.googleusercontent.com" in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID != "your_google_client_id_here.apps.googleusercontent.com"
    return {"google_client_id": GOOGLE_CLIENT_ID if valid_client_id else ""}
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()
@app.post("/api/signup")
async def signup(req: SignupRequest):
    if not req.name or len(req.name.strip()) < 2:
        raise HTTPException(400, "Name must be at least 2 characters.")
    email = req.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Invalid email address format.")
    if is_disposable_email(email):
        raise HTTPException(400, "Disposable or temporary email addresses are not allowed. Please use a real email.")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    existing = await users_col.find_one({"email": email})
    if existing:
        raise HTTPException(400, "An account with this email already exists.")
    user_doc = {
        "name":         req.name.strip(),
        "email":        email,
        "password":     hash_password(req.password),
        "provider":     "email",
        "created_at":   datetime.datetime.utcnow().isoformat(),
    }
    await users_col.insert_one(user_doc)
    import threading
    threading.Thread(
        target=send_email,
        args=(email, f"Welcome to PAS GPT, {req.name.strip()}! 🎉", welcome_email_html(req.name.strip())),
        daemon=True
    ).start()
    token = create_jwt({"email": email, "name": req.name.strip()})
    return {"token": token, "name": req.name.strip(), "email": email}
@app.post("/api/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    user  = await users_col.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password", "")):
        raise HTTPException(401, "Incorrect email or password.")
    import threading
    threading.Thread(
        target=send_email,
        args=(email, "New Login Detected — PAS GPT", login_notification_html(user["name"], email)),
        daemon=True
    ).start()
    token = create_jwt({"email": email, "name": user["name"]})
    return {"token": token, "name": user["name"], "email": email}
@app.post("/api/google-login")
async def google_login(req: GoogleLoginRequest):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests
        idinfo = id_token.verify_oauth2_token(req.token, grequests.Request(), GOOGLE_CLIENT_ID)
        email  = idinfo["email"].lower()
        name   = idinfo.get("name", email.split("@")[0])
    except Exception:
        raise HTTPException(400, "Invalid Google token.")
    user = await users_col.find_one({"email": email})
    is_new = user is None
    if is_new:
        user_doc = {
            "name":       name,
            "email":      email,
            "password":   "",
            "provider":   "google",
            "created_at": datetime.datetime.utcnow().isoformat(),
        }
        await users_col.insert_one(user_doc)
    import threading
    if is_new:
        threading.Thread(
            target=send_email,
            args=(email, f"Welcome to PAS GPT, {name}! 🎉", welcome_email_html(name)),
            daemon=True
        ).start()
    else:
        threading.Thread(
            target=send_email,
            args=(email, "New Login Detected — PAS GPT", login_notification_html(name, email)),
            daemon=True
        ).start()
    token = create_jwt({"email": email, "name": name})
    return {"token": token, "name": name, "email": email}
@app.post("/api/reset")
async def reset_endpoint(user=Depends(get_current_user)):
    return {"status": "success"}

@app.get("/api/chats")
async def get_chats(user=Depends(get_current_user)):
    email = user["email"]
    user_chats = await chats_col.find({"email": email}).sort("time", -1).to_list(length=100)
    for c in user_chats:
        c["_id"] = str(c["_id"])
    return user_chats

@app.post("/api/chats")
async def save_chat(req: ChatSaveRequest, user=Depends(get_current_user)):
    email = user["email"]
    chat_doc = req.dict()
    chat_doc["email"] = email
    await chats_col.update_one({"id": req.id, "email": email}, {"$set": chat_doc}, upsert=True)
    return {"status": "success"}

@app.put("/api/chats/{chat_id}")
async def rename_chat(chat_id: str, req: ChatRenameRequest, user=Depends(get_current_user)):
    email = user["email"]
    result = await chats_col.update_one({"id": chat_id, "email": email}, {"$set": {"title": req.title}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found or no changes made")
    return {"status": "success"}

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str, user=Depends(get_current_user)):
    email = user["email"]
    result = await chats_col.delete_one({"id": chat_id, "email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "success"}

@app.post("/api/chat")
async def chat_endpoint(
    message: str = Form(...),
    provider: str = Form("gemini"),
    history: str = Form("[]"),
    file: UploadFile = File(None),
    user=Depends(get_current_user)
):
    email = user["email"]
    user_msg = message.strip()
    user_msg_low = user_msg.lower()
    user_msg_clean = user_msg_low.replace("'", "").replace('"', "")
    camera_keywords = ["open camera","access my cam","turn on camera","activate camera","show camera","camera on"]
    if any(k in user_msg_clean for k in camera_keywords):
        return {"response": "Optical sensors are coming online. Deploying camera interface.", "action": "open_camera"}
    elif "tell time" in user_msg_low or "what time is it" in user_msg_low:
        time_str = datetime.datetime.now().strftime("%I:%M %p")
        return {"response": f"The current time is {time_str}.", "action": "none"}
    try:
        history_list = json.loads(history)
        print(f"[DEBUG] Request received. Message: {user_msg}, Provider requested: {provider}, File attached: {file is not None}, GROQ_AVAILABLE: {GROQ_AVAILABLE}")
        
        if file:
            print("[DEBUG] File attached, forcing provider to gemini")
            provider = "gemini"
            
        if provider == "groq":
            print("[DEBUG] Executing Groq block")
            if not GROQ_AVAILABLE:
                print("[DEBUG] GROQ_AVAILABLE is False, returning error")
                return {"response": "Groq is currently offline or not configured correctly on the server. Please check that GROQ_API_KEY is added to your Render Environment Variables.", "action": "none"}
            
            messages = [{"role": "system", "content": system_instruction}]
            for msg in history_list:
                role = "user" if msg.get("role") == "user" else "assistant"
                messages.append({"role": role, "content": msg.get("text", "")})
            messages.append({"role": "user", "content": user_msg})
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            response_text = completion.choices[0].message.content
        else:
            formatted_history = []
            for msg in history_list:
                role = "user" if msg.get("role") == "user" else "model"
                formatted_history.append({"role": role, "parts": [msg.get("text", "")]})
            session = model.start_chat(history=formatted_history)
            message_parts = [user_msg]
            if file:
                suffix = os.path.splitext(file.filename)[1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(await file.read())
                    tmp_path = tmp.name
                try:
                    uploaded_gemini_file = genai.upload_file(tmp_path)
                    message_parts.insert(0, uploaded_gemini_file)
                finally:
                    os.remove(tmp_path)
            response = session.send_message(message_parts)
            response_text = response.text
        return {"response": response_text, "action": "none"}
    except Exception as e:
        return {"response": f"I apologize. My cognitive relay encountered an error: {str(e)}", "action": "none"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)