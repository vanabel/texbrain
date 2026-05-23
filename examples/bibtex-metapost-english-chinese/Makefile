# Usage:
#   make pdf              # default: English-bibtex
#   make pdf MODE=chinese # Chinese-bibtex
#   make pdf MODE=chinese-biblatex # Chinese-biblatex
#   make pdf MODE=elegantbook-cn   # Elegantbook-cn (XeLaTeX)
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
else ifeq ($(MODE),elegantbook-cn)
  BIB_DIR := Elegantbook-cn
  MAIN ?= elegantbook-cn-adobe.tex
else
  $(error MODE must be "english", "chinese", "chinese-biblatex", or "elegantbook-cn", got "$(MODE)")
endif

.PHONY: pdf clean switch

pdf:
ifeq ($(MODE),elegantbook-cn)
	cd "$(BIB_DIR)" && latexmk -xelatex -interaction=nonstopmode "$(MAIN)"
else
	cd "$(BIB_DIR)" && latexmk -pdf -interaction=nonstopmode "$(MAIN)"
endif

clean:
	cd "$(BIB_DIR)" && latexmk -c 2>/dev/null || true
	rm -f "$(BIB_DIR)"/*.aux "$(BIB_DIR)"/*.bbl "$(BIB_DIR)"/*.blg "$(BIB_DIR)"/*.log

switch:
	@./switch.sh $(MODE)
