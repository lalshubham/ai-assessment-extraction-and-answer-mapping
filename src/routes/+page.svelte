<script lang="ts">
    import { type ImageData, processFileToImages } from "$lib/utils/file";

    type Question = {
        id: string;
        text: string;
        marks?: number;
        options?: string[];
    };
    type Evaluation = {
        question_id: string;
        status: "answered" | "unanswered";
        score_awarded?: number;
        score_string?: string;
        feedback?: string;
        page_index?: number;
        bounding_box?: [number, number, number, number];
    };
    type MetaData = { grade_level?: string; subject?: string };

    let currentScreen = $state<1 | 2 | 3>(1);
    let progressStatus = $state<string | null>(null);
    let errorMessage = $state<string | null>(null);

    let questionFile = $state<File | null>(null);
    let answerFile = $state<File | null>(null);

    let cachedQImages = $state<ImageData[]>([]);
    let cachedAImages = $state<ImageData[]>([]);
    let answerImages = $state<string[]>([]);

    let examMeta = $state<MetaData | null>(null);
    let questions = $state<Question[]>([]);
    let evaluations = $state<Evaluation[]>([]);
    let activeQuestionId = $state<string | null>(null);

    let totalMaxMarks = $derived(
        questions.reduce((sum, q) => sum + (q.marks || 0), 0),
    );
    let totalScore = $derived(
        evaluations.reduce((sum, ev) => sum + (ev.score_awarded || 0), 0),
    );

    function handleFileUpload(e: Event, type: "question" | "answer") {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        if (
            file.type !== "application/pdf" &&
            !file.type.startsWith("image/")
        ) {
            alert(
                "Invalid file type uploaded. Please upload only PDF or Image (JPG/PNG) files.",
            );
            input.value = "";
            if (type === "question") questionFile = null;
            if (type === "answer") answerFile = null;
            return;
        }

        if (type === "question") questionFile = file;
        if (type === "answer") answerFile = file;
    }

    async function runPipeline(mode: "full" | "re-extract" | "re-evaluate") {
        currentScreen = 2;
        errorMessage = null;

        evaluations = [];
        activeQuestionId = null;
        if (mode !== "re-evaluate") {
            questions = [];
            examMeta = null;
        }

        try {
            if (mode === "full" || cachedAImages.length === 0) {
                progressStatus =
                    "Converting documents into secure image streams...";
                const [qImages, aImages] = await Promise.all([
                    processFileToImages(questionFile!),
                    processFileToImages(answerFile!),
                ]);
                cachedQImages = qImages;
                cachedAImages = aImages;
                answerImages = aImages.map((img) => img.dataUrl);
            }

            if (mode === "full" || mode === "re-extract") {
                progressStatus =
                    "Analyzing question paper structure and extracting text...";
                const qFormData = new FormData();
                cachedQImages.forEach((img) =>
                    qFormData.append("images", img.blob, "page.jpg"),
                );

                const qRes = await fetch("/api/extract", {
                    method: "POST",
                    body: qFormData,
                });
                if (!qRes.ok)
                    throw new Error(
                        (await qRes.json()).error || "Extraction failed.",
                    );

                const qData = await qRes.json();
                examMeta = qData.metadata;
                questions = qData.questions;
            }

            progressStatus =
                "AI is evaluating student answers against the paper...";
            const aFormData = new FormData();
            aFormData.append("metadata", JSON.stringify(examMeta));
            aFormData.append("questions", JSON.stringify(questions));
            cachedAImages.forEach((img) =>
                aFormData.append("images", img.blob, "answer.jpg"),
            );

            const aRes = await fetch("/api/evaluate", {
                method: "POST",
                body: aFormData,
            });
            if (!aRes.ok)
                throw new Error(
                    (await aRes.json()).error || "Evaluation failed.",
                );

            evaluations = (await aRes.json()).evaluations;

            progressStatus = "Finalizing assessment reports...";
            setTimeout(() => {
                currentScreen = 3;
                progressStatus = null;
            }, 800);
        } catch (error: unknown) {
            console.error(error);
            errorMessage =
                error instanceof Error ? error.message : "Processing failed.";
            currentScreen = mode === "full" ? 1 : 3;
            progressStatus = null;
        }
    }

    function resetToScreen1() {
        questionFile = null;
        answerFile = null;
        cachedQImages = [];
        cachedAImages = [];
        answerImages = [];
        examMeta = null;
        questions = [];
        evaluations = [];
        activeQuestionId = null;
        errorMessage = null;
        currentScreen = 1;
    }
</script>

<div class="flex flex-col gap-4 p-4 h-screen font-sans">
    {#if errorMessage}
        <div class="p-4 border bg-[#fee2e2] text-[#991b1b]">{errorMessage}</div>
    {/if}

    {#if currentScreen === 1}
        <div class="flex flex-col items-center justify-center flex-1">
            <div
                class="flex flex-col gap-6 border p-8 shadow-sm bg-white rounded max-w-md w-full"
            >
                <h1 class="text-xl font-bold text-center">
                    AI Assessment Mapper
                </h1>

                <label
                    class="flex flex-col border p-3 cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                    <strong>1. Upload Question Paper</strong>
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        onchange={(e) => handleFileUpload(e, "question")}
                        class="mt-2"
                    />
                </label>

                <label
                    class="flex flex-col border p-3 cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                    <strong>2. Upload Answer Sheet</strong>
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        onchange={(e) => handleFileUpload(e, "answer")}
                        class="mt-2"
                    />
                </label>

                <button
                    disabled={!questionFile || !answerFile}
                    onclick={() => runPipeline("full")}
                    class="p-3 mt-2 border bg-black text-white font-bold cursor-pointer disabled:opacity-50"
                >
                    Start Mapping
                </button>
            </div>
        </div>
    {:else if currentScreen === 2}
        <div class="flex flex-col items-center justify-center flex-1">
            <div
                class="flex flex-col items-center gap-4 border p-12 shadow-sm bg-white rounded"
            >
                <div
                    class="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"
                ></div>
                <h2 class="text-xl font-bold">Processing</h2>
                <p class="text-gray-600">{progressStatus}</p>
            </div>
        </div>
    {:else if currentScreen === 3}
        <div
            class="flex items-center justify-between gap-4 border p-3 bg-gray-50 shadow-sm"
        >
            <div class="font-bold text-gray-800 px-2">Assessment Complete</div>
            <div class="flex gap-2">
                <button
                    onclick={resetToScreen1}
                    class="px-4 py-2 border bg-white hover:bg-gray-100 cursor-pointer text-sm font-semibold"
                >
                    Go Back to Upload
                </button>
                <button
                    onclick={() => runPipeline("re-extract")}
                    class="px-4 py-2 border bg-blue-50 text-blue-800 hover:bg-blue-100 cursor-pointer text-sm font-semibold"
                >
                    Re-Extract Question & Evaluate
                </button>
                <button
                    onclick={() => runPipeline("re-evaluate")}
                    class="px-4 py-2 border bg-black text-white hover:bg-gray-800 cursor-pointer text-sm font-semibold"
                >
                    Re-Evaluate Answer Only
                </button>
            </div>
        </div>

        {#if questions.length > 0}
            <div class="flex flex-1 gap-4 overflow-hidden min-h-0">
                <div
                    class="flex flex-col gap-2 w-1/3 overflow-y-auto border p-2"
                >
                    {#if examMeta}
                        <div
                            class="bg-gray-100 p-2 flex flex-col gap-1 border-b mb-2"
                        >
                            <div
                                class="text-sm text-gray-700 font-bold text-center"
                            >
                                {examMeta.grade_level || "Unknown Class"} - {examMeta.subject ||
                                    "Unknown Subject"}
                            </div>
                            {#if evaluations.length > 0}
                                <div
                                    class="text-lg text-black font-extrabold text-center bg-green-200 py-1 rounded"
                                >
                                    Total Score: {totalScore} / {totalMaxMarks}
                                </div>
                            {/if}
                        </div>
                    {/if}

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
                                            style="color: {ev.score_awarded ===
                                            q.marks
                                                ? 'green'
                                                : 'orange'}; font-weight: bold;"
                                            >{ev.score_string}</span
                                        >
                                    {/if}
                                {/if}
                            </div>
                            <p>{q.text}</p>
                            {#if q.options && q.options.length > 0}
                                <div
                                    class="text-xs text-gray-500 pl-2 border-l-2"
                                >
                                    {#each q.options as opt (opt)}
                                        <div>{opt}</div>
                                    {/each}
                                </div>
                            {/if}
                            <span class="text-xs text-gray-500"
                                >Max Marks: {q.marks || "?"}</span
                            >
                            {#if activeQuestionId === q.id && ev?.feedback}
                                <div
                                    class="p-2 border"
                                    style="background-color: #fff7ed; border-color: #fdba74; font-size: 14px;"
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
                                {#if (ev.page_index ?? 0) === index && ev.bounding_box && ev.bounding_box.length === 4 && ev.status !== "unanswered"}
                                    <div
                                        class="absolute border-2"
                                        style="
                                            border-color: {activeQuestionId ===
                                        ev.question_id
                                            ? '#22c55e'
                                            : 'rgba(96, 165, 250, 0.5)'};
                                            background-color: {activeQuestionId ===
                                        ev.question_id
                                            ? 'rgba(34, 197, 94, 0.2)'
                                            : 'rgba(96, 165, 250, 0.1)'};
                                            z-index: {activeQuestionId ===
                                        ev.question_id
                                            ? 20
                                            : 10};
                                            top: {ev.bounding_box[0] / 10}%; 
                                            left: {ev.bounding_box[1] / 10}%; 
                                            width: {(ev.bounding_box[3] -
                                            ev.bounding_box[1]) /
                                            10}%; 
                                            height: {(ev.bounding_box[2] -
                                            ev.bounding_box[0]) /
                                            10}%;
                                        "
                                    >
                                        {#if activeQuestionId === ev.question_id}
                                            <span
                                                class="absolute shadow"
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
    {/if}
</div>
