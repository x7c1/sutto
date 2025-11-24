.PHONY: help claude-setup setup-role claude-run workspace pr

.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

claude-setup: ## Setup Claude container
	./vendor/strata/scripts/setup-claude-container.sh

setup-role: ## Setup Claude role configuration
	./vendor/strata/scripts/setup-claude-role.sh

claude-run: claude-setup setup-role ## Run Claude Code in Docker container
	@if [ -n "$$TMUX" ] && [ -n "$$ROLE" ]; then \
		tmux rename-window "$$ROLE"; \
	fi
	docker compose run --rm claude-code

workspace: claude-run ## Alias for claude-run
