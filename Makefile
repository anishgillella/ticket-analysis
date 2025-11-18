.PHONY: build up down logs test clean

# Build frontend and start all services
build:
	cd frontend && npm run build
	docker compose build

# Start all services
up:
	docker compose up -d

# Start with logs
up-logs:
	docker compose up

# Stop all services
down:
	docker compose down

# View logs
logs:
	docker compose logs -f

# Clean everything
clean:
	docker compose down -v
	docker system prune -f

# Full restart
restart: down build up

