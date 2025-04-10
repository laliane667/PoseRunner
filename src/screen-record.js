const canvas = document.querySelector("canvas");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

let mediaRecorder;
let recordedChunks = [];

startBtn.onclick = async () => {
    const stream = canvas.captureStream(30); 
    recordedChunks = [];

    mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8', 
        videoBitsPerSecond: 20_000_000 
    });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm;codecs=vp8' });
        const url = URL.createObjectURL(blob);

        // Téléchargement automatique
        const a = document.createElement("a");
        a.href = url;
        a.download = "capture_canvas.webm";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    mediaRecorder.start();
};

stopBtn.onclick = () => {
    mediaRecorder.stop();
};