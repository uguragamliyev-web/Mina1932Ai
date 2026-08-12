export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { mode, text, imageBase64 } = req.body;
    
    // API Key-ləri təhlükəsiz olaraq backend-də saxlayırıq
    const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || "r8_IBalvYpUN8DjdxImUaPWPfh6JXWvIEb37DipC";

    try {
        // ==========================================
        // A) BANANO MODE (Image-to-Image Editing)
        // ==========================================
        if (mode === 'banano') {
            if (!imageBase64) {
                return res.status(400).json({ error: 'Redaktə üçün şəkil yüklənməyib.' });
            }

            // Replicate Image Editing / Inpainting API Sorğusu
            const response = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Authorization": `Token ${REPLICATE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    version: "39ed52f2a78e932b3bee4924b540177be023d9d921613d9f4c5e191c084131e6",
                    input: {
                        image: imageBase64,
                        prompt: text || "High quality image edit according to instruction",
                        num_outputs: 1
                    }
                })
            });

            const prediction = await response.json();
            if (prediction.error) throw new Error(prediction.error);

            // Polling (Nəticə hazır olana qədər gözləmə)
            let resultUrl = prediction.urls.get;
            let completed = false;
            let outputUrl = "";

            while (!completed) {
                await new Promise(r => setTimeout(r, 2000));
                const checkRes = await fetch(resultUrl, {
                    headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
                });
                const checkData = await checkRes.json();

                if (checkData.status === 'succeeded') {
                    completed = true;
                    outputUrl = checkData.output[0];
                } else if (checkData.status === 'failed') {
                    throw new Error("Replicate image processing failed.");
                }
            }

            return res.status(200).json({ type: 'image', url: outputUrl });
        }

        // ==========================================
        // B) CREATE VIDEO MODE (Super Video AI)
        // ==========================================
        if (mode === 'createvideo') {
            // AnimateDiff / ZeroScope Video Model
            const response = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Authorization": `Token ${REPLICATE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    version: "e49ecf411c523428d05373070f72ba6a8a5620173591b338639600c4b6ef3503",
                    input: {
                        prompt: text || "cinematic masterpiece, smooth 60fps animation, 8k resolution",
                        num_frames: 24,
                        fps: 8
                    }
                })
            });

            const prediction = await response.json();
            if (prediction.error) throw new Error(prediction.error);

            let resultUrl = prediction.urls.get;
            let completed = false;
            let videoUrl = "";

            while (!completed) {
                await new Promise(r => setTimeout(r, 2500));
                const checkRes = await fetch(resultUrl, {
                    headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
                });
                const checkData = await checkRes.json();

                if (checkData.status === 'succeeded') {
                    completed = true;
                    videoUrl = checkData.output;
                } else if (checkData.status === 'failed') {
                    throw new Error("Video generation failed.");
                }
            }

            return res.status(200).json({ type: 'video', url: videoUrl });
        }

        return res.status(400).json({ error: 'İşlək rejim seçilməyib.' });

    } catch (err) {
        console.error("Backend Error:", err);
        return res.status(500).json({ error: err.message });
    }
}