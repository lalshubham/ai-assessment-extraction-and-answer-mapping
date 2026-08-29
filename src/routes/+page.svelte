<script lang="ts">
    import type { LoadingStage, ImageData, Exam, Assessment } from "$lib/types";
    import processFileToImages from "$lib/utils/file";
    import UploadScreen from "$lib/components/UploadScreen.svelte";
    import LoadingScreen from "$lib/components/LoadingScreen.svelte";
    import QuestionPanel from "$lib/components/QuestionPanel.svelte";
    import AnswerPanel from "$lib/components/AnswerPanel.svelte";

    let currentScreen = $state<"upload" | "loading" | "results">("upload");
    let loadingStage = $state<LoadingStage>("uploading");
    let errorMessage = $state<string | null>(null);

    let questionFile = $state<File | null>(null);
    let answerFile = $state<File | null>(null);

    let cachedQImages = $state<ImageData[]>([]);
    let cachedAImages = $state<ImageData[]>([]);
    let answerImages = $state<string[]>([]);

    let exam = $state<Exam | null>(null);
    let assessment = $state<Assessment | null>(null);

    let activeQuestionId = $state<string | null>(null);
    let activeTab = $state<"questions" | "answers">("questions");

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
        currentScreen = "loading";
        errorMessage = null;
        activeQuestionId = null;

        if (mode !== "re-evaluate") {
            exam = null;
            assessment = null;
        }

        try {
            if (mode === "full" || cachedAImages.length === 0) {
                loadingStage = "uploading";
                const [qImages, aImages] = await Promise.all([
                    processFileToImages(questionFile!),
                    processFileToImages(answerFile!),
                ]);
                cachedQImages = qImages;
                cachedAImages = aImages;
                answerImages = aImages.map((img) => img.dataUrl);
            }

            if (mode === "full" || mode === "re-extract") {
                loadingStage = "extracting";
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
                exam = await qRes.json();
            }

            loadingStage = "evaluating";
            const aFormData = new FormData();
            aFormData.append("exam", JSON.stringify(exam));
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
            assessment = await aRes.json();

            currentScreen = "results";
        } catch (error: unknown) {
            console.error(error);
            errorMessage =
                error instanceof Error ? error.message : "Processing failed.";
            currentScreen = mode === "full" ? "upload" : "results";
        }
    }

    function resetToUpload() {
        questionFile = null;
        answerFile = null;
        cachedQImages = [];
        cachedAImages = [];
        answerImages = [];
        exam = null;
        assessment = null;
        activeQuestionId = null;
        errorMessage = null;
        currentScreen = "upload";
    }
</script>

<div class="flex flex-col gap-4 p-4 h-screen bg-gray-50">
    {#if errorMessage}
        <div class="p-4 border bg-[#fee2e2] text-[#991b1b]">
            {errorMessage}
        </div>
    {/if}

    {#if currentScreen === "upload"}
        <UploadScreen
            {questionFile}
            {answerFile}
            onFileUpload={handleFileUpload}
            onStart={() => runPipeline("full")}
        />
    {:else if currentScreen === "loading"}
        <LoadingScreen stage={loadingStage} />
    {:else if currentScreen === "results"}
        <div
            class="flex flex-col md:flex-row items-center justify-between gap-4 border p-3 bg-white"
        >
            <div class="text-gray-800 px-2 w-full md:w-auto text-center">
                Assessment Complete
            </div>
            <div class="flex flex-wrap justify-center gap-2 w-full md:w-auto">
                <button
                    onclick={resetToUpload}
                    class="px-4 py-2 border bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm"
                >
                    Upload New
                </button>
                <button
                    onclick={() => runPipeline("re-extract")}
                    class="px-4 py-2 border bg-blue-50 text-blue-800 hover:bg-blue-100 cursor-pointer text-sm"
                >
                    Re-Extract
                </button>
                <button
                    onclick={() => runPipeline("re-evaluate")}
                    class="px-4 py-2 border bg-black text-white hover:bg-gray-800 cursor-pointer text-sm"
                >
                    Re-Evaluate
                </button>
            </div>
        </div>

        {#if exam?.questions?.length}
            <div class="flex md:hidden w-full p-1 border">
                <button
                    onclick={() => (activeTab = "questions")}
                    class="flex-1 py-2 text-sm {activeTab === 'questions'
                        ? 'bg-black text-white'
                        : ''}"
                >
                    Questions
                </button>
                <button
                    onclick={() => (activeTab = "answers")}
                    class="flex-1 py-2 text-sm {activeTab === 'answers'
                        ? 'bg-black text-white'
                        : ''}"
                >
                    Answer Sheets
                </button>
            </div>

            <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0"
            >
                <div
                    class="h-full overflow-hidden {activeTab === 'questions'
                        ? 'block'
                        : 'hidden'} md:block"
                >
                    <QuestionPanel {exam} {assessment} bind:activeQuestionId />
                </div>
                <div
                    class="h-full overflow-hidden {activeTab === 'answers'
                        ? 'block'
                        : 'hidden'} md:block"
                >
                    <AnswerPanel
                        {answerImages}
                        {assessment}
                        {activeQuestionId}
                    />
                </div>
            </div>
        {/if}
    {/if}
</div>
