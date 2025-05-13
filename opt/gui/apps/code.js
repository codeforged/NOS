module.exports = {
  application: () => {
    let appName = "code";
    let appTitle = "Code Editor";

    return {
      header: {
        appName,
        appTitle,
        iconSmall: "icon_16_editor.png",
        iconMedium: "icon_22_editor.png",
        iconLarge: "icon_32_editor.png",
        width: 900,
        height: 500,
        resizable: true
      },
      content: `        
        <div id="main-content-${appName}" style="padding:6px">
          <div class="flex flex-col gap-2 h-full" style="width: 100%;height:100%;">
            <div class="flex gap-2 items-center" style="padding-bottom:6px">
              <input id="filename-${appName}" value="/home/nto-service.js" class="border px-2 py-1 rounded w-60" placeholder="File path">
              <button id="loadBtn-${appName}" class="border px-2 py-1 rounded">Load</button>
              <button id="saveBtn-${appName}" class="border px-2 py-1 rounded">Save</button>
            </div>
            <textarea id="editorArea-${appName}" class="flex-1" style="width: 100%;height:100%;"></textarea>
          </div>
        </div>
      `,
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
      },
      jsContent: (app) => {
        codeeditor = {};
        // alert(`editorArea-${app.header.appName}`);
        // document.addEventListener("DOMContentLoaded", () => {
        codeeditor.editor = CodeMirror.fromTextArea(
          document.getElementById(`editorArea-${app.header.appName}`),
          {
            mode: "javascript",
            lineNumbers: true,
            theme: "monokai", // bisa diganti ke "darcula", "monokai", dll kalau tersedia
            tabSize: 2,
            indentWithTabs: false,
          }
        );
        codeeditor.editor.setSize("100%", "100%");
        // });

        document.getElementById(`loadBtn-${app.header.appName}`).onclick =
          async () => {
            const path = document
              .getElementById(`filename-${app.header.appName}`)
              .value.trim();
            if (!path) return alert("Masukkan path file.");
            try {
              RFC.callRFC("codeEditor.load", [path], (ret) => {
                codeeditor.editor.setValue(ret[0]);
              });
            } catch (e) {
              alert("Gagal membuka file: " + e.message);
            }
          };

        document.getElementById(`saveBtn-${app.header.appName}`).onclick =
          async () => {
            try {
              const path = document
                .getElementById(`filename-${app.header.appName}`)
                .value.trim();
              if (!path) return alert("Masukkan path untuk menyimpan.");
              const content = codeeditor.editor.getValue();
              RFC.callRFC("codeEditor.save", [path, content], (ret) => { });
              alert("File disimpan ke " + path);
            } catch (e) {
              RFC.callRFC("desktop.jsContentError", [e, e.stack], (ret) => { });
            }
          };
      },
    };
  },
};
