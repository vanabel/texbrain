            this.remove(FS, this.texmflog);
            this.remove(FS, this.missfontlog);
            this.remove(FS, cmd_log_path);

            // BusyTeX WASM: first XeLaTeX sometimes leaves main.aux without
            // \bibstyle/\bibdata/\citation even though those commands ran (seen with
            // gbt7714 + natbib). Repair from main.tex before bibtex8.
            if (is_bibtex) {
                const repaired = this.texbrainRepairAuxForBibtex(FS, tex_path, aux_path);
                if (repaired) this.print('$ # TeXbrain: repaired ' + aux_path + ' for BibTeX (' + repaired + ')');
            }

            this.print('$ busytex ' + cmd.join(' '));
            ({ exit_code, stdout, stderr } = Module.callMainWithRedirects([...cmd], verbose != BusytexPipeline.VerboseSilent));

            // Snapshot FS outputs before WASM heap reset. Some BusyTeX builds can
            // lose freshly written .aux/.bbl/.log if we only read them after wipe.
            const snapCmdAux = this.read_all_text(FS, cmd_aux_path);
            const snapLog = this.read_all_text(FS, cmd_log_path);
            const snapMainAux = this.read_all_text(FS, aux_path);
            const snapBbl = this.read_all_text(FS, bbl_path);

            Module.HEAPU8.fill(0);
            Module.HEAPU8.set(mem_header);

            // Restore critical artifacts if the heap reset emptied them.
            if (snapMainAux && this.read_all_text(FS, aux_path).length < snapMainAux.length) {
                FS.writeFile(aux_path, snapMainAux);
                this.print('$ # TeXbrain: restored ' + aux_path + ' after WASM heap reset');
            }
            if (snapBbl && this.read_all_text(FS, bbl_path).length < snapBbl.length) {
                FS.writeFile(bbl_path, snapBbl);
                this.print('$ # TeXbrain: restored ' + bbl_path + ' after WASM heap reset');
            }
            if (snapLog && this.read_all_text(FS, cmd_log_path).length < snapLog.length) {
                FS.writeFile(cmd_log_path, snapLog);
            }
            if (snapCmdAux && cmd_aux_path !== aux_path && cmd_aux_path !== bbl_path &&
                this.read_all_text(FS, cmd_aux_path).length < snapCmdAux.length) {
                FS.writeFile(cmd_aux_path, snapCmdAux);
            }

            this.print('$ echo $?');
            this.print(`${exit_code}\n`);

            if (is_bibtex && this.read_all_text(FS, bbl_path).trim() == '' && (exit_code == 0 || exit_code == 2)) {
                skip = true;
                this.print('$ # bibtex found no citation commands, skipping extra calls');
            }

            aux = this.read_all_text(FS, cmd_aux_path) || snapCmdAux;
            log = this.read_all_text(FS, cmd_log_path) || snapLog;
            exit_code = stdout.trim() ? (error_messages.some(err => stdout.includes(err)) ? exit_code : 0) : exit_code;

