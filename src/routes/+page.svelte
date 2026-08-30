<script lang="ts">
    import type { LoadingStage, ImageData, Exam, Assessment } from "$lib/types";
    import { processFileToImages } from "$lib/utils/file";
    import UploadScreen from "$lib/components/UploadScreen.svelte";
    import LoadingScreen from "$lib/components/LoadingScreen.svelte";
    import QuestionPanel from "$lib/components/QuestionPanel.svelte";
    import AnswerPanel from "$lib/components/AnswerPanel.svelte";

    let isMobileSidebarOpen = $state(false);
    let isSidebarCollapsed = $state(false);

    let currentScreen = $state<"upload" | "loading" | "results">("upload");
    let loadingStage = $state<LoadingStage>("uploading");
    let errorMessage = $state<string | null>(null);

    let questionFiles = $state<File[]>([]);
    let answerFiles = $state<File[]>([]);

    let cachedQImages = $state<ImageData[]>([]);
    let cachedAImages = $state<ImageData[]>([]);
    let answerImages = $state<string[]>([]);

    let exam = $state<Exam | null>(null);
    let assessment = $state<Assessment | null>(null);

    let activeQuestionId = $state<string | null>(null);
    let activeTab = $state<"questions" | "answers">("questions");

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

                const qImageArrays = await Promise.all(
                    questionFiles.map(processFileToImages),
                );
                const aImageArrays = await Promise.all(
                    answerFiles.map(processFileToImages),
                );

                cachedQImages = qImageArrays.flat();
                cachedAImages = aImageArrays.flat();
                answerImages = cachedAImages.map((img) => img.dataUrl);
            }

            if (mode === "full" || mode === "re-extract") {
                loadingStage = "extracting";
                const qFormData = new FormData();
                cachedQImages.forEach((img, index) =>
                    qFormData.append("images", img.blob, `q_page_${index}.jpg`),
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
            cachedAImages.forEach((img, index) =>
                aFormData.append("images", img.blob, `a_page_${index}.jpg`),
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
        questionFiles = [];
        answerFiles = [];
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

<div class="w-full h-[100svh] p-3 lg:p-4 flex gap-4 overflow-auto">
    {#if errorMessage}
        <div class="p-4 border bg-[#fee2e2] text-[#991b1b]">
            {errorMessage}
        </div>
    {/if}

    <button
        onclick={() => (isMobileSidebarOpen = false)}
        tabindex={isSidebarCollapsed ? 0 : -1}
        aria-label="Background blur"
        class="fixed lg:hidden inset-0 z-40 bg-black/40 backdrop-blur-xs border-none transition-opacity duration-500 {isMobileSidebarOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'}"
    ></button>

    <aside
        class="fixed lg:relative inset-y-3 left-3 z-50 lg:inset-auto shrink-0 w-64 lg:h-full bg-white shadow-xl rounded-2xl transition-[transform, width] duration-500 {isMobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-[120%] lg:translate-x-0 '} {isSidebarCollapsed
            ? 'lg:w-16'
            : 'lg:w-64'}"
    >
        <button
            onclick={() => {
                if (window.innerWidth < 1024) isMobileSidebarOpen = false;
                else isSidebarCollapsed = !isSidebarCollapsed;
            }}
        >
            <span class="lg:hidden">Close</span>
            <span class="hidden lg:inline">
                {isSidebarCollapsed ? "Expand" : "Close"}
            </span>
        </button>
    </aside>

    <div class="min-w-0 h-full flex-1 flex flex-col gap-4">
        <header
            class="shrink-0 h-16 bg-white rounded-2xl shadow lg:shadow-none"
        >
            <button
                onclick={() => (isMobileSidebarOpen = !isMobileSidebarOpen)}
                class="lg:hidden"
            >
                Open
            </button>
        </header>

        <main class="flex-1 grid place-items-center">
            {#if currentScreen === "upload"}
                <UploadScreen
                    bind:questionFiles
                    bind:answerFiles
                    onStart={() => runPipeline("full")}
                />
            {:else if currentScreen === "loading"}
                <LoadingScreen stage={loadingStage} />
            {:else if currentScreen === "results"}
                <div
                    class="flex flex-col md:flex-row items-center justify-between gap-4 border p-3 bg-white"
                >
                    <div
                        class="text-gray-800 px-2 w-full md:w-auto text-center"
                    >
                        Assessment Complete
                    </div>
                    <div
                        class="flex flex-wrap justify-center gap-2 w-full md:w-auto"
                    >
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
                            class="flex-1 py-2 text-sm {activeTab ===
                            'questions'
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
                            class="h-full overflow-hidden {activeTab ===
                            'questions'
                                ? 'block'
                                : 'hidden'} md:block"
                        >
                            <QuestionPanel
                                {exam}
                                {assessment}
                                bind:activeQuestionId
                            />
                        </div>
                        <div
                            class="h-full overflow-hidden {activeTab ===
                            'answers'
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
        </main>
    </div>
</div>
