<script lang="ts">
    import { tick } from "svelte";
    import type { Assessment } from "$lib/types";

    interface Props {
        answerImages: string[];
        assessment: Assessment | null;
        activeQuestionId: string | null;
        activeTab?: "questions" | "answers";
    }

    let { 
        answerImages, 
        assessment, 
        activeQuestionId, 
        activeTab 
    }: Props = $props();

    let scrollContainer = $state<HTMLElement | null>(null);
    let zoomLevel = $state(100);
    let currentPage = $state(1);
    let totalPages = $derived(answerImages.length);

    $effect(() => {
        const id = activeQuestionId;
        const tab = activeTab;

        if (!id) return;

        tick().then(() => {
            const element = document.getElementById(`box-${id}`);
            if (element && element.offsetParent !== null) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    });

    function changeZoom(delta: number) {
        zoomLevel = Math.max(25, Math.min(300, zoomLevel + delta));
    }

    function changePage(delta: number) {
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            document
                .getElementById(`page-${newPage}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function handleScroll() {
        if (!scrollContainer) return;
        const containerRect = scrollContainer.getBoundingClientRect();
        const viewCenter = containerRect.top + containerRect.height / 2;

        let closest = 1,
            minDiff = Infinity;

        scrollContainer
            .querySelectorAll<HTMLElement>(".answer-page")
            .forEach((page) => {
                const rect = page.getBoundingClientRect();
                const pageCenter = rect.top + rect.height / 2;
                const diff = Math.abs(pageCenter - viewCenter);

                if (diff < minDiff) {
                    minDiff = diff;
                    closest = parseInt(page.dataset.page || "1");
                }
            });

        if (currentPage !== closest) currentPage = closest;
    }
</script>

<div
    class="h-full relative flex flex-col bg-[#f0f0f0] rounded-2xl overflow-hidden"
>
    <div
        class="p-3 flex items-center justify-between gap-4 bg-[#303030] text-white border border-gray-600/50 text-sm"
    >
        <div class="p-0.5 flex items-center bg-[#444444] rounded-lg">
            <button
                onclick={() => changeZoom(-25)}
                disabled={zoomLevel === 25}
                class="px-2 text-2xl disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
            >
                &minus;
            </button>
            <span class="w-10 font-medium text-center">{zoomLevel}%</span>
            <button
                onclick={() => changeZoom(25)}
                disabled={zoomLevel === 300}
                class="px-2 text-2xl disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
            >
                &plus;
            </button>
        </div>
        <div class="p-0.5 flex items-center bg-[#444444] rounded-lg">
            <button
                onclick={() => changePage(-1)}
                disabled={currentPage === 1}
                class="px-2 text-2xl disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
            >
                &lt;
            </button>
            <span class="w-20 font-medium text-center"
                >Page {currentPage} of {totalPages}</span
            >
            <button
                onclick={() => changePage(1)}
                disabled={currentPage === totalPages}
                class="px-2 text-2xl disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
            >
                &gt;
            </button>
        </div>
    </div>

    <div
        bind:this={scrollContainer}
        onscroll={handleScroll}
        class="flex-1 overflow-auto"
    >
        <div
            class="flex flex-col gap-6 mx-auto transition-all duration-200 ease-out origin-top"
            style="width: {zoomLevel}%;"
        >
            {#each answerImages as imgUrl, index (index)}
                <div
                    id="page-{index + 1}"
                    data-page={index + 1}
                    class="answer-page relative w-full bg-white mx-auto border border-gray-200"
                >
                    <img
                        src={imgUrl}
                        alt="Page {index + 1}"
                        class="w-full block"
                    />

                    {#if assessment?.evaluations}
                        {#each assessment.evaluations as ev (ev.question_id)}
                            {#if (ev.page_index ?? 0) === index && ev.bounding_box && ev.bounding_box.length === 4 && ev.status !== "unanswered"}
                                {@const [awarded, max] = (
                                    ev.score_string || "0 / 1"
                                )
                                    .split("/")
                                    .map(Number)}

                                <div
                                    id="box-{ev.question_id}"
                                    class="absolute border-2 transition-colors duration-200 rounded-lg {activeQuestionId ===
                                    ev.question_id
                                        ? awarded === 0
                                            ? 'border-red-500 bg-red-500/20'
                                            : awarded < max
                                              ? 'border-orange-500 bg-orange-500/20'
                                              : 'border-green-500 bg-green-500/20'
                                        : 'border-blue-400/50 bg-blue-400/10 hover:bg-blue-400/20'}"
                                    style="top: {ev.bounding_box[0] /
                                        10}%; left: {ev.bounding_box[1] /
                                        10}%; width: {(ev.bounding_box[3] -
                                        ev.bounding_box[1]) /
                                        10}%; height: {(ev.bounding_box[2] -
                                        ev.bounding_box[0]) /
                                        10}%;"
                                >
                                    {#if activeQuestionId === ev.question_id}
                                        <span
                                            class="absolute -top-[22px] left-1 text-white px-2 py-0.5 text-xs rounded-t-lg {awarded ===
                                            0
                                                ? 'bg-red-500'
                                                : awarded < max
                                                  ? 'bg-orange-500'
                                                  : 'bg-green-500'}"
                                        >
                                            Q{ev.question_id}
                                        </span>
                                    {/if}
                                </div>
                            {/if}
                        {/each}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
