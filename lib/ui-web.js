// Import UIEventManager dan UIElement
// const { UIEventManager, UIElement } = require('./ui-web');

class UIElement {
  constructor(manager, parentContainer, type, options) {
      this.manager = manager; // Referensi ke UIEventManager
      this.parentContainer = parentContainer;
      this.id = options.id;
      this.type = type;
      this.options = options;

      this.initElement();
  }

  initElement() {
      const attributes = this.generateAttributes(this.options);
      const js = `
          var elem = document.createElement('${this.type}');
          elem.innerHTML = '${this.options.title}';
          elem.id = '${this.id}';
          ${attributes}
          ${this.parentContainer}.appendChild(elem);
      `;
      this.runScript(js);
  }

  generateAttributes(options) {
      let attrScript = "";
      for (const [key, value] of Object.entries(options)) {
          if (key !== "id") {
              if (typeof value === "string") {
                  attrScript += `elem.setAttribute('${key}', '${value}');\n`;
              } else if (typeof value === "object") {
                  // Misal untuk style
                  attrScript += `elem.style.${key} = '${value}';\n`;
              }
          }
      }
      return attrScript;
  }

  runScript(script) {
    this.manager.runScript(script);
  }

  on(event, callback) {
      const js = `
          $("#${this.id}").on("${event}", function (e) {
              FC.remoteCall({"name": "eventHandler", "params": {id: $(this).attr("id"), action: "${event}", value: $(this).val()}}, 
                function (data) {
                });
          });
      `;
      this.runScript(js);

      // Daftarkan handler ke UIEventManager
      this.manager.registerElement(this.id, callback);
  }
}

class UIMemo extends UIElement {
    constructor(manager, parentContainer, options) {
        super(manager, parentContainer, 'textarea', options);
    }
}

class UICheckbox extends UIElement {
    constructor(manager, parentContainer, options) {
        super(manager, parentContainer, 'input', { ...options, type: 'checkbox' });
    }

    on(event, callback) {
      const js = `
          $("#${this.id}").on("${event}", function (e) {
              FC.remoteCall({"name": "eventHandler", "params": {id: $(this).attr("id"), action: "${event}", value: $(this).is(":checked")}}, 
                function (data) {
                });
          });
      `;
      this.runScript(js);

      // Daftarkan handler ke UIEventManager
      this.manager.registerElement(this.id, callback);
    }

    // Mengambil status checked
    getChecked(callback) {
        const js = `
            var isChecked = document.getElementById('${this.id}').checked;
            FC.remoteCall({"name": "eventHandler", "params": {id: "${this.id}", action: "getChecked", value: isChecked}}, 
                function (data) {
                    // Kirim kembali nilai isChecked ke NOS
                });
            return isChecked;
        `;
        this.manager.runScript(js);

        // Untuk callback
        if (typeof callback === 'function') {
            this.manager.registerElement(this.id, callback);
        }
    }

    // Mengatur status checked
    setChecked(value) {
        const js = `
            document.getElementById('${this.id}').checked = ${value};
        `;
        this.manager.runScript(js);
    }
}


class UIRadioButton extends UIElement {
    constructor(manager, parentContainer, options) {
        super(manager, parentContainer, 'input', { ...options, type: 'radio' });
        // const js = `
        //   $('#${options.id}').after('${this.options.title}')
        // `;
        // this.runScript(js);
    }

    isSelected() {
        const js = `return document.getElementById('${this.id}').checked;`;
        this.manager.runScript(js);
    }

    on(event, callback) {
      // $('input[name="name_of_your_radiobutton"]:checked').val();
      const js = `
          $("#${this.id}").on("${event}", function (e) {
              let name = $("#${this.id}").attr("name");
              let value = $('input[name="'+name+'"]:checked').val();
              FC.remoteCall({"name": "eventHandler", "params": {id: $(this).attr("id"), action: "${event}", value: value}}, 
                function (data) {
                });
          });
      `;
      this.runScript(js);

      // Daftarkan handler ke UIEventManager
      this.manager.registerElement(this.id, callback);
    }
}

class UILabel extends UIElement {
    constructor(manager, parentContainer, options) {
      super(manager, parentContainer, 'label', options);
      const js = `
        // elem.innerHTML = '${this.options.title}';
        $('#${options.id}').innerHTML('${this.options.title}')
      `;
      this.runScript(js);
    }
}

class UITextInput extends UIElement {
    constructor(manager, parentContainer, options) {
        super(manager, parentContainer, 'input', { ...options, type: 'text' });
    }

    getValue() {
        const js = `return document.getElementById('${this.id}').value;`;
        this.manager.runScript(js);
    }

    setValue(value) {
        const js = `document.getElementById('${this.id}').value = '${value}';`;
        this.manager.runScript(js);
    }
}

class UIDropdown extends UIElement {
    constructor(manager, parentContainer, options) {
        super(manager, parentContainer, 'select', options);
        this.addOptions(options.items || []);
    }

    addOptions(items) {
        items.forEach(item => {
            const js = `
                var option = document.createElement('option');
                option.text = '${item.text}';
                option.value = '${item.value}';
                document.getElementById('${this.id}').add(option);
            `;
            // console.log(js);
            this.manager.runScript(js);
        });
    }

    on(event, callback) {
      const js = `
          $("#${this.id}").on("${event}", function (e) {
              FC.remoteCall({"name": "eventHandler", "params": {id: $(this).attr("id"), action: "${event}", value: $(this).val()}}, 
                function (data) {
                });
          });
      `;
      this.runScript(js);

      // Daftarkan handler ke UIEventManager
      this.manager.registerElement(this.id, callback);
    }

    getSelectedValue() {
        const js = `return document.getElementById('${this.id}').value;`;
        this.manager.runScript(js);
    }
}

class UIChart extends UIElement {
    constructor(manager, parentContainer, options, owner) {
        super(manager, parentContainer, 'canvas', { id: options.id }, owner);
        this.chartType = options.type || 'bar'; // Default chart type
        this.data = options.data || {};
        this.options = options.chartOptions || {};

        this.renderChart();
    }

    renderChart() {
        const js = `
            var ctx = document.getElementById('${this.id}').getContext('2d');
            new Chart(ctx, {
                type: '${this.chartType}',
                data: ${JSON.stringify(this.data)},
                options: ${JSON.stringify(this.options)}
            });
        `;
        this.manager.runScript(js);
    }

    updateData(newData) {
        const js = `
            var chart = Chart.getChart('${this.id}');
            if (chart) {
                chart.data = ${JSON.stringify(newData)};
                chart.update();
            }
        `;
        this.manager.runScript(js);
    }

    destroyChart() {
        const js = `
            var chart = Chart.getChart('${this.id}');
            if (chart) {
                chart.destroy();
            }
        `;
        this.manager.runScript(js);
    }
    // Mengatur posisi elemen
    setPosition(left, top) {
        const js = `
            var elem = document.getElementById('${this.id}');
            elem.style.position = 'absolute';
            elem.style.left = '${left}px';
            elem.style.top = '${top}px';
        `;
        this.manager.runScript(js);
    }

    setSize(width, height) {
        const js = `
            var elem = document.getElementById('${this.id}');
            if (elem) {
                // Atur ukuran canvas
                elem.style.width = '${width}px';
                elem.style.height = '${height}px';
                elem.width = ${width};
                elem.height = ${height};

                // Atur ukuran parent node
                if (elem.parentNode) {
                    elem.parentNode.style.width = '${width}px';
                    elem.parentNode.style.height = '${height}px';
                }

                // Akses chart langsung melalui elem.chart
                if (elem.chart) {
                    elem.chart.resize();
                }
            }
        `;
        this.manager.runScript(js);
    }


    resizeChart() {
    const js = `
        var elem = document.getElementById('${this.id}');
        if (chart) {
            chart.resize();
        }
    `;
    this.manager.runScript(js);
}
}


class UIEventManager {
  constructor(netvision) {
      this.handlers = {}; // Menyimpan handler berdasarkan ID elemen
      this.netvision = netvision;
      this.netvision.listener = (params) => {
        // console.log(JSON.stringify(params));
        this.handleEvent(params);
      };
  }

  runScript (script) {          
    let ret = {"id":0,"protocol":"SCRIPT","ret":(script)};
    this.netvision.ws.write(JSON.stringify(ret));
  }

  clearScreen () {
    this.runScript('document.body.innerHTML="";');
  }

  // Tambahkan handler untuk elemen tertentu
  registerElement(id, handler) {
      this.handlers[id] = handler;
  }

  // Hapus handler untuk elemen tertentu
  unregisterElement(id) {
      delete this.handlers[id];
  }

  // Jalankan event handler yang sesuai berdasarkan ID elemen
  handleEvent(params) {
      if (this.handlers[params.id]) {
          this.handlers[params.id](params);
      } else {
          throw `No handler registered for ID: ${params.id}`;
      }
  }
}

module.exports = { 
  UIEventManager, UIElement, UIMemo, UICheckbox, UIRadioButton,
  UILabel, UITextInput, UIDropdown, UIChart };