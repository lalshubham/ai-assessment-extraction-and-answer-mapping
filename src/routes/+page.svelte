<script lang="ts">
    import type {
        ScreenStage,
        LoadingStage,
        Question,
        Answer,
    } from "$lib/types";
    import { processFileToImages } from "$lib/utils/file";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import Navbar from "$lib/components/Navbar.svelte";
    import UploadScreen from "$lib/components/UploadScreen.svelte";
    import LoadingScreen from "$lib/components/LoadingScreen.svelte";
    import ResultScreen from "$lib/components/ResultScreen.svelte";

    let isMobileSidebarOpen = $state(false);
    let isSidebarCollapsed = $state(false);

    let currentScreen = $state<ScreenStage>("upload");
    let loadingStage = $state<LoadingStage>("processing");
    let errorMessage = $state<string | null>(null);

    let questionFiles = $state<File[]>([]);
    let answerFiles = $state<File[]>([]);

    let answerImages = $state<string[]>([]);

    let questionData = $state<Question | null>(null);
    let answerData = $state<Answer | null>(null);

    async function runPipeline() {
        isSidebarCollapsed = true;
        currentScreen = "loading";
        errorMessage = null;

        questionData = null;
        answerData = null;
        answerImages = [];

        try {
            loadingStage = "processing";
            const qImageArrays = await Promise.all(
                questionFiles.map(processFileToImages),
            );
            const aImageArrays = await Promise.all(
                answerFiles.map(processFileToImages),
            );

            const processedQImages = qImageArrays.flat();
            const processedAImages = aImageArrays.flat();

            answerImages = processedAImages.map((img) => img.dataUrl);

            loadingStage = "extracting";
            const qFormData = new FormData();
            processedQImages.forEach((img, index) =>
                qFormData.append("images", img.blob, `q_page_${index}.jpg`),
            );

            const qRes = await fetch("/api/question", {
                method: "POST",
                body: qFormData,
            });

            if (!qRes.ok)
                throw new Error(
                    (await qRes.json()).error || "Extraction failed.",
                );
            questionData = await qRes.json();

            loadingStage = "evaluating";
            const aFormData = new FormData();
            aFormData.append("question", JSON.stringify(questionData));
            processedAImages.forEach((img, index) =>
                aFormData.append("images", img.blob, `a_page_${index}.jpg`),
            );

            const aRes = await fetch("/api/answer", {
                method: "POST",
                body: aFormData,
            });

            if (!aRes.ok)
                throw new Error(
                    (await aRes.json()).error || "Evaluation failed.",
                );
            answerData = await aRes.json();

            currentScreen = "results";
        } catch (error: unknown) {
            console.error(error);
            errorMessage =
                error instanceof Error ? error.message : "Processing failed.";

            questionData = null;
            answerData = null;
            answerImages = [];

            currentScreen = "upload";
            isSidebarCollapsed = false;
        }
    }

    function resetToUpload() {
        if (currentScreen === "upload") return;
        questionFiles = [];
        answerFiles = [];
        answerImages = [];
        questionData = null;
        answerData = null;
        errorMessage = null;
        currentScreen = "upload";
        isSidebarCollapsed = false;
    }
</script>

<div class="w-full h-[100svh] p-3 lg:p-4 flex gap-4 overflow-hidden">
    <Sidebar bind:isMobileSidebarOpen bind:isSidebarCollapsed />

    <div class="min-h-0 min-w-0 flex-1 flex flex-col gap-4">
        <Navbar bind:currentScreen bind:isMobileSidebarOpen {resetToUpload} />

        <main
            class="flex-1 flex flex-col min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden {currentScreen ===
            'results'
                ? 'overflow-hidden'
                : 'overflow-y-auto'}"
        >
            {#if currentScreen === "upload"}
                <UploadScreen
                    bind:questionFiles
                    bind:answerFiles
                    bind:errorMessage
                    onStart={runPipeline}
                />
            {:else if currentScreen === "loading"}
                <LoadingScreen stage={loadingStage} />
            {:else if currentScreen === "results"}
                <ResultScreen {questionData} {answerData} {answerImages} />
            {/if}
        </main>
    </div>
</div>
