document.addEventListener("DOMContentLoaded", function () {
    try {
        gradioApp().getRootNode().appendChild(modal);
        gradioApp().addEventListener("change", (ev) => {
            let parentNode = ev.target.parentNode;
            while (parentNode) {
                if (parentNode.id === "img2maskimg") {
                    addEditorButton(ev);
                    break;
                }
                parentNode = parentNode.parentNode;
            }
        });
    } catch (e) {

    }


});

function initEditorModal() {
    const img = getMaskImg();
    if (!img) return;
    const editor = new MaskEditor(document.body, img);
    editor.show();
}


function getImg2maskImg() {
    return gradioApp().getElementById("img2maskimg");
}

/**
 *
 * @returns {HTMLImageElement|null}
 */
function getMaskImg() {
    const img = getImg2maskImg().querySelector("img");
    if (!img) {
        alert("Upload picture to inpaint tab");
        return null;
    }
    return img;
}

function addEditorButton(ev) {
    const buttonId = "show-editor-btn";
    if (gradioApp().getElementById(buttonId)) return;

    if (ev.target.value) {
        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.top = "4.5rem";
        span.style.right = "0.5rem";

        const btn = document.createElement("button");
        btn.innerHTML = "&#8736;";
        btn.className = "text-gray-500 bg-white/90 h-5 w-5 flex items-center justify-center rounded shadow-sm hover:shadow-xl hover:ring-1 ring-inset ring-gray-200 z-10 dark:bg-gray-900 dark:ring-gray-600";
        btn.addEventListener("click", initEditorModal);
        span.appendChild(btn);

        const img2maskImg = getImg2maskImg();
        img2maskImg.children[img2maskImg.children.length - 1].appendChild(span);
    }
}
