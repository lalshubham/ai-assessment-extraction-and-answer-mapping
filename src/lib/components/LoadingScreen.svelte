<script lang="ts">
    import type { LoadingStage } from "$lib/types";

    let { stage }: { stage: LoadingStage } = $props();
    let currentIndex = $state(0);

    const loadingMessages: Record<LoadingStage, string[]> = {
        processing: [
            "Preparing uploaded file",
            "Converting files into image",
        ],
        extracting: [
            "Reading the question paper layout",
            "Identifying class, subject, total marks",
            "Extracting questions, sub-parts",
            "Calculating marks, section rules",
            "Finalizing question paper structure",
        ],
        evaluating: [
            "Loading student answer sheets",
            "Reading handwritten responses",
            "Matching answers to question numbers",
            "Grading answers from the marking scheme",
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
        }, 3000);

        return () => clearInterval(interval);
    });
</script>

<div class="w-full h-full flex flex-col items-center justify-center bg-white rounded-3xl">
    <div class="sparkle">
        <div class="dot"></div>
        <div class="star star-large">
            <svg viewBox="0 0 100 100">
                <defs>
                    <linearGradient
                        id="orangeGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                    >
                        <stop offset="0%" stop-color="#ff9b71" />
                        <stop offset="50%" stop-color="#ff512f" />
                        <stop offset="100%" stop-color="#ea441c" />
                    </linearGradient>
                </defs>
                <path
                    d="M 50,0 C 50,38 62,50 100,50 C 62,50 50,62 50,100 C 50,62 38,50 0,50 C 38,50 50,38 50,0 Z"
                    fill="url(#orangeGrad)"
                />
            </svg>
        </div>
        <div class="star star-medium">
            <svg viewBox="0 0 100 100">
                <path
                    d="M 50,0 C 50,38 62,50 100,50 C 62,50 50,62 50,100 C 50,62 38,50 0,50 C 38,50 50,38 50,0 Z"
                    fill="url(#orangeGrad)"
                />
            </svg>
        </div>
        <div class="star star-small">
            <svg viewBox="0 0 100 100">
                <path
                    d="M 50,0 C 50,38 62,50 100,50 C 62,50 50,62 50,100 C 50,62 38,50 0,50 C 38,50 50,38 50,0 Z"
                    fill="url(#orangeGrad)"
                />
            </svg>
        </div>
    </div>

    <span class="mt-2 shimmer">{stage}...</span>
    <span class="text-[#757575] text-center">{loadingMessages[stage][currentIndex]}</span>
</div>
