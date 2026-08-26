FROM python:3.11-slim
WORKDIR /app
COPY org-c/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY org-c/app/ .
COPY shared/ ./shared/
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]