
let _measureText = CanvasRenderingContext2D.prototype.measureText;
CanvasRenderingContext2D.prototype.measureText = function (text) {
    if (!text) {
        return 0;
    }
    let metric = _measureText(text);
    if (metric) {
        return metric.width;
    }
    if (this.font && this.font.match) {
        let match = this.font.match(/\d+/);
        let fontSize = match ? match[0] : 20;
        return text.length * fontSize;
    } else {
        return 20 * text.length;
    }
};