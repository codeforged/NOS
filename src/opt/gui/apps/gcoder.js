const { version } = require("os");

module.exports = {
  application: (uuid) => {
    const appName = 'gcoder';
    const appTitle = 'GCoder Text Editor v1.05';
    return {
      header: {
        appName,
        appTitle,
        uuid,
        version: appTitle,
        active: true,
        icon: "/opt/gui/images/icon/icon_32_editor.png",
        resizable: true,
        width: 850,
        height: 500,
      },
      content: `
        <style>
          .zinnia-demo-container[data-uuid="${uuid}"] {            
            padding: 3px;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden; /* hilangkan scroller utama window */
          }
          .gcoder-main-row {
            display: flex;
            flex-direction: row;
            /* height: 100%; */ /* Replaced for flex layout */
            flex: 1; /* Allow main row to take available space */
            min-height: 0; /* Prevent issues with shrinking flex items */
            width: 100%;
          }
          .file-navigator-panel {
            width: 195px;
            min-width: 150px;
            max-width: 400px;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            flex: none;
            transition: width 0.2s;
          }
          .file-navigator-toolbar {
            flex: none;
            /* biarkan tinggi natural */
            z-index: 1;
            background: #fff;
          }
          .file-navigator-list {
            flex: 1 1 0%;
            overflow: auto;
            min-height: 0;
          }
          .splitter {
            width: 6px;
            background: #e0e0e0;
            cursor: ew-resize;
            flex-shrink: 0;
          }
          .editor-panel {
            height: 100%;
            flex: 1 1 0%;            
            overflow: hidden; /* pastikan hanya scroller CodeMirror yang muncul */
          }
          .editorArea, #editorArea {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
          .tree-list {
            position: relative;
            padding-left: 12px;
            margin-bottom: 0;
          }
          .tree-item {
            border-radius: 0 !important;
            position: relative;
            padding-left: 2px;
            margin-left: 0px; /* Untuk memberi ruang bagi garis vertikal */
          }
          .file-navigator-list > .tree-list::before { /* Garis vertikal utama untuk root list */
            content: '';
            position: absolute;
            left: 6px;
            top: 0; /* Mulai dari paling atas */
            width: 1px;
            height: 100%; /* Sepanjang tinggi list */
            background: #bbb;
          }
          .tree-list::before {
            content: '';
            position: absolute;
            left: 6px;
            top: 0;
            width: 1px;
            height: 100%;
            background: #bbb;
          }
          .tree-item::before { /* Garis horizontal untuk setiap item */
            content: '';
            position: absolute;
            left: -6px; /* Disesuaikan agar terhubung ke garis vertikal di left:6px (relatif ke ul) */
            top: 0.9em; /* Posisi vertikal tengah item */
            width: 7px; /* Lebar garis horizontal hingga ke awal item */
            height: 1px;
            background: #bbb;
          }
          .gcoder-status-bar {
            flex-shrink: 0; /* Status bar tidak menyusut */
            padding: 4px 8px;
            background-color: #f0f0f0;
            border-top: 1px solid #ccc;
            font-size: 0.85em;
            color: #333;
            height: 24px; /* Tinggi status bar */
            line-height: 16px; /* Sesuaikan dengan tinggi untuk vertical align */
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
         /* Indent guides for CodeMirror */
         .CodeMirror pre { position: relative; background: none !important; }
         .CodeMirror .cm-indent-guide {
           position: absolute;
           left: 0;
           top: 0;
           bottom: 0;
           width: 0;
           border-left: 1px solid #4446;
           pointer-events: none;
           z-index: 0;
         }
        </style>
        <div class="zinnia-demo-container" data-app="${appName}" data-uuid="${uuid}">
          <div class="gcoder-main-row">
            <div class="file-navigator-panel"></div>
            <div class="splitter"></div>
            <div class="editor-panel"></div>
          </div>
          <div class="gcoder-status-bar">Ready</div>
        </div>
        `
      ,
      main: (sender, nos) => {
        sender.ws.remoteFunction.codeEditor = {};

        sender.ws.remoteFunction.codeEditor.save = (params) => {
          let fileName = params[0];
          let content = params[1];
          sender.fa.writeFileSync(fileName, content);
          return ["OK"];
        };

        sender.ws.remoteFunction.codeEditor.load = (params) => {
          let fileName = params[0];
          let content = sender.fa.readFileSync(fileName);
          return [content];
        };

        const path = require("path"); // Tambahkan untuk path join

        sender.ws.remoteFunction.codeEditor.getStructure = (params) => {
          let dirPath = params[0];
          let structure;
          try {
            structure = sender.fa.readdirSync(dirPath).map((name) => {
              // Gunakan path.posix.join agar path selalu normal
              const filePath = path.posix.join(dirPath, name);
              const stats = sender.fa.statSync(filePath);
              return {
                name,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                path: filePath
              };
            });
          } catch (err) {
            console.error(`Error reading directory ${dirPath}:`, err);
          }

          // console.log(`Checking file: ${JSON.stringify(structure)}`);
          return [JSON.stringify(structure)];
        };
      },
      jsContent: (app) => {
        const appUuid = app.header.uuid;
        const parentSelector = `.zinnia-demo-container[data-uuid="${appUuid}"]`;

        const dom = new Zinnia();

        const existingContainer = document.querySelector(parentSelector);

        function setStatusBarText(text = "Ready") {
          const statusBarElement = existingContainer.querySelector(`.gcoder-status-bar`);
          if (statusBarElement) { // Add null check
            statusBarElement.textContent = text;
          }
        }

        if (!existingContainer) {
          console.error(
            "Container dengan class .zinnia-demo-container tidak ditemukan!",
          );
          return;
        }

        // Ambil elemen mainRow dari layout baru
        const mainRow = existingContainer.querySelector('.gcoder-main-row');
        const fileNavPanel = mainRow.querySelector('.file-navigator-panel');
        const splitter = mainRow.querySelector('.splitter');
        const editorPanel = mainRow.querySelector('.editor-panel');

        // Splitter logic
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        splitter.addEventListener('mousedown', function (e) {
          isResizing = true;
          startX = e.clientX;
          startWidth = fileNavPanel.offsetWidth;
          document.body.style.cursor = 'ew-resize';
        });
        document.addEventListener('mousemove', function (e) {
          if (!isResizing) return;
          const dx = e.clientX - startX;
          let newWidth = startWidth + dx;
          newWidth = Math.max(150, Math.min(400, newWidth));
          fileNavPanel.style.width = newWidth + 'px';
        });
        document.addEventListener('mouseup', function () {
          if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
          }
        });

        // Tempatkan tombol Load dan Save di atas file navigator
        // --- FIX: pisahkan toolbar dan file list agar toolbar tidak hilang saat render ulang ---
        const toolbarContainer = document.createElement('div');
        toolbarContainer.className = 'file-navigator-toolbar';
        toolbarContainer.style.marginBottom = '8px';
        const toolbar = document.createElement('div');
        toolbar.style.display = 'flex';
        toolbar.style.gap = '4px';
        const loadBtn = dom.createButton('Load', null, 'primary', ["btn-sm"], null, 'btn-load');
        const saveBtn = dom.createButton('Save', null, 'success', ["btn-sm"], null, 'btn-save');
        // New: Add New button
        const newBtn = dom.createButton('New', null, 'info', ["btn-sm"], null, 'btn-new');
        // New: Add Refresh button
        const refreshBtn = dom.createButton('🔄', null, 'secondary', ["btn-sm"], null, 'btn-refresh');
        toolbar.appendChild(newBtn);
        toolbar.appendChild(loadBtn);
        toolbar.appendChild(saveBtn);
        toolbar.appendChild(refreshBtn); // Add refresh button to toolbar
        toolbarContainer.appendChild(toolbar);
        fileNavPanel.appendChild(toolbarContainer);
        // Container khusus untuk file list
        const fileListContainer = document.createElement('div');
        fileListContainer.className = 'file-navigator-list';
        fileNavPanel.appendChild(fileListContainer);

        // Tempatkan CodeMirror di editor-panel
        const editorTextArea = document.createElement('textarea');
        editorTextArea.id = 'editorArea';
        editorTextArea.style.width = '100%';
        editorTextArea.style.height = '100%';
        editorTextArea.style.minHeight = '300px';
        editorTextArea.style.fontFamily = 'monospace';
        editorTextArea.style.fontSize = '14px';
        editorPanel.appendChild(editorTextArea);
        if (window.CodeMirror) {
          window.gcoderEditor = CodeMirror.fromTextArea(editorTextArea, {
            mode: 'javascript',
            lineNumbers: true,
            theme: 'monokai',
            tabSize: 2,
            indentWithTabs: false,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            keyMap: "sublime", // Use the Sublime Text keymap
            matchBrackets: true,
            autoCloseBrackets: true,
            lineWrapping: true,
            extraKeys: {
              "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
              "Ctrl-/": function (cm) {
                // Toggle comment functionality
                const from = cm.getCursor("start");
                const to = cm.getCursor("end");

                // Comment pattern (for JavaScript)
                const commentPattern = "// ";

                // If it's a selection across multiple lines
                if (from.line !== to.line || from.ch !== to.ch) {
                  // Check if all lines are commented
                  let allCommented = true;
                  for (let i = from.line; i <= to.line; i++) {
                    const line = cm.getLine(i).trimStart();
                    if (line && !line.startsWith("//")) {
                      allCommented = false;
                      break;
                    }
                  }

                  // Comment or uncomment each line in the selection
                  for (let i = from.line; i <= to.line; i++) {
                    const line = cm.getLine(i);
                    const trimmedLine = line.trimStart();

                    if (allCommented && trimmedLine.startsWith("//")) {
                      // Uncomment line
                      const indentation = line.substring(0, line.length - trimmedLine.length);
                      const uncommentedLine = indentation + trimmedLine.replace(/^\/\/\s?/, '');
                      cm.replaceRange(uncommentedLine, { line: i, ch: 0 }, { line: i, ch: line.length });
                    } else if (!allCommented && trimmedLine.length > 0) {
                      // Comment line
                      const indentation = line.substring(0, line.length - trimmedLine.length);
                      const commentedLine = indentation + commentPattern + trimmedLine;
                      cm.replaceRange(commentedLine, { line: i, ch: 0 }, { line: i, ch: line.length });
                    }
                  }
                } else {
                  // Handle single line
                  const line = cm.getLine(from.line);
                  const trimmedLine = line.trimStart();

                  if (trimmedLine.startsWith("//")) {
                    // Uncomment line
                    const indentation = line.substring(0, line.length - trimmedLine.length);
                    const uncommentedLine = indentation + trimmedLine.replace(/^\/\/\s?/, '');
                    cm.replaceRange(uncommentedLine, { line: from.line, ch: 0 }, { line: from.line, ch: line.length });
                  } else {
                    // Comment line
                    const indentation = line.substring(0, line.length - trimmedLine.length);
                    const commentedLine = indentation + commentPattern + trimmedLine;
                    cm.replaceRange(commentedLine, { line: from.line, ch: 0 }, { line: from.line, ch: line.length });
                  }
                }
              }
            },
            lineWrapping: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            foldOptions: {
              widget: (from, to) => {
                var count = undefined;
                try {
                  // Use the correct editor instance (this editor)
                  var startToken = '{', endToken = '}';
                  var prevLine = window.gcoderEditor.getLine(from.line);
                  if (prevLine && prevLine.lastIndexOf('[') > prevLine.lastIndexOf('{')) {
                    startToken = '[', endToken = ']';
                  }

                  // Get content from the current editor
                  var internal = window.gcoderEditor.getRange(from, to);
                  var toParse = startToken + internal + endToken;

                  // Get key count
                  try {
                    var parsed = JSON.parse(toParse);
                    count = Object.keys(parsed).length;
                  } catch (e) {
                    // JSON parsing error - just show folding indicator
                    return '\u2194';
                  }
                } catch (e) {
                  console.warn('Error in fold widget:', e);
                }

                return count ? `\u21A4${count}\u21A6` : '\u2194';
              }
            }
          });

          // Indent guides: add vertical lines for each indent level
          function addIndentGuides(cm) {
            cm.on("renderLine", function (cm, line, elt) {
              // Remove old guides
              elt.querySelectorAll && elt.querySelectorAll('.cm-indent-guide').forEach(e => e.remove());
              // Count indentation (spaces or tabs)
              const text = line.text;
              let indent = 0;
              for (let i = 0; i < text.length; i++) {
                if (text[i] === ' ') indent += 1;
                else if (text[i] === '\t') indent += cm.getOption("tabSize");
                else break;
              }
              // Draw guides every tabSize spaces
              const tabSize = cm.getOption("tabSize");
              for (let i = tabSize; i <= indent; i += tabSize) {
                const guide = document.createElement('span');
                guide.className = 'cm-indent-guide';
                guide.style.left = (cm.defaultCharWidth() * i) + "px";
                guide.style.height = "100%";
                elt.insertBefore(guide, elt.firstChild);
              }
            });
            cm.refresh();
          }
          addIndentGuides(window.gcoderEditor);

          // Pastikan addon fold terdaftar
          if (window.CodeMirror && typeof window.CodeMirror.fold === 'undefined') {
            console.warn('CodeMirror fold addon tidak ditemukan, folding tidak akan berfungsi');
          }

          // Register the brace fold mode (untuk javascript)
          if (window.CodeMirror && typeof window.CodeMirror.registerHelper === 'function') {
            try {
              // Define a simple folding function for JS if not already defined
              if (!window.CodeMirror.fold || !window.CodeMirror.fold.brace) {
                window.CodeMirror.registerHelper('fold', 'brace', function (cm, start) {
                  var line = start.line, lineText = cm.getLine(line);
                  var startCh, endCh;

                  // Find opening brace
                  for (var i = 0; i < lineText.length; i++) {
                    if (lineText[i] == '{' || lineText[i] == '[') {
                      startCh = i;
                      break;
                    }
                  }

                  if (startCh == null) return;

                  // Find matching closing brace
                  var count = 1, match = lineText[startCh] == '{' ? '}' : ']';
                  var lastLineIndex = cm.lineCount() - 1;

                  // Check if closing brace is on the same line - skip folding in this case
                  var countInLine = 1;
                  for (var pos = startCh + 1; pos < lineText.length; pos++) {
                    if (lineText[pos] == match) countInLine--;
                    else if (lineText[pos] == lineText[startCh]) countInLine++;

                    // If we found the matching closing brace on the same line, don't fold
                    if (!countInLine) {
                      // Check if it's an array or object with some content (not empty)
                      if (pos - startCh > 2) {
                        // Only fold if this is a multi-line content
                        if (line != start.line) {
                          return {
                            from: CodeMirror.Pos(start.line, startCh),
                            to: CodeMirror.Pos(line, pos + 1)
                          };
                        }
                      }
                      return null; // Don't fold single-line arrays/objects
                    }
                  }

                  // If we get here, we need to search in subsequent lines
                  for (var i = line; i <= lastLineIndex; i++) {
                    var text = cm.getLine(i);
                    var pos = i == line ? startCh + 1 : 0;

                    for (; pos < text.length; pos++) {
                      if (text[pos] == match) count--;
                      else if (text[pos] == lineText[startCh]) count++;

                      if (!count) {
                        // Only fold if this spans multiple lines
                        if (i > line) {
                          return {
                            from: CodeMirror.Pos(line, startCh),
                            to: CodeMirror.Pos(i, pos + 1)
                          };
                        }
                        return null; // Don't fold single-line structures
                      }
                    }
                  }

                  return null;
                });
              }
            } catch (e) {
              console.warn('Failed to register brace folding:', e);
            }
          }

          // Mencoba fold baris tertentu (jika ada konten)
          setTimeout(() => {
            if (window.gcoderEditor && window.gcoderEditor.getValue().length > 0) {
              try {
                window.gcoderEditor.foldCode(CodeMirror.Pos(13, 0));
              } catch (e) {
                console.warn('Gagal melakukan fold:', e);
              }
            }
          }, 1000); // Increase timeout to ensure editor is fully initialized
          window.gcoderEditor.setSize('100%', '100%');
        }
        // Floating modal konfirmasi dan notifikasi
        const modalOverlay = document.createElement('div');
        modalOverlay.style.position = 'absolute';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100%';
        modalOverlay.style.height = '100%';
        modalOverlay.style.display = 'none';
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.justifyContent = 'center';
        modalOverlay.style.background = 'rgba(0,0,0,0.15)';
        modalOverlay.style.zIndex = '1000';
        editorPanel.style.position = 'relative';
        editorPanel.appendChild(modalOverlay);

        function showFloating(contentNode) {
          modalOverlay.innerHTML = '';
          modalOverlay.appendChild(contentNode);
          modalOverlay.style.display = 'flex';
        }
        function hideFloating() {
          modalOverlay.innerHTML = '';
          modalOverlay.style.display = 'none';
        }

        // Floating notifikasi
        function showFloatingNotif(message, type = 'success', duration = 1800) {
          const notif = dom.createAlert(message, type, 'floating-alert');
          notif.style.position = 'relative';
          notif.style.minWidth = '260px';
          notif.style.maxWidth = '400px';
          notif.style.margin = '0 auto';
          notif.style.fontSize = '1.1em';
          notif.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
          notif.style.textAlign = 'center';
          notif.style.zIndex = '1001';
          showFloating(notif);
          setTimeout(hideFloating, duration);
        }

        // Floating konfirmasi
        function showConfirmDialog(onSave, onDiscard, onCancel) {
          const dialog = document.createElement('div');
          dialog.className = 'bg-white p-4 rounded shadow border';
          dialog.style.minWidth = '320px';
          dialog.style.maxWidth = '90vw';
          dialog.style.textAlign = 'center';
          dialog.innerHTML = `
            <div class="mb-3">Ada perubahan yang belum disimpan.<br>Apa yang ingin Anda lakukan?</div>
            <div class="d-flex justify-content-center gap-2">
              <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
              <button class="btn btn-warning" id="btn-discard">Discard</button>
              <button class="btn btn-success" id="btn-save">Save</button>
            </div>
          `;
          showFloating(dialog);
          dialog.querySelector('#btn-cancel').onclick = () => { hideFloating(); if (onCancel) onCancel(); };
          dialog.querySelector('#btn-discard').onclick = () => { hideFloating(); if (onDiscard) onDiscard(); };
          dialog.querySelector('#btn-save').onclick = () => { hideFloating(); if (onSave) onSave(); };
        }

        // State untuk file yang sedang dipilih
        let selectedFilePath = null;
        let lastSelectedLi = null;
        let lastLoadedContent = '';
        let isDirty = false;
        // Helper untuk update title bar
        function updateWindowTitle() {
          let baseTitle = app.header.appTitle;

          let fileDisplayPathForStatusBar = "Ready"; // Default status text
          let dirtyStringForStatusBar = "";
          let windowTitleText = baseTitle;

          if (selectedFilePath) {
            // For status bar: tampilkan path absolut (bukan tanpa /)
            fileDisplayPathForStatusBar = selectedFilePath;

            // For window title: just the filename
            let fileNameForWindowTitle = selectedFilePath.substring(selectedFilePath.lastIndexOf('/') + 1);
            let dirtyStarForWindowTitle = isDirty ? "*" : ""; // Asterisk for dirty state in title
            windowTitleText = `${baseTitle} - ${fileNameForWindowTitle}${dirtyStarForWindowTitle}`;
          } else {
            fileDisplayPathForStatusBar = "No file selected";
          }

          if (isDirty) {
            dirtyStringForStatusBar = " (modified)"; // Text for dirty state in status bar
          }

          // Update window title
          // $(`[data-uuid="${appUuid}"]`).parent().parent().window('setTitle', windowTitleText);

          // Update status bar text
          setStatusBarText(`${fileDisplayPathForStatusBar}${dirtyStringForStatusBar}`);
        }
        // Tambahkan highlight pada file yang diklik
        function highlightSelectedFile(li) {
          if (lastSelectedLi) lastSelectedLi.classList.remove('active', 'bg-secondary', 'text-white');
          if (li) li.classList.add('active', 'bg-secondary', 'text-white');
          lastSelectedLi = li;
          // HAPUS: updateWindowTitle();
        }
        // Pantau perubahan editor
        if (window.gcoderEditor) {
          window.gcoderEditor.on('change', function () {
            const currentContent = window.gcoderEditor.getValue();
            let oldIsDirty = isDirty;
            if (currentContent !== lastLoadedContent) {
              isDirty = true;
            } else {
              isDirty = false;
            }
            if (isDirty !== oldIsDirty) { // Only update if dirty status actually changed
              updateWindowTitle();
            }
          });
        }
        // Fungsi load file ke editor
        function loadFileToEditor(path, li) {
          RFC.callRFC('codeEditor.load', [path], (ret) => {
            if (window.gcoderEditor) window.gcoderEditor.setValue(ret[0]);
            lastLoadedContent = ret[0];
            isDirty = false;
            showFloatingNotif('File berhasil dimuat!', 'success', 500);
            selectedFilePath = path;
            highlightSelectedFile(li);
            updateWindowTitle(); // Pindahkan ke sini saja
          });
        }
        // Fungsi save file
        function saveCurrentFile(callback) {
          if (!selectedFilePath) {
            showFloatingNotif('Pilih file terlebih dahulu!', 'warning');
            return;
          }
          const content = window.gcoderEditor ? window.gcoderEditor.getValue() : '';
          RFC.callRFC('codeEditor.save', [selectedFilePath, content], (ret) => {
            lastLoadedContent = content;
            isDirty = false;
            showFloatingNotif('File berhasil disimpan!', 'success', 500);
            if (typeof callback === 'function') callback();
            updateWindowTitle();
          });
        }
        // Handler tombol Load
        loadBtn.addEventListener('click', function () {
          if (!selectedFilePath) {
            showFloatingNotif('Pilih file terlebih dahulu!', 'warning');
            return;
          }
          if (isDirty) {
            showConfirmDialog(
              () => saveCurrentFile(() => loadFileToEditor(selectedFilePath, lastSelectedLi)),
              () => loadFileToEditor(selectedFilePath, lastSelectedLi),
              () => { } // cancel
            );
            return;
          }
          loadFileToEditor(selectedFilePath, lastSelectedLi);
        });
        // Handler tombol Save
        saveBtn.addEventListener('click', function () {
          saveCurrentFile();
        });
        // New: Handler for New button
        newBtn.addEventListener('click', function () {
          showNewFileDialog(function (filename) {
            // Create file via backend
            RFC.callRFC('codeEditor.save', [filename, ''], (ret) => {
              lastLoadedContent = '';
              isDirty = false;
              selectedFilePath = filename;
              if (window.gcoderEditor) window.gcoderEditor.setValue('');
              showFloatingNotif('File baru berhasil dibuat!', 'success', 700);
              updateWindowTitle();
              // Refresh file list
              RFC.callRFC("codeEditor.getStructure", ["/"], (ret2) => {
                const files = JSON.parse(ret2[0]);
                const ul = document.createElement('ul');
                ul.classList.add('list-group', 'tree-list');
                ul.style.border = 'none';
                renderFileList(files, ul);
                fileListContainer.innerHTML = '';
                fileListContainer.appendChild(ul);
                // Optionally, highlight the new file
                // Find and highlight the new file in the list
                setTimeout(() => {
                  const allLis = fileListContainer.querySelectorAll('li');
                  for (let li of allLis) {
                    if (li.textContent === filename.substring(filename.lastIndexOf('/') + 1)) {
                      highlightSelectedFile(li);
                      break;
                    }
                  }
                }, 100);
              });
            });
          });
        });

        function renderFileList(files, parentUl) {
          files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          parentUl.classList.add('tree-list');
          files.forEach(file => {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'py-0', 'px-1', 'tree-item');
            li.style.border = 'none';
            if (file.isDirectory) {
              li.style.cursor = 'pointer';
              li.innerHTML = `<span>📁${file.name}`;
              let expanded = false;
              let childUl = null;
              li.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!expanded) {
                  if (!childUl) {
                    childUl = document.createElement('ul');
                    childUl.classList.add('list-group', 'ms-1', 'tree-list');
                    childUl.style.border = 'none';
                    RFC.callRFC("codeEditor.getStructure", [file.path], (ret2) => {
                      const children = JSON.parse(ret2[0]);
                      renderFileList(children, childUl);
                    });
                    li.appendChild(childUl);
                  }
                  childUl.style.display = '';
                } else {
                  if (childUl) childUl.style.display = 'none';
                }
                expanded = !expanded;
              });
            } else {
              li.textContent = file.name;
              li.style.cursor = 'pointer';
              li.addEventListener('click', function (e) {
                e.stopPropagation();
                // Jangan update selectedFilePath atau status bar di sini!
                highlightSelectedFile(li);
                // Jangan panggil updateWindowTitle di sini!
                if (typeof window.onFileClick === 'function') {
                  window.onFileClick(file);
                }
              });
              // Double click untuk langsung load
              li.addEventListener('dblclick', function (e) {
                e.stopPropagation();
                if (!selectedFilePath || selectedFilePath !== file.path) {
                  selectedFilePath = file.path;
                  highlightSelectedFile(li);
                }
                if (isDirty) {
                  showConfirmDialog(
                    () => saveCurrentFile(() => loadFileToEditor(file.path, li)),
                    () => loadFileToEditor(file.path, li),
                    () => { } // cancel
                  );
                  return;
                }
                loadFileToEditor(file.path, li);
              });
            }
            parentUl.appendChild(li);
          });
        }

        // New: Handler for Refresh button
        refreshBtn.addEventListener('click', function () {
          RFC.callRFC("codeEditor.getStructure", ["/"], (ret) => {
            const files = JSON.parse(ret[0]);
            try {
              const ul = document.createElement('ul');
              ul.classList.add('list-group', 'tree-list');
              ul.style.border = 'none';
              renderFileList(files, ul);
              const fileListContainer = existingContainer.querySelector('.file-navigator-list');
              // console.log('Refreshing file list container:', fileListContainer.innerHTML);
              fileListContainer.innerHTML = '';
              fileListContainer.appendChild(ul);
              // Reset selected file jika sudah tidak ada di struktur baru
              if (selectedFilePath) {
                let found = false;
                function searchFile(files) {
                  for (const f of files) {
                    if (f.path === selectedFilePath) return true;
                    if (f.isDirectory && f.children) {
                      if (searchFile(f.children)) return true;
                    }
                  }
                  return false;
                }
                if (!searchFile(files)) {
                  selectedFilePath = null;
                  lastSelectedLi = null;
                  lastLoadedContent = '';
                  isDirty = false;
                  updateWindowTitle();
                  if (window.gcoderEditor) window.gcoderEditor.setValue('');
                }
              }
            } catch (err) {
              console.error('Error refreshing file list:', err);
              showFloatingNotif('Gagal memuat struktur file!', 'danger', 2000);
            }
          });
        });
        // Render file navigator ke fileNavPanel
        RFC.callRFC("codeEditor.getStructure", ["/"], (ret) => {
          const files = JSON.parse(ret[0]);


          const ul = document.createElement('ul');
          ul.classList.add('list-group', 'tree-list');
          ul.style.border = 'none';
          renderFileList(files, ul);
          // --- FIX: hanya hapus fileListContainer, toolbar tetap ---
          fileListContainer.innerHTML = '';
          fileListContainer.appendChild(ul);
        });

        updateWindowTitle(); // Initial call to set title and status bar correctly

        // New: Show input dialog for new file
        function showNewFileDialog(onCreate, onCancel) {
          const dialog = document.createElement('div');
          dialog.className = 'bg-white p-4 rounded shadow border';
          dialog.style.minWidth = '320px';
          dialog.style.maxWidth = '90vw';
          dialog.style.textAlign = 'center';
          dialog.innerHTML = `
            <div class="mb-3">Masukkan nama file baru:</div>
            <input type="text" class="form-control mb-3" id="input-newfilename" placeholder="/home/newfile">
            <div class="d-flex justify-content-center gap-2">
              <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
              <button class="btn btn-success" id="btn-create">Create</button>
            </div>
          `;
          showFloating(dialog);
          const input = dialog.querySelector('#input-newfilename');
          input.focus();
          dialog.querySelector('#btn-cancel').onclick = () => { hideFloating(); if (onCancel) onCancel(); };
          dialog.querySelector('#btn-create').onclick = () => {
            let filename = input.value.trim() || '/home/newfile';
            hideFloating();
            if (onCreate) onCreate(filename);
          };
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') dialog.querySelector('#btn-create').click();
          });
        }
      }
    }
  }
}
