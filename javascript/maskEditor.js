class MaskEditor {
    constructor(parent, img) {
        this.parent = parent;
        this.modalId = "advanced-mask-editor-modal";
        this.img = img;

        this.modal = document.createElement('div');
        this.modal.tabIndex = 0;
        this.modal.id = this.modalId;
        this.modal.style.display = "none";

        this.width = img.width;
        this.height = img.height;

        this.perimeter = [];
        this.drawCanvas = document.createElement('canvas');
        this.maskCanvas = document.createElement("canvas");
        this.transparentMaskCanvas = document.createElement("canvas");
        this.canvases = [this.drawCanvas, this.maskCanvas, this.transparentMaskCanvas];
        this.savedPolygons = [];
        this.color = "black";
    }

    render() {
        const self = this;

        const modalFragment = document.createDocumentFragment();

        const closeBtn = document.createElement("a");
        closeBtn.href = "#";
        closeBtn.title = "Close editor modal";
        closeBtn.onclick = function (ev) {
            self.close(ev);
        };
        closeBtn.className = 'mask-editor-control';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "5px";
        closeBtn.style.fontWeight = "bold";
        closeBtn.style.fontSize = "32px";


        this.modal.appendChild(closeBtn);

        const controlBar = document.createElement("div");
        controlBar.style.display = "flex";

        const canvasClear = document.createElement('a');
        canvasClear.href = "#";
        canvasClear.className = 'mask-editor-control btn';
        canvasClear.innerHTML = '&times;';
        canvasClear.title = "Clear canvases";
        canvasClear.style.fontWeight = "bold";

        canvasClear.onclick = function (ev) {
            self.clearCanvases(ev);
        };
        controlBar.appendChild(canvasClear);

        const unDo = document.createElement("a");
        unDo.href = "#";
        unDo.className = 'mask-editor-control btn';
        unDo.innerHTML = "&#8634;";
        unDo.title = "Undo";
        unDo.onclick = function (ev) {
            self.unDo(ev);
        };
        controlBar.appendChild(unDo);

        const colorPicker = document.createElement("a");
        colorPicker.href = "#";
        colorPicker.className = "mask-editor-control btn";
        colorPicker.innerHTML = "&#127912;";
        controlBar.appendChild(colorPicker);
        const picker = new Huebee(colorPicker);

        picker.on("change", (color) => {
            self.color = color;
        });

        const toInpaint = document.createElement("a");
        toInpaint.href = "#";
        toInpaint.className = "mask-editor-control btn";
        toInpaint.innerHTML = "&#10003;";
        toInpaint.title = "Send to inpaint";
        toInpaint.onclick = function (ev) {
            self.sendToInpaint(ev);
        };
        controlBar.appendChild(toInpaint);

        this.modal.appendChild(controlBar);


        const container = document.createElement("div"),
            innerContainer = document.createElement("div");

        container.style.position = "absolute";
        container.style.width = "100%";

        innerContainer.style.width = `${this.width}px`;
        innerContainer.style.height = `${this.height}px`;
        innerContainer.style.margin = "auto";

        container.appendChild(innerContainer);
        this.modal.appendChild(container);

        this.drawCanvas.height = this.img.naturalHeight;
        this.drawCanvas.width = this.img.naturalWidth;
        this.drawCanvas.style.margin = "auto";
        this.drawCanvas.style.position = "fixed";

        this.drawCanvas.setAttribute("data-imgsrc", this.img.src);

        this.maskCanvas.height = this.img.naturalHeight;
        this.maskCanvas.width = this.img.naturalWidth;
        this.maskCanvas.style.margin = "auto";
        this.maskCanvas.style.position = "fixed";
        this.maskCanvas.style.visibility = "hidden";

        const maskCtx = this.maskCanvas.getContext("2d");
        maskCtx.beginPath();
        maskCtx.rect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        maskCtx.fillStyle = "black";
        maskCtx.fill();

        this.transparentMaskCanvas.height = this.img.naturalHeight;
        this.transparentMaskCanvas.width = this.img.naturalWidth;
        this.transparentMaskCanvas.style.margin = "auto";
        this.transparentMaskCanvas.style.position = "fixed";
        this.transparentMaskCanvas.style.visibility = "hidden";

        const transparentMaskCtx = this.maskCanvas.getContext("2d");
        transparentMaskCtx.beginPath();

        innerContainer.appendChild(this.drawCanvas);
        innerContainer.appendChild(this.maskCanvas);
        innerContainer.appendChild(this.transparentMaskCanvas);

        this.drawCanvas.addEventListener("mousedown", (ev) => {
            this.clickHandler(ev, this.perimeter);
        });

        this.startDraw();

        modalFragment.appendChild(this.modal);
        this.parent.appendChild(modalFragment);
        this.show();
    }

    close(ev) {
        ev.preventDefault();
        this.modal.remove();
    }

    show() {
        this.modal.style.display = "block";
    }

    startDraw() {
        const img = new Image();
        img.src = this.drawCanvas.getAttribute('data-imgsrc');
        const self = this;
        img.onload = function (ev) {
            self.onLoadHandler(ev);
        }
    }

    onLoadHandler(ev) {
        const drawCtx = this.drawCanvas.getContext("2d");
        drawCtx.drawImage(ev.target, 0, 0, this.drawCanvas.width, this.drawCanvas.height);

        this.draw(false);
    }

    clickHandler(event, color) {
        let rect, x, y;

        // right click
        if (event.ctrlKey || event.which === 3 || event.button === 2) {
            event.preventDefault();
            if (this.perimeter.length === 2) {
                alert('You need at least three points for a polygon');
                return;
            }
            if (!confirm("Close polygon ?")) return;
            this.draw(true, color);

        } else {
            rect = event.currentTarget.getBoundingClientRect();
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
            if (this.perimeter.length > 0 && x === this.perimeter[this.perimeter.length - 1]['x'] && y === this.perimeter[this.perimeter.length - 1]['y']) {
                // same point - double click
                return;
            }
            if (this.checkIntersect(x, y)) {
                if (event.currentTarget.style.visibility !== "hidden") {
                    if (!confirm("Close polygon ?")) return;
                }
                this.perimeter.push({'x': this.perimeter[0]["x"], 'y': this.perimeter[0]["y"]});
                this.draw(true);
                return;
            }
            this.perimeter.push({'x': x, 'y': y});
            this.draw(false);
        }
    }

    draw(end, color) {
        for (const canvas of this.canvases) {
            color = canvas.style.visibility === "hidden" ? "white" : this.color;
            const ctx = canvas.getContext("2d");
            ctx.lineWidth = 1;
            ctx.strokeStyle = color;
            ctx.lineCap = "square";
            ctx.beginPath();
            for (let i = 0; i < this.perimeter.length; i++) {
                if (i === 0) {
                    ctx.moveTo(this.perimeter[i]['x'], this.perimeter[i]['y']);
                    end || this.point(this.perimeter[i]['x'], this.perimeter[i]['y'], ctx, color);
                } else {
                    ctx.lineTo(this.perimeter[i]['x'], this.perimeter[i]['y']);
                    end || this.point(this.perimeter[i]['x'], this.perimeter[i]['y'], ctx, color);
                }
            }
            if (end) {
                this.closePolygon(ctx, color);
            }
            ctx.stroke();
        }
        if (end) {
            this.savedPolygons.push([...this.perimeter]);
            this.perimeter.splice(0, this.perimeter.length);
        }
    }

    point(x, y, ctx, color) {
        if (!color) {
            color = "black";
        }
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.fillRect(x, y, 1, 1);
        ctx.moveTo(x, y);
    }

    lineIntersects(p0, p1, p2, p3) {
        let s1_x, s1_y, s2_x, s2_y;
        s1_x = p1['x'] - p0['x'];
        s1_y = p1['y'] - p0['y'];
        s2_x = p3['x'] - p2['x'];
        s2_y = p3['y'] - p2['y'];

        let s, t;
        s = (-s1_y * (p0['x'] - p2['x']) + s1_x * (p0['y'] - p2['y'])) / (-s2_x * s1_y + s1_x * s2_y);
        t = (s2_x * (p0['y'] - p2['y']) - s2_y * (p0['x'] - p2['x'])) / (-s2_x * s1_y + s1_x * s2_y);

        return s >= 0 && s <= 1 && t >= 0 && t <= 1;
        // No collision
    }

    checkIntersect(x, y) {
        if (this.perimeter.length < 4) {
            return false;
        }
        const p0 = [],
            p1 = [],
            p2 = [],
            p3 = [];

        p2['x'] = this.perimeter[this.perimeter.length - 1]['x'];
        p2['y'] = this.perimeter[this.perimeter.length - 1]['y'];
        p3['x'] = x;
        p3['y'] = y;

        for (let i = 0; i < this.perimeter.length - 1; i++) {
            p0['x'] = this.perimeter[i]['x'];
            p0['y'] = this.perimeter[i]['y'];
            p1['x'] = this.perimeter[i + 1]['x'];
            p1['y'] = this.perimeter[i + 1]['y'];
            if (p1['x'] === p2['x'] && p1['y'] === p2['y']) {
                continue;
            }
            if (p0['x'] === p3['x'] && p0['y'] === p3['y']) {
                continue;
            }
            if (this.lineIntersects(p0, p1, p2, p3) === true) {
                return true;
            }
        }
        return false;
    }

    closePolygon(ctx, color) {
        if (!color) {
            color = "black";
        }
        ctx.lineTo(this.perimeter[0]['x'], this.perimeter[0]['y']);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.closePath();
    }


    unDo(ev) {
        ev.preventDefault();

        this.clearCanvases();
        // todo : handle multiple polygons
        // if (this.savedPolygons.length){
        //     const perimeter = [...this.perimeter];
        //     for(const polygon of this.savedPolygons){
        //         this.perimeter = [...polygon];
        //         this.draw(false);
        //         for (const canvas of this.canvases){
        //             this.closePolygon(canvas.getContext("2d"))
        //         }
        //     }
        //     if(perimeter.length){
        //         this.perimeter = perimeter;
        //     }else{
        //         this.draw(true);
        //     }
        // }

        this.perimeter.pop();
        this.draw(false);
    }

    clearCanvases(ev) {
        if (ev) {
            ev.preventDefault();
            this.perimeter.splice(0, this.perimeter.length);
        }

        const drawCtx = this.drawCanvas.getContext("2d");
        drawCtx.drawImage(this.img, 0, 0, this.drawCanvas.width, this.drawCanvas.height);

        const maskCtx = this.maskCanvas.getContext("2d");
        maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        maskCtx.rect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        maskCtx.fillStyle = "black";
        maskCtx.fill();

        const transparentCtx = this.transparentMaskCanvas.getContext("2d");
        transparentCtx.clearRect(0, 0, this.transparentMaskCanvas.width, this.transparentMaskCanvas.height);
    }

    sendToInpaint(ev) {
        ev.preventDefault();

        const img2maskImg = getImg2maskImg();

        const ctxTemp = img2maskImg.querySelector("[key=temp]").getContext("2d"),
            ctxDrawing = img2maskImg.querySelector("[key=drawing]").getContext("2d"),
            ctxMask = img2maskImg.querySelector("[key=mask]").getContext("2d"),
            ctxTempFake = img2maskImg.querySelector("[key=temp_fake]").getContext("2d");

        ctxTemp.drawImage(this.drawCanvas, 0, 0);
        ctxDrawing.drawImage(this.drawCanvas, 0, 0);
        ctxMask.drawImage(this.maskCanvas, 0, 0);
        ctxTempFake.drawImage(this.transparentMaskCanvas, 0, 0);

        const interfaceCanvas = img2maskImg.querySelector("canvas");

        interfaceCanvas.dispatchEvent(new MouseEvent("mousedown"));
        interfaceCanvas.dispatchEvent(new MouseEvent("mouseup"));
    }

}


/*
   jPolygon - a ligthweigth javascript library to draw polygons over HTML5 canvas images.
   Project URL: http://www.matteomattei.com/projects/jpolygon
   Author: Matteo Mattei <matteo.mattei@gmail.com>
   Version: 1.0
   License: MIT License
*/

