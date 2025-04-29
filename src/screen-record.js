document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("canvas");
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop");

    console.log("DOM ready, attaching events...");

    let mediaRecorder;
    let recordedChunks = [];

    startBtn.onclick = async () => {
        alert("Recording started");
        const stream = canvas.captureStream(30);
        recordedChunks = [];

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp8',
            videoBitsPerSecond: 30_000_000
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm;codecs=vp8' });
            const url = URL.createObjectURL(blob);
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
        mediaRecorder?.stop();
    };
});
