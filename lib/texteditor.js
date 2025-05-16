class SimpleTextEditor {
    constructor(content, stdout) {
        content = content.replaceAll("\t", "  ");
        this.lines = content ? content.split("\n") : [""];
        this.cursorX = 0;
        this.cursorY = 0;
        this.offsetY = 0;
        this.screenHeight = stdout.rows - 0;
        this.stdout = stdout;        
        this.monoPos = 0;
        this.changed = false;

        this.wrapLines();
        this.render();
    }

    keyboardFeeder(str, key) {
        // console.log("ccc "+JSON.stringify(key));
      if (key.ctrl && key.name === "w") {
          this.changed = false;
          this.saveAndExit();
          if (this.onExit) this.onExit();
      } else if ((key.ctrl && key.name === "s") || (key.ctrl && key.name == "\x00" && key.sequence=="\x13")) {
          this.changed = false;
          this.save();
      } else if ((key.ctrl && key.name === "c") || (key.ctrl && key.name == "\x03" && key.sequence=="\x03")) {
          this.Exit();
          if (this.onExit) this.onExit();
      } else {
          this.handleKeyPress(key);
      }
    }

    wrapLines() {
        const screenWidth = this.stdout.columns;
        const wrappedLines = [];

        this.lines.forEach((line) => {
            while (line.length > screenWidth) {
                wrappedLines.push(line.slice(0, screenWidth));
                line = line.slice(screenWidth);
            }
            wrappedLines.push(line);
        });

        this.lines = wrappedLines;
    }

    scrollUpAndAppendLine(newTopLine) {
        this.stdout.write("\x1b[1;" + this.screenHeight + "r");
        this.stdout.write("\x1b[" + this.screenHeight + ";1H\x1b[S");
        this.stdout.write("\x1b[1;1H\x1b[2K" + newTopLine);
    }

    scrollDownAndPrependLine(newBottomLine) {
        this.stdout.write("\x1b[1;" + this.screenHeight + "r");
        this.stdout.write("\x1b[1;1H\x1b[T");
        this.stdout.write(`\x1b[${this.screenHeight};1H\x1b[2K` + newBottomLine);
    }

    handleKeyPress(key) {
        const screenWidth = this.stdout.columns;
        const screenHeight = this.stdout.rows - 1;
        const currentLine = this.lines[this.cursorY + this.offsetY];
        console.log(JSON.stringify(key));
        if (key.sequence == "\x1B[A") key.name = "up";
        else if (key.sequence == "\x1B[B") key.name = "down";
        else if (key.sequence == "\x1B[C") key.name = "right";
        else if (key.sequence == "\x1B[D") key.name = "left";
        else if (key.sequence == "\x1B[H") key.name = "home";
        else if (key.sequence == "\x1B[F") key.name = "end";
        else if (key.sequence == "\r") key.name = "return";
        else if (key.name.charCodeAt(0) == 127) key.name = "backspace";
        
        switch (key.name) {            
            
            case "up":
                if (this.cursorY > 0) {
                    this.cursorY--;
                } else if (this.offsetY > 0) {
                    this.offsetY--;
                    const prevLine = this.lines[this.offsetY] || "";
                    this.scrollDownAndPrependLine(prevLine);
                }
                this.cursorX = Math.min(this.monoPos, this.lines[this.cursorY + this.offsetY].length);
                break;

            case "down":
                if (this.cursorY < screenHeight - 1 && this.cursorY + this.offsetY < this.lines.length - 1) {
                    this.cursorY++;
                } else if (this.offsetY + screenHeight < this.lines.length) {
                    this.offsetY++;
                    const nextLine = this.lines[this.offsetY + screenHeight - 1] || "";
                    this.scrollUpAndAppendLine(nextLine);
                }
                this.cursorX = Math.min(this.monoPos, this.lines[this.cursorY + this.offsetY].length);
                break;

            case "left":
                if (this.cursorX > 0) {
                    this.cursorX--;
                } else if (this.cursorY > 0) {
                    this.cursorY--;
                    this.cursorX = this.lines[this.cursorY + this.offsetY].length;
                }
                this.monoPos = this.cursorX;
                break;

            case "right":
                if (this.cursorX < currentLine.length) {
                    this.cursorX++;
                } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
                    this.cursorY++;
                    this.cursorX = 0;
                }
                this.monoPos = this.cursorX;
                break;

            case "home":
                this.cursorX = 0;
                this.monoPos = this.cursorX;
                break;

            case "end":
                this.cursorX = currentLine.length;
                this.monoPos = this.cursorX;
                break;

            case "return": {
                const currentLine = this.lines[this.cursorY + this.offsetY];
                this.lines.splice(this.cursorY + this.offsetY + 1, 0, currentLine.slice(this.cursorX));
                this.lines[this.cursorY + this.offsetY] = currentLine.slice(0, this.cursorX);
                this.cursorX = 0;
                this.cursorY++;
                this.monoPos = this.cursorX;
                this.wrapLines();
                this.render();
                return;
            }

            case "backspace": {
                if (this.cursorX > 0) {
                    const line = this.lines[this.cursorY + this.offsetY];
                    this.lines[this.cursorY + this.offsetY] = line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
                    this.cursorX--;
                } else if (this.cursorY + this.offsetY > 0) {
                    const prevLine = this.lines[this.cursorY + this.offsetY - 1];
                    this.cursorX = prevLine.length;
                    this.lines[this.cursorY + this.offsetY - 1] += this.lines[this.cursorY + this.offsetY];
                    this.lines.splice(this.cursorY + this.offsetY, 1);
                    if (this.cursorY > 0) {
                        this.cursorY--;
                    } else {
                        this.offsetY--;
                    }
                }
                this.monoPos = this.cursorX;
                this.wrapLines();
                this.render();
                return;
            }

            default:
                if (key.sequence && key.sequence.length === 1) {
                    if (key.sequence.charCodeAt(0)>=32 && key.sequence.charCodeAt(0)<=128)
                        this.changed = true;
                    const line = this.lines[this.cursorY + this.offsetY];                    
                    if (line.length >= screenWidth) {
                        const wrapped = line.slice(0, screenWidth);
                        const remaining = line.slice(screenWidth);
                        this.lines[this.cursorY + this.offsetY] = wrapped;
                        this.lines.splice(this.cursorY + this.offsetY + 1, 0, remaining);
                        this.cursorY++;
                        this.cursorX = 0;
                        this.monoPos = this.cursorX;
                    } else {
                        this.lines[this.cursorY + this.offsetY] = line.slice(0, this.cursorX) + key.sequence + line.slice(this.cursorX);
                        this.cursorX++;
                        this.monoPos = this.cursorX;                        
                    }
                }
                break;
        }

        this.wrapLines();
        this.render();
    }

    render() {
        const visibleLines = this.lines.slice(this.offsetY, this.offsetY + this.screenHeight);
        const screenWidth = this.stdout.columns;

        this.stdout.write(`\u001B[?25l`);
        for (let i = 0; i < this.screenHeight; i++) {
            const line = visibleLines[i] || "";
            this.stdout.write(`\x1b[${i + 1};1H\x1b[2K`);
            this.stdout.write(line);
        }

        this.stdout.write(`\x1b[${this.cursorY + 1};${this.cursorX + 1}H`);
        this.stdout.write(`\u001B[?25h`);
    }

    saveAndExit() {
        this.stdout.write("\x1b[2J\x1b[H");
        this.stdout.write("File saved. Exiting...\n");
    }
    save() {}
    Exit() {
        this.stdout.write("\x1b[2J\x1b[H");
        if (this.changed == true)
            console.log("Exiting without save...");
    }
}

module.exports = {SimpleTextEditor}
/* * * * * * * * * * * * Modif 2 * * * * * * * * * * * * * * * * */

// class SimpleTextEditor {
//     constructor(content, stdout) {
//         content = content.replaceAll("\t", "  ");
//         this.lines = content ? content.split("\n") : [""];
//         this.cursorX = 0;
//         this.cursorY = 0;
//         this.offsetY = 0;
//         this.screenHeight = process.stdout.rows - 0;
//         this.stdout = stdout;        
//         this.monoPos = 0;
//         this.changed = false;

//         this.wrapLines();  // Membungkus semua baris yang lebih panjang dari lebar terminal
//         this.render();
//     }

//     keyboardFeeder(str, key) {
//       if (key.ctrl && key.name === "w") {
//           this.changed = false;
//           this.saveAndExit();
//           if (this.onExit) this.onExit();
//       } else if (key.ctrl && key.name === "s") {
//           this.changed = false;
//           this.save();
//       } else if (key.ctrl && key.name === "c") {
//           this.Exit();
//           if (this.onExit) this.onExit();
//       } else {
//           this.handleKeyPress(key);
//       }
//     }

//     wrapLines() {
//         const screenWidth = process.stdout.columns;
//         const wrappedLines = [];

//         this.lines.forEach((line) => {
//             // Jika baris lebih panjang dari lebar layar, bungkus
//             while (line.length > screenWidth) {
//                 wrappedLines.push(line.slice(0, screenWidth)); // Potong sesuai lebar layar
//                 line = line.slice(screenWidth); // Sisa potongan
//             }
//             wrappedLines.push(line); // Baris yang tersisa atau tidak terpotong
//         });

//         this.lines = wrappedLines;
//     }


//     handleKeyPress(key) {
//         const screenWidth = process.stdout.columns;
//         const screenHeight = process.stdout.rows - 1;
//         const currentLine = this.lines[this.cursorY + this.offsetY];

//         switch (key.name) {
//             case "up":
//                 if (this.cursorY > 0) {
//                     this.cursorY--;
//                 } else if (this.offsetY > 0) {
//                     this.offsetY--;
//                     this.stdout.write("\x1b[M"); // Escape untuk menggulung layar ke atas
//                     const prevLine = this.lines[this.offsetY] || "";
//                     this.stdout.write(`\x1b[1;1H\x1b[2K${prevLine}`);
//                 }
//                 if (this.monoPos > this.lines[this.cursorY + this.offsetY].length) {
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length;
//                 } else {
//                     this.cursorX = this.monoPos;
//                 }
//                 break;

//             case "down":
//                 if (this.cursorY < screenHeight - 1 && this.cursorY + this.offsetY < this.lines.length - 1) {
//                     this.cursorY++;
//                 } else if (this.offsetY + screenHeight < this.lines.length) {
//                     this.offsetY++;
//                     this.stdout.write("\x1b[D"); // Escape untuk menggulung layar ke bawah
//                     const nextLine = this.lines[this.offsetY + screenHeight - 1] || "";
//                     this.stdout.write(`\x1b[${screenHeight};1H\x1b[2K${nextLine}`);
//                 }
//                 if (this.monoPos > this.lines[this.cursorY + this.offsetY].length) {
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length;
//                 } else {
//                     this.cursorX = this.monoPos;
//                 }
//                 break;

//             case "pageup":
//                 if (this.offsetY > 0) {
//                     this.offsetY -= screenHeight;
//                     this.stdout.write("\x1b[T"); // Escape untuk menggulung layar ke atas
//                 } else {
//                     // Jika sudah di atas, pindahkan kursor ke awal file
//                     this.offsetY = 0;
//                     this.cursorY = 0;
//                     this.cursorX = 0;
//                 }
//                 this.render();
//                 break;

//             case "pagedown":
//                 if (this.offsetY + screenHeight < this.lines.length) {
//                     this.offsetY += screenHeight;
//                     this.stdout.write("\x1b[S"); // Escape untuk menggulung layar ke bawah
//                 } else {
//                     // Jika sudah di bawah, pindahkan kursor ke akhir file
//                     this.offsetY = Math.max(0, this.lines.length - screenHeight);
//                     this.cursorY = this.lines.length - this.offsetY - 1;
//                     this.cursorX = 0;
//                 }
//                 this.render();
//                 break;

//             case "right":
//                 if (this.cursorX < currentLine.length) {
//                     this.cursorX++;
//                 } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                     this.cursorY++;
//                     this.cursorX = 0;
//                 }
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             case "left":
//                 if (this.cursorX > 0) {
//                     this.cursorX--;
//                 } else if (this.cursorY > 0) {
//                     this.cursorY--;
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length;
//                 }
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             case "home":
//                 this.cursorX = 0;
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             case "end":
//                 this.cursorX = currentLine.length;
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;
//             // case ("b" && key.meta):
//             //     this.moveCursorByWord(-1);
//             //     this.monoPos = this.cursorX; // Sync monoPos with cursorX
//             //     break;
//             // case ("f" && key.meta):
//             //     this.moveCursorByWord(1);
//             //     this.monoPos = this.cursorX; // Sync monoPos with cursorX
//             //     break;
//             case "right":
//                 if (key.ctrl) {
//                     // Move right by word
//                     // this.moveCursorByWord(1);
//                 } else {
//                     if (this.cursorX < currentLine.length) {
//                         this.cursorX++;
//                     } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                         this.cursorY++;
//                         this.cursorX = 0;
//                     }
//                 }
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             case "left":
//                 if (key.ctrl) {
//                     // Move left by word
//                     // this.moveCursorByWord(-1);
//                 } else {
//                     if (this.cursorX > 0) {
//                         this.cursorX--;
//                     } else if (this.cursorY > 0) {
//                         this.cursorY--;
//                         this.cursorX = this.lines[this.cursorY + this.offsetY].length;
//                     }
//                 }
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             case "return":
//                 if (currentLine.length > screenWidth) {
//                     this.lines.splice(this.cursorY + this.offsetY + 1, 0, currentLine.slice(screenWidth));
//                     this.lines[this.cursorY + this.offsetY] = currentLine.slice(0, screenWidth);
//                     this.cursorX = 0;
//                     this.cursorY++;
//                     this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 } else {
//                     this.lines.splice(this.cursorY + this.offsetY + 1, 0, currentLine.slice(this.cursorX));
//                     this.lines[this.cursorY + this.offsetY] = currentLine.slice(0, this.cursorX);
//                     this.cursorX = 0;
//                     this.cursorY++;
//                     this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 }
//                 break;

//             case "backspace":
//                 if (this.cursorX > 0) {
//                     const line = this.lines[this.cursorY + this.offsetY];
//                     this.lines[this.cursorY + this.offsetY] = line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
//                     this.cursorX--;
//                 } else if (this.cursorY + this.offsetY > 0) {
//                     const prevLine = this.lines[this.cursorY + this.offsetY - 1];
//                     this.cursorX = prevLine.length;
//                     this.lines[this.cursorY + this.offsetY - 1] += this.lines[this.cursorY + this.offsetY];
//                     this.lines.splice(this.cursorY + this.offsetY, 1);
//                     this.cursorY--;
//                 }
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             case "delete":
//                 const lineToModify = this.lines[this.cursorY + this.offsetY];
//                 if (this.cursorX < lineToModify.length) {
//                     this.lines[this.cursorY + this.offsetY] =
//                         lineToModify.slice(0, this.cursorX) + lineToModify.slice(this.cursorX + 1);
//                 } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                     this.lines[this.cursorY + this.offsetY] += this.lines[this.cursorY + this.offsetY + 1];
//                     this.lines.splice(this.cursorY + this.offsetY + 1, 1);
//                 }
//                 this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                 break;

//             default:
//                 if (key.sequence && key.sequence.length === 1) {
//                     if (key.sequence.charCodeAt(0)>=32 && key.sequence.charCodeAt(0)<=128)
//                         this.changed = true;
//                     const line = this.lines[this.cursorY + this.offsetY];                    
//                     if (line.length >= screenWidth) {
//                         const wrapped = line.slice(0, screenWidth);
//                         const remaining = line.slice(screenWidth);
//                         this.lines[this.cursorY + this.offsetY] = wrapped;
//                         this.lines.splice(this.cursorY + this.offsetY + 1, 0, remaining);
//                         this.cursorY++;
//                         this.cursorX = 0;
//                         this.monoPos = this.cursorX; // Sync monoPos with cursorX
//                     } else {
//                         this.lines[this.cursorY + this.offsetY] = line.slice(0, this.cursorX) + key.sequence + line.slice(this.cursorX);
//                         this.cursorX++;
//                         this.monoPos = this.cursorX; // Sync monoPos with cursorX                        
//                     }
//                 }                
//                 break;
//         }

//         this.wrapLines(); // Ensure wrapping happens for all lines
//         this.render();
//     }

//     moveCursorByWord(direction) {
//         const line = this.lines[this.cursorY + this.offsetY];
//         const screenWidth = process.stdout.columns;

//         // Regex untuk memisahkan kata, termasuk tanda baca (pemisah kata)
//         const wordRegex = /[^\s.,;()=]+|[.,;()=]/g;
//         const words = [...line.matchAll(wordRegex)];

//         if (!words || words.length === 0) return; // Tidak ada kata untuk diproses

//         let currentWordIndex = -1;

//         // Tentukan indeks kata yang sedang dilalui kursor
//         let currentPos = 0;
//         for (let i = 0; i < words.length; i++) {
//             const word = words[i];
//             const wordStart = currentPos;
//             const wordEnd = wordStart + word[0].length;

//             if (this.cursorX >= wordStart && this.cursorX < wordEnd) {
//                 currentWordIndex = i;
//                 break;
//             }

//             currentPos = wordEnd;
//         }

//         // Jika kursor berada di luar batas kata-kata yang ada
//         if (currentWordIndex === -1) {
//             currentWordIndex = 0;
//         }

//         // Move the cursor to the next or previous word based on direction
//         if (direction === 1) {
//             // Pindah ke kata berikutnya
//             if (currentWordIndex < words.length - 1) {
//                 const nextWord = words[currentWordIndex + 1];
//                 this.cursorX = line.indexOf(nextWord[0], this.cursorX);
//             }
//         } else if (direction === -1) {
//             // Pindah ke kata sebelumnya
//             if (currentWordIndex > 0) {
//                 const prevWord = words[currentWordIndex - 1];
//                 this.cursorX = line.lastIndexOf(prevWord[0], this.cursorX - 1);
//             }
//         }

//         // Update monoPos sesuai dengan kursor yang bergerak
//         this.monoPos = this.cursorX;
//     }





//     render() {
//         const visibleLines = this.lines.slice(this.offsetY, this.offsetY + this.screenHeight);
//         const screenWidth = process.stdout.columns;

//         this.stdout.write(`\u001B[?25l`);
//         for (let i = 0; i < this.screenHeight; i++) {
//             const lineIndex = i + this.offsetY;
//             let line = visibleLines[i] || "";

//             // Wrapping: Pecah baris panjang menjadi beberapa bagian jika perlu
//             let wrappedLines = [];
//             while (line.length > screenWidth) {
//                 wrappedLines.push(line.slice(0, screenWidth));
//                 line = line.slice(screenWidth);
//             }
//             wrappedLines.push(line);  // Sisakan sisa bagian baris

//             // Tampilkan setiap baris yang terbungkus
//             for (let j = 0; j < wrappedLines.length; j++) {
//                 this.stdout.write(`\x1b[${i + j + 1};1H\x1b[2K`); // Pindahkan kursor ke baris dan bersihkan
//                 this.stdout.write(wrappedLines[j]);
//             }
//         }

//         // Setel kursor ke posisi yang benar
//         this.stdout.write(`\x1b[${this.cursorY + 1};${this.cursorX + 1}H`);
//         this.stdout.write(`\u001B[?25h`);
//     }




//     saveAndExit() {
//         this.stdout.write("\x1b[2J\x1b[H"); // Clear screen
//         this.stdout.write("File saved. Exiting...\n");
//     }
//     save() {
//     }
//     Exit() {
//         this.stdout.write("\x1b[2J\x1b[H"); // Clear screen
//         if (this.changed == true)
//             console.log("Exiting without save...");
//     }
// }

// module.exports = {SimpleTextEditor}


/* * * * * * * * * * * * Modif 1 * * * * * * * * * * * * * * * * */


// class SimpleTextEditor {
//     constructor(content, stdout) {
//         this.lines = content ? content.split("\n") : [""];
//         this.cursorX = 0;
//         this.cursorY = 0;
//         this.offsetY = 0;
//         this.screenHeight = process.stdout.rows - 1;
//         this.screenWidth = process.stdout.columns;
//         this.stdout = stdout;        
//         this.monoPos = 0;

//         this.render();
//     }

//     keyboardFeeder(str, key) {
//         if (key.ctrl && key.name === "w") {
//             this.saveAndExit();
//             if (this.onExit) this.onExit();
//         } else if (key.ctrl && key.name === "c") {
//             this.Exit();
//             if (this.onExit) this.onExit();
//         } else {
//             this.handleKeyPress(key);
//         }
//     }

//     handleKeyPress(key) {
//         switch (key.name) {
//             case "up":
//                 if (this.cursorY > 0) {
//                     this.cursorY--;
//                 } else if (this.offsetY > 0) {
//                     this.offsetY--;
//                     this.stdout.write("\x1b[T");
//                     const prevLine = this.lines[this.offsetY] || "";
//                     this.stdout.write(`\x1b[1;1H\x1b[2K${prevLine}`);
//                 }
//                 this.cursorX = Math.min(this.monoPos, this.lines[this.cursorY + this.offsetY].length);
//                 break;
//             case "down":
//                 if (this.cursorY < this.screenHeight - 1 && this.cursorY + this.offsetY < this.lines.length - 1) {
//                     this.cursorY++;
//                 } else if (this.offsetY + this.screenHeight < this.lines.length) {
//                     this.offsetY++;
//                     this.stdout.write("\x1b[S");
//                     const nextLine = this.lines[this.offsetY + this.screenHeight - 1] || "";
//                     this.stdout.write(`\x1b[${this.screenHeight};1H\x1b[2K${nextLine}`);
//                 }
//                 this.cursorX = Math.min(this.monoPos, this.lines[this.cursorY + this.offsetY].length);
//                 break;
//             case "left":
//                 if (this.cursorX > 0) {
//                     this.cursorX--;
//                 } else if (this.cursorY + this.offsetY > 0) {
//                     if (this.cursorY > 0) {
//                         this.cursorY--;
//                     } else {
//                         this.offsetY--;
//                         this.stdout.write("\x1b[T");
//                         const prevLine = this.lines[this.offsetY] || "";
//                         this.stdout.write(`\x1b[1;1H\x1b[2K${prevLine}`);
//                     }
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length;
//                 }
//                 this.monoPos = this.cursorX;
//                 break;
//             case "right":
//                 if (this.cursorX < this.lines[this.cursorY + this.offsetY].length) {
//                     this.cursorX++;
//                 } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                     if (this.cursorY < this.screenHeight - 1) {
//                         this.cursorY++;
//                     } else {
//                         this.offsetY++;
//                         this.stdout.write("\x1b[S");
//                         const nextLine = this.lines[this.offsetY + this.screenHeight - 1] || "";
//                         this.stdout.write(`\x1b[${this.screenHeight};1H\x1b[2K${nextLine}`);
//                     }
//                     this.cursorX = 0;
//                 }
//                 this.monoPos = this.cursorX;
//                 break;
//             default:
//                 this.defaultKeyHandler(key);
//         }

//         this.updateCursor();
//     }

//     defaultKeyHandler(key) {
//         if (key.name === "return") {
//             const currentLine = this.lines[this.cursorY + this.offsetY];
//             this.lines.splice(
//                 this.cursorY + this.offsetY + 1,
//                 0,
//                 currentLine.slice(this.cursorX)
//             );
//             this.lines[this.cursorY + this.offsetY] = currentLine.slice(0, this.cursorX);
//             this.cursorX = 0;

//             if (this.cursorY < this.screenHeight - 1) {
//                 this.cursorY++;
//             } else {
//                 this.offsetY++;
//             }

//             this.monoPos = this.cursorX;
//             this.render();
//         } else if (key.name === "backspace") {
//             if (this.cursorX > 0) {
//                 const line = this.lines[this.cursorY + this.offsetY];
//                 this.lines[this.cursorY + this.offsetY] =
//                     line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
//                 this.cursorX--;
//             } else if (this.cursorY + this.offsetY > 0) {
//                 const prevLineIndex = this.cursorY + this.offsetY - 1;
//                 const currentLine = this.lines.splice(this.cursorY + this.offsetY, 1)[0];
//                 this.cursorY--;
//                 this.offsetY = Math.max(this.offsetY - 1, 0);
//                 this.cursorX = this.lines[prevLineIndex].length;
//                 this.lines[prevLineIndex] += currentLine;
//             }
//             this.render();
//         } else if (key.name === "delete") {
//             const currentLine = this.lines[this.cursorY + this.offsetY];
//             if (this.cursorX < currentLine.length) {
//                 this.lines[this.cursorY + this.offsetY] =
//                     currentLine.slice(0, this.cursorX) + currentLine.slice(this.cursorX + 1);
//             } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                 const nextLine = this.lines.splice(this.cursorY + this.offsetY + 1, 1)[0];
//                 this.lines[this.cursorY + this.offsetY] += nextLine;
//             }
//             this.render();
//         } else if (key.sequence && key.sequence.length === 1) {
//             const line = this.lines[this.cursorY + this.offsetY];
//             this.lines[this.cursorY + this.offsetY] =
//                 line.slice(0, this.cursorX) + key.sequence + line.slice(this.cursorX);
//             this.cursorX++;
//             this.monoPos = this.cursorX;
//             // Update the modified line only
//             this.stdout.write(`\x1b[${this.cursorY + 1};1H\x1b[2K${this.lines[this.cursorY + this.offsetY]}`);
//         }
//     }

//     updateCursor() {
//         const wrapLines = (line) => {
//             const wrapped = [];
//             for (let i = 0; i < line.length; i += this.screenWidth) {
//                 wrapped.push(line.slice(i, i + this.screenWidth));
//             }
//             return wrapped;
//         };

//         const allWrappedLines = this.lines.slice(0, this.cursorY + this.offsetY).flatMap(wrapLines);
//         const visibleCursorY = allWrappedLines.length;
//         this.stdout.write(`\x1b[${visibleCursorY};${this.cursorX + 1}H`);
//     }

//     render() {
//         const wrapLines = (line) => {
//             const wrapped = [];
//             for (let i = 0; i < line.length; i += this.screenWidth) {
//                 wrapped.push(line.slice(i, i + this.screenWidth));
//             }
//             return wrapped;
//         };

//         const allWrappedLines = this.lines.flatMap(wrapLines);
//         const visibleLines = allWrappedLines.slice(this.offsetY, this.offsetY + this.screenHeight);

//         for (let i = 0; i < this.screenHeight; i++) {
//             const line = visibleLines[i] || "";

//             // Move to the start of the specific line
//             this.stdout.write(`\x1b[${i + 1};1H\x1b[2K`); // Move cursor and clear the line
//             this.stdout.write(line);
//         }

//         // Adjust cursor position within wrapped lines
//         const cursorWrappedY = this.lines.slice(0, this.cursorY + this.offsetY).flatMap(wrapLines).length;
//         this.stdout.write(`\x1b[${cursorWrappedY};${this.cursorX + 1}H`);
//     }

//     saveAndExit() {
//         this.stdout.write("\x1b[2J\x1b[H"); // Clear screen
//         this.stdout.write("File saved. Exiting...\n");
//     }

//     Exit() {
//         this.stdout.write("\x1b[2J\x1b[H"); // Clear screen
//         console.log("Exiting without save...");
//     }
// }

// module.exports = { SimpleTextEditor };


/* * * * * * * * * * * * Original * * * * * * * * * * * * * * * * */


// class SimpleTextEditor {
//     constructor(content, stdout) {
//         this.lines = content ? content.split("\n") : [""];
//         this.cursorX = 0;
//         this.cursorY = 0;
//         this.offsetY = 0;
//         this.screenHeight = process.stdout.rows - 1;
//         this.stdout = stdout;        
//         this.monoPos = 0;
//         // this.previousOffsetY = 0;

//         this.render();
//     }
//     keyboardFeeder(str, key) {
//       if (key.ctrl && key.name === "w") {
//           this.saveAndExit();
//           if (this.onExit) this.onExit();
//       } else if (key.ctrl && key.name === "c") {
//           this.Exit();
//           if (this.onExit) this.onExit();
//       } else {
//           this.handleKeyPress(key);
//       }
//     }

//     handleKeyPress(key) {
//         switch (key.name) {
//             case "up":
//                 if (this.cursorY > 0) {
//                     this.cursorY--;
//                 } else if (this.offsetY > 0) {
//                     this.offsetY--;
//                     this.stdout.write("\x1b[T");
//                     const prevLine = this.lines[this.offsetY] || "";
//                     this.stdout.write(`\x1b[1;1H\x1b[2K${prevLine}`);
//                 }
                
//                 if (this.monoPos>this.lines[this.cursorY + this.offsetY].length)
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length; else
//                     this.cursorX = this.monoPos;
//                 break;
//             case "down":
//                 if (this.cursorY < this.screenHeight - 1 && this.cursorY + this.offsetY < this.lines.length - 1) {
//                     this.cursorY++;
//                 } else if (this.offsetY + this.screenHeight < this.lines.length) {
//                     this.offsetY++;
//                     this.stdout.write("\x1b[S");
//                     const nextLine = this.lines[this.offsetY + this.screenHeight - 1] || "";
//                     this.stdout.write(`\x1b[${this.screenHeight};1H\x1b[2K${nextLine}`);
//                 }
//                 if (this.monoPos>this.lines[this.cursorY + this.offsetY].length)
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length; else
//                     this.cursorX = this.monoPos;
//                 break;
//             case "left":
//                 if (this.cursorX > 0) {
//                     this.cursorX--;
//                 } else if (this.cursorY + this.offsetY > 0) {
//                     this.cursorY--;
//                     this.cursorX = this.lines[this.cursorY + this.offsetY].length;
//                 }
//                 this.monoPos = this.cursorX;
//                 break;
//             case "right":
//                 if (this.cursorX < this.lines[this.cursorY + this.offsetY].length) {
//                     this.cursorX++;
//                 } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                     this.cursorY++;
//                     this.cursorX = 0;
//                 }
//                 this.monoPos = this.cursorX;
//                 break;
//             case "return":
//                 const currentLine = this.lines[this.cursorY + this.offsetY];
//                 this.lines.splice(
//                     this.cursorY + this.offsetY + 1,
//                     0,
//                     currentLine.slice(this.cursorX)
//                 );
//                 this.lines[this.cursorY + this.offsetY] = currentLine.slice(0, this.cursorX);
//                 this.cursorX = 0;
//                 this.cursorY++;
//                 this.monoPos = this.cursorX;
//                 break;
//             case "backspace":
//                 if (this.cursorX > 0) {
//                     const line = this.lines[this.cursorY + this.offsetY];
//                     this.lines[this.cursorY + this.offsetY] =
//                         line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
//                     this.cursorX--;
//                 } else if (this.cursorY + this.offsetY > 0) {
//                     const prevLine = this.lines[this.cursorY + this.offsetY - 1];
//                     this.cursorX = prevLine.length;
//                     this.lines[this.cursorY + this.offsetY - 1] += this.lines[this.cursorY + this.offsetY];
//                     this.lines.splice(this.cursorY + this.offsetY, 1);
//                     if (this.cursorY > 0) {
//                         this.cursorY--;
//                     } else {
//                         this.offsetY--;
//                     }
//                 }
//                 this.monoPos = this.cursorX;
//                 break;
//             case "delete":
//                 const lineToModify = this.lines[this.cursorY + this.offsetY];
//                 if (this.cursorX < lineToModify.length) {
//                     // Hapus karakter di bawah kursor
//                     this.lines[this.cursorY + this.offsetY] =
//                         lineToModify.slice(0, this.cursorX) + lineToModify.slice(this.cursorX + 1);
//                 } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
//                     // Gabungkan baris berikutnya ke baris ini
//                     this.lines[this.cursorY + this.offsetY] += this.lines[this.cursorY + this.offsetY + 1];
//                     this.lines.splice(this.cursorY + this.offsetY + 1, 1);
//                 }
//                 this.monoPos = this.cursorX;
//                 break;
//             default:
//                 if (key.sequence && key.sequence.length === 1) {
//                     const line = this.lines[this.cursorY + this.offsetY];
//                     this.lines[this.cursorY + this.offsetY] =
//                         line.slice(0, this.cursorX) + key.sequence + line.slice(this.cursorX);
//                     this.cursorX++;
//                     this.monoPos = this.cursorX;
//                 }
//                 break;
//         }

//         this.render();

//     }

//     render() {
//         const visibleLines = this.lines.slice(this.offsetY, this.offsetY + this.screenHeight);

//         for (let i = 0; i < this.screenHeight; i++) {
//             const lineIndex = i + this.offsetY;
//             const line = visibleLines[i] || "";

//             // Move to the start of the specific line
//             this.stdout.write(`\x1b[${i + 1};1H\x1b[2K`); // Move cursor and clear the line
//             this.stdout.write(line);
//         }

//         // Set cursor to its correct position
//         this.stdout.write(`\x1b[${this.cursorY + 1};${this.cursorX + 1}H`);
//     }

//     saveAndExit() {
//         // fs.writeFileSync(this.filePath, this.lines.join("\n"));
//         this.stdout.write("\x1b[2J\x1b[H"); // Clear screen
//         this.stdout.write("File saved. Exiting...\n");
//         // return this.lines.join("\n");
//     }
//     Exit() {
//         this.stdout.write("\x1b[2J\x1b[H"); // Clear screen
//         console.log("Exiting without save...");
//         // return;
//     }
// }

// module.exports = {SimpleTextEditor}