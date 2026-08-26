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
    type FileCache = { name: string; size: number; lastModified: number };

    let questionFile = $state<File | null>(null);
    let answerFile = $state<File | null>(null);

    let isProcessing = $state(false);
    let progressStatus = $state<string | null>(null);
    let errorMessage = $state<string | null>(null);

    let examMeta = $state<MetaData | null>(null);
    let questions = $state<Question[]>([]);
    let evaluations = $state<Evaluation[]>([]);
    let answerImages = $state<string[]>([]);
    let activeQuestionId = $state<string | null>(null);

    let cachedQuestionFile = $state<FileCache | null>(null);
    let cachedQuestionImages = $state<ImageData[]>([]);

    let totalMaxMarks = $derived(
        questions.reduce((sum, q) => sum + (q.marks || 0), 0),
    );
    let totalScore = $derived(
        evaluations.reduce((sum, ev) => sum + (ev.score_awarded || 0), 0),
    );

    function isSameFile(file: File, cache: FileCache | null) {
        if (!cache) return false;
        return (
            file.name === cache.name &&
            file.size === cache.size &&
            file.lastModified === cache.lastModified
        );
    }

    async function startMapping() {
        if (!questionFile || !answerFile) return;

        isProcessing = true;
        errorMessage = null;
        evaluations = [];
        activeQuestionId = null;

        try {
            progressStatus = "Preparing files (Parallel)...";
            const [qImages, aImages] = await Promise.all([
                isSameFile(questionFile, cachedQuestionFile) &&
                questions.length > 0
                    ? Promise.resolve(cachedQuestionImages)
                    : processFileToImages(questionFile),
                processFileToImages(answerFile),
            ]);

            answerImages = aImages.map((img) => img.dataUrl);

            if (
                !isSameFile(questionFile, cachedQuestionFile) ||
                questions.length === 0
            ) {
                progressStatus = "Extracting questions & metadata...";
                const qFormData = new FormData();
                qImages.forEach((img) =>
                    qFormData.append("images", img.blob, "page.jpg"),
                );

                const qRes = await fetch("/api/extract", {
                    method: "POST",
                    body: qFormData,
                });
                if (!qRes.ok)
                    throw new Error(
                        (await qRes.json()).error || "Extraction failed",
                    );

                const qData = await qRes.json();
                examMeta = qData.metadata;
                questions = qData.questions;

                cachedQuestionFile = {
                    name: questionFile.name,
                    size: questionFile.size,
                    lastModified: questionFile.lastModified,
                };
                cachedQuestionImages = qImages;
            }

            progressStatus = "Evaluating student answers...";
            const aFormData = new FormData();
            aFormData.append("metadata", JSON.stringify(examMeta));
            aFormData.append("questions", JSON.stringify(questions));
            aImages.forEach((img) =>
                aFormData.append("images", img.blob, "answer.jpg"),
            );

            const aRes = await fetch("/api/evaluate", {
                method: "POST",
                body: aFormData,
            });
            if (!aRes.ok)
                throw new Error(
                    (await aRes.json()).error || "Evaluation failed",
                );

            evaluations = (await aRes.json()).evaluations;

            progressStatus = "Complete!";
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
                                    >
                                        Not Attempted
                                    </span>
                                {:else}
                                    <span
                                        style="color: {ev.score_awarded ===
                                        q.marks
                                            ? 'green'
                                            : 'orange'}; font-weight: bold;"
                                    >
                                        {ev.score_string}
                                    </span>
                                {/if}
                            {/if}
                        </div>
                        <p>{q.text}</p>
                        {#if q.options && q.options.length > 0}
                            <div class="text-xs text-gray-500 pl-2 border-l-2">
                                {#each q.options as opt (opt)}
                                    <div>{opt}</div>
                                {/each}
                            </div>
                        {/if}
                        <span class="text-xs text-gray-500">
                            Max Marks: {q.marks || "?"}
                        </span>
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
                            {#if ev.page_index === index && ev.bounding_box && ev.status !== "unanswered"}
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
