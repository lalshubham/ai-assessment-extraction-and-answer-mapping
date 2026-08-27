<script lang="ts">
    import { type ImageData, processFileToImages } from "$lib/utils/file";
    import UploadScreen from "$lib/components/UploadScreen.svelte";
    import LoadingScreen from "$lib/components/LoadingScreen.svelte";
    import QuestionPanel from "$lib/components/QuestionPanel.svelte";
    import AnswerPanel from "$lib/components/AnswerPanel.svelte";

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

    type MetaData = {
        grade_level?: string;
        subject?: string;
    };

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
        <UploadScreen
            {questionFile}
            {answerFile}
            onFileUpload={handleFileUpload}
            onStart={() => runPipeline("full")}
        />
    {:else if currentScreen === 2}
        <LoadingScreen {progressStatus} />
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
                <QuestionPanel
                    {examMeta}
                    {questions}
                    {evaluations}
                    bind:activeQuestionId
                    {totalScore}
                    {totalMaxMarks}
                />
                <AnswerPanel {answerImages} {evaluations} {activeQuestionId} />
            </div>
        {/if}
    {/if}
</div>
