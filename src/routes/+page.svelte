<script lang="ts">
    import type {
        ScreenStage,
        LoadingStage,
        ImageData,
        Exam,
        Assessment,
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
    let loadingStage = $state<LoadingStage>("uploading");
    let errorMessage = $state<string | null>(null);

    let questionFiles = $state<File[]>([]);
    let answerFiles = $state<File[]>([]);

    let cachedQImages = $state<ImageData[]>([]);
    let cachedAImages = $state<ImageData[]>([]);
    let answerImages = $state<string[]>([]);

    let exam = $state<Exam | null>(null);
    let assessment = $state<Assessment | null>(null);

    async function runPipeline(mode: "full" | "re-extract" | "re-evaluate") {
        isSidebarCollapsed = true;
        currentScreen = "loading";
        errorMessage = null;

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
        if (currentScreen === "upload") return;
        questionFiles = [];
        answerFiles = [];
        cachedQImages = [];
        cachedAImages = [];
        answerImages = [];
        exam = null;
        assessment = null;
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
                    onStart={() => runPipeline("full")}
                />
            {:else if currentScreen === "loading"}
                <LoadingScreen stage={loadingStage} />
            {:else if currentScreen === "results"}
                <ResultScreen {exam} {assessment} {answerImages} />
            {/if}
        </main>
    </div>
</div>
