<script lang="ts">
    import type { LoadingStage } from "$lib/types";

    let { stage }: { stage: LoadingStage } = $props();
    let currentIndex = $state(0);

    const loadingMessages: Record<LoadingStage, string[]> = {
        uploading: [
            "Preparing uploaded documents",
            "Converting pages into secure image streams",
        ],
        extracting: [
            "Reading the question paper layout",
            "Identifying class, subject, and total marks",
            "Extracting questions and sub-parts",
            "Calculating marks and section rules",
            "Finalizing question paper structure",
        ],
        evaluating: [
            "Loading student answer sheets",
            "Reading handwritten responses",
            "Matching answers to question numbers",
            "Grading answers against the marking scheme",
            "Calculating final scores and feedback",
        ],
    };

    $effect(() => {
        const activeStage = stage;
        const messages = loadingMessages[activeStage];
        currentIndex = 0;

        const interval = setInterval(() => {
            if (currentIndex < messages.length - 1) {
                currentIndex++;
            }
        }, 2500);

        return () => clearInterval(interval);
    });
</script>

<p class="m-auto text-center">
    <span class="capitalize">{stage}</span>
    <br />
    <span class="animate-pulse">{loadingMessages[stage][currentIndex]}</span>
</p>
