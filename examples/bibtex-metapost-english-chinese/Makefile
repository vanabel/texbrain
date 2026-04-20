# Usage:
#   make pdf              # default: English-bibtex
#   make pdf MODE=chinese # Chinese-bibtex
#   make pdf MODE=chinese-biblatex # Chinese-biblatex
#
# Or: make switch MODE=chinese && cd active && latexmk -pdf ...

MODE ?= english

ifeq ($(MODE),chinese)
  BIB_DIR := Chinese-bibtex
  MAIN ?= Chinese-bibtex.tex
else ifeq ($(MODE),chinese-biblatex)
  BIB_DIR := Chinese-biblatex
  MAIN ?= Chinese-biblatex.tex
else ifeq ($(MODE),english)
  BIB_DIR := English-bibtex
  MAIN ?= test-arxiv.tex
else
  $(error MODE must be "english", "chinese", or "chinese-biblatex", got "$(MODE)")
endif

.PHONY: pdf clean switch

pdf:
	cd "$(BIB_DIR)" && latexmk -pdf -interaction=nonstopmode "$(MAIN)"

clean:
	cd "$(BIB_DIR)" && latexmk -c 2>/dev/null || true
	rm -f "$(BIB_DIR)"/*.aux "$(BIB_DIR)"/*.bbl "$(BIB_DIR)"/*.blg "$(BIB_DIR)"/*.log

switch:
	@./switch.sh $(MODE)
