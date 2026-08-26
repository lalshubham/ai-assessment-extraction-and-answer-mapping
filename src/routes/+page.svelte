<script lang="ts">
    import { onMount } from "svelte";
    import * as pdfjsLib from "pdfjs-dist";
    import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

    type Question = { id: string; text: string };
    type Evaluation = {
        question_id: string;
        status: "answered" | "unanswered";
        score?: string;
        feedback?: string;
        page_index?: number;
        bounding_box?: [number, number, number, number];
    };
    type ImageData = { base64: string; mimeType: string; dataUrl: string };

    let questionFile = $state<File | null>(null);
    let answerFile = $state<File | null>(null);

    let isProcessing = $state(false);
    let progressStatus = $state<string | null>(null); // NEW: Track exact status
    let errorMessage = $state<string | null>(null);

    let questions = $state<Question[]>([]);
    let evaluations = $state<Evaluation[]>([]);
    let answerImages = $state<string[]>([]);

    let activeQuestionId = $state<string | null>(null);

    onMount(() => {
        // Production-safe Vite worker loading
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    });

    // Memory optimized & handles BOTH images and PDFs concurrently
    async function fileToImages(file: File): Promise<ImageData[]> {
        if (file.type.startsWith("image/")) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target?.result as string;
                    if (!dataUrl) return reject("Failed to read image");
                    resolve([
                        {
                            base64: dataUrl.split(",")[1],
                            mimeType: file.type,
                            dataUrl,
                        },
                    ]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer })
                .promise;

            // Concurrency to utilize CPU effectively
            // Inside fileToImages(file: File)
            // ...
            const pagePromises = Array.from(
                { length: pdf.numPages },
                async (_, i) => {
                    const page = await pdf.getPage(i + 1);

                    // REDUCED SCALE: 1.2 is the sweet spot for AI OCR speed vs accuracy
                    const viewport = page.getViewport({ scale: 1.2 });

                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const ctx = canvas.getContext("2d");
                    if (!ctx) throw new Error("Canvas rendering failed");

                    const renderParams = {
                        canvasContext: ctx,
                        viewport,
                    } as unknown as Parameters<typeof page.render>[0];
                    await page.render(renderParams).promise;

                    // COMPRESSION: 0.7 quality drastically speeds up network transfer
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    return {
                        base64: dataUrl.split(",")[1],
                        mimeType: "image/jpeg",
                        dataUrl,
                    };
                },
            );

            return await Promise.all(pagePromises);
        }

        throw new Error("Unsupported file type. Please upload a PDF or Image.");
    }

    async function startMapping() {
        if (!questionFile || !answerFile) return;

        isProcessing = true;
        errorMessage = null;

        try {
            // STEP 1: Local Conversion
            progressStatus = "Preparing documents (Client-side)...";
            const qImages = await fileToImages(questionFile);
            const aImages = await fileToImages(answerFile);
            answerImages = aImages.map((img) => img.dataUrl);

            // STEP 2: Question Extraction
            progressStatus = "AI is extracting questions (Step 1 of 2)...";
            const qRes = await fetch("/api/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ images: qImages }),
            });
            if (!qRes.ok) throw new Error("Extraction failed");
            const qData = await qRes.json();
            questions = qData.questions;

            // STEP 3: Answer Mapping & Grading
            progressStatus =
                "AI is evaluating student answers (Step 2 of 2)...";
            const aRes = await fetch("/api/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions, answerImages: aImages }),
            });
            if (!aRes.ok) throw new Error("Evaluation failed");
            const aData = await aRes.json();
            evaluations = aData.evaluations;

            // DONE
            progressStatus = "Complete!";

            // Clear status after 2 seconds
            setTimeout(() => {
                progressStatus = null;
            }, 2000);
        } catch (error: unknown) {
            console.error(error);
            errorMessage =
                error instanceof Error ? error.message : "Processing failed.";
            progressStatus = null;
        } finally {
            isProcessing = false;
        }
    }
</script>

<div class="flex flex-col gap-4 p-4 h-screen font-sans">
    {#if errorMessage}
        <div class="p-4 border bg-[#fee2e2] text-[#991b1b]">{errorMessage}</div>
    {/if}

    <div class="flex items-center gap-4 border p-4">
        <label class="flex flex-col border p-2 cursor-pointer">
            <strong>Upload Question Paper</strong>
            <input
                type="file"
                accept=".pdf,image/*"
                onchange={(e) =>
                    (questionFile =
                        (e.currentTarget as HTMLInputElement).files?.[0] ||
                        null)}
            />
        </label>

        <label class="flex flex-col border p-2 cursor-pointer">
            <strong>Upload Answer Sheet</strong>
            <input
                type="file"
                accept=".pdf,image/*"
                onchange={(e) =>
                    (answerFile =
                        (e.currentTarget as HTMLInputElement).files?.[0] ||
                        null)}
            />
        </label>

        <div class="flex flex-col gap-2 ml-4">
            <button
                disabled={!questionFile || !answerFile || isProcessing}
                onclick={startMapping}
                class="p-2 border bg-black text-white cursor-pointer disabled:opacity-50 min-w-32"
            >
                Start Mapping
            </button>

            <!-- NEW: Progress Status Display -->
            {#if progressStatus}
                <span
                    class="text-sm font-bold {progressStatus === 'Complete!'
                        ? 'text-green-600'
                        : 'text-blue-600'}"
                >
                    {progressStatus}
                </span>
            {/if}
        </div>
    </div>

    {#if questions.length > 0}
        <div class="flex flex-1 gap-4 overflow-hidden">
            <div class="flex flex-col gap-2 w-1/3 overflow-y-auto border p-2">
                {#each questions as q (q.id)}
                    {@const ev = evaluations.find(
                        (e) => e.question_id === q.id,
                    )}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="flex flex-col gap-2 p-2 border cursor-pointer"
                        style="background-color: {activeQuestionId === q.id
                            ? '#f3f4f6'
                            : 'transparent'}; border-color: {activeQuestionId ===
                        q.id
                            ? 'black'
                            : '#e5e7eb'};"
                        onclick={() =>
                            (activeQuestionId =
                                activeQuestionId === q.id ? null : q.id)}
                    >
                        <div class="flex justify-between items-center">
                            <strong>{q.id}</strong>
                            {#if ev}
                                {#if ev.status === "unanswered"}
                                    <span
                                        style="color: red; border: 1px solid red; padding: 2px; font-size: 12px;"
                                        >Not Attempted</span
                                    >
                                {:else}
                                    <span
                                        style="color: green; font-weight: bold;"
                                        >{ev.score}</span
                                    >
                                {/if}
                            {/if}
                        </div>

                        <p>{q.text}</p>

                        {#if activeQuestionId === q.id && ev?.feedback}
                            <div
                                class="p-2 border"
                                style="background-color: #fff7ed; border-color: #fdba74;"
                            >
                                <strong>Feedback:</strong>
                                {ev.feedback}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            <div
                class="flex flex-col gap-4 w-2/3 overflow-y-auto border p-4 bg-[#f9fafb]"
            >
                {#each answerImages as imgUrl, index (index)}
                    <div class="relative border w-full bg-white">
                        <img
                            src={imgUrl}
                            alt="Page {index + 1}"
                            class="w-full block"
                        />

                        {#each evaluations as ev (ev.question_id)}
                            {#if ev.page_index === index && ev.bounding_box && ev.status !== "unanswered"}
                                <div
                                    class="absolute border-2"
                                    style="
										border-color: {activeQuestionId === ev.question_id
                                        ? '#22c55e'
                                        : 'rgba(96, 165, 250, 0.5)'};
										background-color: {activeQuestionId === ev.question_id
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(96, 165, 250, 0.1)'};
										z-index: {activeQuestionId === ev.question_id ? 20 : 10};
										top: {ev.bounding_box[0] / 10}%; 
										left: {ev.bounding_box[1] / 10}%; 
										width: {(ev.bounding_box[3] - ev.bounding_box[1]) / 10}%; 
										height: {(ev.bounding_box[2] - ev.bounding_box[0]) / 10}%;
									"
                                >
                                    {#if activeQuestionId === ev.question_id}
                                        <span
                                            class="absolute"
                                            style="top: -24px; left: -2px; background: #22c55e; color: white; padding: 2px 4px; font-size: 12px; font-weight: bold;"
                                        >
                                            Q{ev.question_id}
                                        </span>
                                    {/if}
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
