.PHONY: install install-backend install-frontend dev backend frontend

install: install-backend install-frontend

install-backend:
	cd backend && python -m venv video_edit && source video_edit/bin/activate && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

backend:
	cd backend && source video_edit/bin/activate && KMP_DUPLICATE_LIB_OK=TRUE uvicorn main:app --reload

frontend:
	cd frontend && npm run dev

dev:
	make -j2 backend frontend
