    /**
     * If .aux lacks \bibstyle/\bibdata/\citation, synthesize them from main.tex.
     * Returns a short summary of what was added, or '' if no repair was needed.
     */
    texbrainRepairAuxForBibtex(FS, tex_path, aux_path) {
        const auxExists = FS.analyzePath(aux_path).exists;
        let auxText = auxExists ? FS.readFile(aux_path, { encoding: 'utf8' }) : '';
        const hasStyle = /\\bibstyle\{/.test(auxText);
        const hasData = /\\bibdata\{/.test(auxText);
        const hasCite = /\\citation\{/.test(auxText);
        if (hasStyle && hasData && hasCite) return '';

        if (!FS.analyzePath(tex_path).exists) return '';
        const texText = FS.readFile(tex_path, { encoding: 'utf8' });
        // Drop TeX line comments so we do not pick up commented-out bib commands.
        const tex = texText.replace(/(^|[^\\])%.*$/gm, '$1');

        const added = [];
        if (!hasStyle) {
            const m = tex.match(/\\bibliographystyle\s*\{([^}%]+)\}/);
            if (m) {
                added.push(`\\bibstyle{${m[1].trim()}}`);
            }
        }
        if (!hasData) {
            const m = tex.match(/\\bibliography\s*\{([^}%]+)\}/);
            if (m) {
                added.push(`\\bibdata{${m[1].trim()}}`);
            }
        }
        if (!hasCite) {
            if (/\\nocite\s*\{\s*\*\s*\}/.test(tex)) {
                added.push('\\citation{*}');
            } else {
                const keys = new Set();
                const re = /\\(?:no)?cite[a-zA-Z]*\s*(?:\[[^\]]*\]){0,2}\s*\{([^}%]+)\}/g;
                let m;
                while ((m = re.exec(tex)) !== null) {
                    for (const key of m[1].split(',')) {
                        const k = key.trim();
                        if (k && k !== '*') keys.add(k);
                    }
                }
                for (const k of keys) added.push(`\\citation{${k}}`);
            }
        }
        if (!added.length) return '';

        const prefix = auxText.trim() ? auxText.replace(/\s*$/, '\n') : '\\relax\n';
        FS.writeFile(aux_path, prefix + added.join('\n') + '\n');
        return added.join(', ');
    }

